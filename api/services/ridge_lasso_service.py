import json
import math
from collections import defaultdict
from typing import Any

import numpy as np

from api.services.latent_trait_mapping_provider import LatentTraitMapping

SUPPORTED_QUESTION_TYPES = {"checkboxes", "likert_scale", "multiple_choice"}
PREDICTIVE_PENDING = {"status": "pending", "traits": []}
SUPABASE_IN_FILTER_CHUNK_SIZE = 50
SUPABASE_PAGE_SIZE = 1000


def _supabase():
    from api.dependencies import supabase

    return supabase


def _parse_json_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        if not value:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def _flatten_choices(value: Any) -> list[str]:
    parsed = _parse_json_value(value)
    if parsed is None:
        return []
    if isinstance(parsed, dict) and isinstance(parsed.get("choices"), list):
        return [str(choice) for choice in parsed["choices"]]
    if isinstance(parsed, list):
        return [str(choice) for choice in parsed]
    return [str(parsed)]


def _answer_options(value: Any) -> list[str]:
    parsed = _parse_json_value(value)
    if parsed is None:
        return []
    if isinstance(parsed, list):
        return [str(choice) for choice in parsed]
    return [str(parsed)]


def _make_checkbox_item_id(question_id: str, option_index: int) -> str:
    return f"{question_id}__option_{option_index}"


def _safe_float(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def _unavailable_trait(trait_id: str, message: str) -> dict[str, Any]:
    return {
        "traitId": trait_id,
        "status": "unavailable",
        "message": message,
        "models": {
            "ridge": {
                "modelType": "ridge",
                "rankedQuestions": [],
                "quality": None,
            },
            "lasso": {
                "modelType": "lasso",
                "rankedQuestions": [],
                "quality": None,
            },
        },
    }


def _select_all(
    client: Any, table: str, columns: str, filters: list[tuple[str, str, Any]]
) -> list[dict[str, Any]]:
    query = client.table(table).select(columns)
    for method, column, value in filters:
        query = getattr(query, method)(column, value)
    response = query.execute()
    return response.data or []


def _select_all_paginated(
    client: Any,
    table: str,
    columns: str,
    filters: list[tuple[str, str, Any]],
    page_size: int | None = None,
) -> list[dict[str, Any]]:
    page_size = page_size or SUPABASE_PAGE_SIZE
    rows: list[dict[str, Any]] = []
    start = 0

    while True:
        query = client.table(table).select(columns)
        for method, column, value in filters:
            query = getattr(query, method)(column, value)

        page = query.range(start, start + page_size - 1).execute().data or []
        rows.extend(page)

        if len(page) < page_size:
            return rows

        start += page_size


def _chunks(values: list[str], chunk_size: int | None = None):
    chunk_size = chunk_size or SUPABASE_IN_FILTER_CHUNK_SIZE
    for start in range(0, len(values), chunk_size):
        yield values[start : start + chunk_size]


def _load_answers_in_chunks(
    client: Any,
    respondent_ids: list[str],
    question_ids: list[str],
) -> list[dict[str, Any]]:
    answers: list[dict[str, Any]] = []
    for respondent_chunk in _chunks(respondent_ids):
        answers.extend(
            _select_all_paginated(
                client,
                "answers",
                "session_id,question_id,answer_text,answer_numeric,answer_options",
                [
                    ("in_", "session_id", respondent_chunk),
                    ("in_", "question_id", question_ids),
                ],
            )
        )

    return answers


def _load_response_context(
    survey_id: str,
    question_ids: list[str],
    respondent_ids: list[str],
    client: Any | None = None,
) -> tuple[dict[str, dict[str, Any]], list[dict[str, Any]]]:
    if not question_ids or not respondent_ids:
        return {}, []

    client = client or _supabase()
    questions = _select_all(
        client,
        "questions",
        "id,question_text,type,options",
        [
            ("eq", "survey_id", survey_id),
            ("in_", "id", question_ids),
        ],
    )
    answers = _load_answers_in_chunks(client, respondent_ids, question_ids)
    return {str(question["id"]): question for question in questions}, answers


def _answer_to_item_values(
    answer: dict[str, Any],
    question: dict[str, Any],
) -> dict[str, float | None]:
    question_id = str(question["id"])
    question_type = question.get("type")
    choices = _flatten_choices(question.get("options"))

    if question_type == "checkboxes":
        selected = set(_answer_options(answer.get("answer_options")))
        return {
            _make_checkbox_item_id(question_id, option_index): float(choice in selected)
            for option_index, choice in enumerate(choices, start=1)
        }

    value = _safe_float(answer.get("answer_numeric"))
    if value is None and answer.get("answer_text") is not None:
        answer_text = str(answer["answer_text"])
        value = (
            float(choices.index(answer_text) + 1) if answer_text in choices else None
        )

    if question_type == "multiple_choice" and len(choices) == 2 and value in {1.0, 2.0}:
        value -= 1

    return {question_id: value}


def _build_feature_matrix(
    survey_id: str,
    mapping: LatentTraitMapping,
    fitted_result: dict[str, Any],
    client: Any | None = None,
) -> tuple[np.ndarray, list[dict[str, Any]], list[str]]:
    respondent_ids = [
        str(row_id) for row_id in fitted_result.get("respondentIds") or []
    ]
    modeled_items = fitted_result.get("modeledItems") or []
    modeled_item_ids = [
        str(item.get("item_id")) for item in modeled_items if item.get("item_id")
    ]
    configured_question_ids = [
        question_id
        for question_ids in mapping.trait_to_question_ids.values()
        for question_id in question_ids
    ]

    questions_by_id, answers = _load_response_context(
        survey_id,
        list(dict.fromkeys(configured_question_ids)),
        respondent_ids,
        client=client,
    )
    answers_by_session: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for answer in answers:
        answers_by_session[str(answer.get("session_id"))].append(answer)

    feature_rows: list[list[float]] = []
    for respondent_id in respondent_ids:
        item_values: dict[str, float | None] = {}
        for answer in answers_by_session.get(respondent_id, []):
            question = questions_by_id.get(str(answer.get("question_id")))
            if not question or question.get("type") not in SUPPORTED_QUESTION_TYPES:
                continue
            item_values.update(_answer_to_item_values(answer, question))

        feature_rows.append(
            [item_values.get(item_id, np.nan) for item_id in modeled_item_ids]
        )

    item_metadata_by_id = {str(item.get("item_id")): item for item in modeled_items}
    feature_metadata = [
        {
            **item_metadata_by_id.get(item_id, {}),
            "item_id": item_id,
            "question_id": str(
                item_metadata_by_id.get(item_id, {}).get("question_id", item_id)
            ),
            "question_text": questions_by_id.get(
                str(item_metadata_by_id.get(item_id, {}).get("question_id", item_id)),
                {},
            ).get("question_text"),
        }
        for item_id in modeled_item_ids
    ]

    return np.asarray(feature_rows, dtype=float), feature_metadata, respondent_ids


def _fit_model(
    model_type: str, x: np.ndarray, y: np.ndarray
) -> tuple[np.ndarray, dict[str, Any]]:
    from sklearn.impute import SimpleImputer
    from sklearn.linear_model import LassoCV, RidgeCV
    from sklearn.metrics import mean_squared_error, r2_score
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    cv = min(5, len(y))
    if model_type == "ridge":
        model = RidgeCV(alphas=np.logspace(-3, 3, 13), cv=cv)
    else:
        model = LassoCV(
            alphas=np.logspace(-3, 1, 20),
            cv=cv,
            max_iter=10000,
            random_state=0,
        )

    pipeline = make_pipeline(
        SimpleImputer(strategy="median"),
        StandardScaler(),
        model,
    )
    pipeline.fit(x, y)
    predictions = pipeline.predict(x)
    estimator = pipeline.named_steps[model.__class__.__name__.lower()]
    coefficients = np.asarray(estimator.coef_, dtype=float)
    rmse = float(math.sqrt(mean_squared_error(y, predictions)))
    r2 = float(r2_score(y, predictions))

    return coefficients, {
        "r2": r2,
        "rmse": rmse,
        "n": int(len(y)),
        "featureCount": int(x.shape[1]),
    }


def _rank_questions(
    model_type: str,
    coefficients: np.ndarray,
    quality: dict[str, Any],
    feature_metadata: list[dict[str, Any]],
    top_n: int = 5,
) -> dict[str, Any]:
    grouped: dict[str, dict[str, Any]] = {}
    for coefficient, metadata in zip(coefficients, feature_metadata, strict=False):
        question_id = str(metadata.get("question_id") or metadata.get("item_id"))
        entry = grouped.setdefault(
            question_id,
            {
                "questionId": question_id,
                "questionText": metadata.get("question_text") or question_id,
                "score": 0.0,
                "signedScore": 0.0,
            },
        )
        entry["score"] += abs(float(coefficient))
        entry["signedScore"] += float(coefficient)

    total_score = sum(row["score"] for row in grouped.values())
    ranked = sorted(grouped.values(), key=lambda row: row["score"], reverse=True)
    for row in ranked:
        row["percentage"] = (row["score"] / total_score * 100) if total_score > 0 else 0
        row["direction"] = (
            "positive"
            if row["signedScore"] > 0
            else "negative"
            if row["signedScore"] < 0
            else "neutral"
        )

    return {
        "modelType": model_type,
        "rankedQuestions": ranked[:top_n],
        "quality": quality,
    }


def _theta_values_for_trait(
    fitted_result: dict[str, Any], trait_id: str
) -> list[float]:
    for dimension in fitted_result.get("dimensions") or []:
        if dimension.get("id") == trait_id:
            return [
                float(value)
                for value in dimension.get("thetaValues") or []
                if _safe_float(value) is not None
            ]
    return []


def build_predictive_models(
    survey_id: str,
    mapping: LatentTraitMapping,
    fitted_result: dict[str, Any],
    client: Any | None = None,
) -> dict[str, Any]:
    try:
        x, feature_metadata, respondent_ids = _build_feature_matrix(
            survey_id,
            mapping,
            fitted_result,
            client=client,
        )
    except Exception as e:
        return {"status": "unavailable", "message": str(e), "traits": []}

    traits: list[dict[str, Any]] = []
    if not respondent_ids or x.shape[1] == 0:
        return {
            "status": "unavailable",
            "message": "Predictive models require respondent ids and modeled items from the fitted latent trait output.",
            "traits": [],
        }

    for trait_id in mapping.trait_to_question_ids:
        theta_values = _theta_values_for_trait(fitted_result, trait_id)
        if len(theta_values) != len(respondent_ids):
            traits.append(
                _unavailable_trait(
                    trait_id,
                    "Theta values are missing or are not aligned with respondent ids.",
                )
            )
            continue

        y = np.asarray(theta_values, dtype=float)
        finite_mask = np.isfinite(y) & np.any(np.isfinite(x), axis=1)
        x_trait = x[finite_mask]
        y_trait = y[finite_mask]

        if len(y_trait) < 5:
            traits.append(
                _unavailable_trait(
                    trait_id, "At least five aligned respondents are required."
                )
            )
            continue
        if np.nanstd(y_trait) == 0:
            traits.append(
                _unavailable_trait(trait_id, "Theta target has no variation.")
            )
            continue

        finite_feature_counts = np.sum(np.isfinite(x_trait), axis=0)
        variable_features = [
            index
            for index in range(x_trait.shape[1])
            if finite_feature_counts[index] > 0
            and len(np.unique(x_trait[np.isfinite(x_trait[:, index]), index])) > 1
        ]
        if not variable_features:
            traits.append(
                _unavailable_trait(
                    trait_id, "No variable response features are available."
                )
            )
            continue

        x_trait = x_trait[:, variable_features]
        trait_feature_metadata = [
            feature_metadata[index] for index in variable_features
        ]

        try:
            ridge_coefficients, ridge_quality = _fit_model("ridge", x_trait, y_trait)
            lasso_coefficients, lasso_quality = _fit_model("lasso", x_trait, y_trait)
        except Exception as e:
            traits.append(_unavailable_trait(trait_id, str(e)))
            continue

        traits.append(
            {
                "traitId": trait_id,
                "status": "complete",
                "models": {
                    "ridge": _rank_questions(
                        "ridge",
                        ridge_coefficients,
                        ridge_quality,
                        trait_feature_metadata,
                    ),
                    "lasso": _rank_questions(
                        "lasso",
                        lasso_coefficients,
                        lasso_quality,
                        trait_feature_metadata,
                    ),
                },
            }
        )

    status = (
        "complete"
        if any(trait.get("status") == "complete" for trait in traits)
        else "unavailable"
    )
    return {"status": status, "traits": traits}
