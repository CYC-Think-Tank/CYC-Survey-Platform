import numpy as np

from api.services import ridge_lasso_service
from api.services.latent_trait_mapping_provider import LatentTraitMapping


class Query:
    def __init__(self, rows, calls=None, table=None):
        self.rows = rows
        self.calls = calls if calls is not None else []
        self.table = table
        self.filters = []
        self.page = None

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self.filters.append(("eq", column, value))
        return self

    def in_(self, column, value):
        self.filters.append(("in_", column, value))
        return self

    def range(self, start, end):
        self.page = (start, end)
        return self

    def execute(self):
        rows = list(self.rows)
        for method, column, value in self.filters:
            if method == "eq":
                rows = [row for row in rows if row.get(column) == value]
            if method == "in_":
                allowed = set(value)
                rows = [row for row in rows if row.get(column) in allowed]

        if self.page is not None:
            start, end = self.page
            rows = rows[start : end + 1]

        self.calls.append(
            {
                "table": self.table,
                "filters": self.filters,
                "range": self.page,
            }
        )
        return type("Response", (), {"data": rows})()


class SupabaseStub:
    def __init__(self, rows_by_table):
        self.rows_by_table = rows_by_table
        self.calls = []

    def table(self, name):
        return Query(self.rows_by_table[name], self.calls, name)


def fitted_result():
    theta_values = [-1.0, -0.5, 0.0, 0.5, 1.0]
    return {
        "respondentIds": ["s1", "s2", "s3", "s4", "s5"],
        "modeledItems": [
            {
                "item_id": "q1",
                "question_id": "q1",
                "question_type": "multiple_choice",
                "option_count": 2,
            },
            {
                "item_id": "q2__option_1",
                "question_id": "q2",
                "question_type": "checkboxes",
                "option_count": 2,
            },
            {
                "item_id": "q2__option_2",
                "question_id": "q2",
                "question_type": "checkboxes",
                "option_count": 2,
            },
        ],
        "dimensions": [
            {
                "id": "trait_a",
                "thetaValues": theta_values,
            }
        ],
    }


def mapping():
    return LatentTraitMapping(
        survey_id="11111111-1111-4111-8111-111111111111",
        trait_to_question_ids={"trait_a": ["q1", "q2"]},
        source_file="config.json",
    )


def client():
    return SupabaseStub(
        {
            "questions": [
                {
                    "id": "q1",
                    "question_text": "Binary choice",
                    "type": "multiple_choice",
                    "options": {"choices": ["No", "Yes"]},
                    "survey_id": "11111111-1111-4111-8111-111111111111",
                },
                {
                    "id": "q2",
                    "question_text": "Select all",
                    "type": "checkboxes",
                    "options": {"choices": ["A", "B"]},
                    "survey_id": "11111111-1111-4111-8111-111111111111",
                },
            ],
            "answers": [
                {
                    "session_id": "s1",
                    "question_id": "q1",
                    "answer_text": "No",
                    "answer_numeric": None,
                    "answer_options": None,
                },
                {
                    "session_id": "s1",
                    "question_id": "q2",
                    "answer_text": None,
                    "answer_numeric": None,
                    "answer_options": ["A"],
                },
                {
                    "session_id": "s2",
                    "question_id": "q1",
                    "answer_text": "No",
                    "answer_numeric": None,
                    "answer_options": None,
                },
                {
                    "session_id": "s2",
                    "question_id": "q2",
                    "answer_text": None,
                    "answer_numeric": None,
                    "answer_options": ["B"],
                },
                {
                    "session_id": "s3",
                    "question_id": "q1",
                    "answer_text": "Yes",
                    "answer_numeric": None,
                    "answer_options": None,
                },
                {
                    "session_id": "s3",
                    "question_id": "q2",
                    "answer_text": None,
                    "answer_numeric": None,
                    "answer_options": ["A", "B"],
                },
                {
                    "session_id": "s4",
                    "question_id": "q1",
                    "answer_text": "Yes",
                    "answer_numeric": None,
                    "answer_options": None,
                },
                {
                    "session_id": "s4",
                    "question_id": "q2",
                    "answer_text": None,
                    "answer_numeric": None,
                    "answer_options": ["A"],
                },
                {
                    "session_id": "s5",
                    "question_id": "q1",
                    "answer_text": "Yes",
                    "answer_numeric": None,
                    "answer_options": None,
                },
                {
                    "session_id": "s5",
                    "question_id": "q2",
                    "answer_text": None,
                    "answer_numeric": None,
                    "answer_options": ["B"],
                },
            ],
        }
    )


def test_build_predictive_models_aligns_theta_and_groups_checkbox_options(monkeypatch):
    seen_targets = []

    def fake_fit_model(model_type, x, y):
        seen_targets.append(y.tolist())
        if model_type == "ridge":
            return np.asarray([0.2, 0.3, -0.1]), {
                "r2": 0.9,
                "rmse": 0.1,
                "n": len(y),
                "featureCount": x.shape[1],
            }
        return np.asarray([0.0, 0.5, 0.0]), {
            "r2": 0.8,
            "rmse": 0.2,
            "n": len(y),
            "featureCount": x.shape[1],
        }

    monkeypatch.setattr(ridge_lasso_service, "_fit_model", fake_fit_model)

    result = ridge_lasso_service.build_predictive_models(
        "11111111-1111-4111-8111-111111111111",
        mapping(),
        fitted_result(),
        client=client(),
    )

    assert result["status"] == "complete"
    assert seen_targets == [
        [-1.0, -0.5, 0.0, 0.5, 1.0],
        [-1.0, -0.5, 0.0, 0.5, 1.0],
    ]
    ridge_questions = result["traits"][0]["models"]["ridge"]["rankedQuestions"]
    assert ridge_questions[0]["questionId"] == "q2"
    assert ridge_questions[0]["questionText"] == "Select all"


def test_build_predictive_models_returns_unavailable_for_missing_alignment():
    result = ridge_lasso_service.build_predictive_models(
        "11111111-1111-4111-8111-111111111111",
        mapping(),
        {
            **fitted_result(),
            "respondentIds": [],
        },
        client=client(),
    )

    assert result["status"] == "unavailable"
    assert result["traits"] == []


def test_load_response_context_chunks_and_paginates_answer_reads(monkeypatch):
    monkeypatch.setattr(ridge_lasso_service, "SUPABASE_IN_FILTER_CHUNK_SIZE", 2)
    monkeypatch.setattr(ridge_lasso_service, "SUPABASE_PAGE_SIZE", 3)

    rows_by_table = {
        "questions": [
            {
                "id": "q1",
                "question_text": "Question",
                "type": "multiple_choice",
                "options": {"choices": ["No", "Yes"]},
                "survey_id": "survey-1",
            }
        ],
        "answers": [
            {
                "session_id": session_id,
                "question_id": "q1",
                "answer_text": "Yes",
                "answer_numeric": None,
                "answer_options": None,
            }
            for session_id in ["s1", "s2", "s3", "s4", "s5"]
            for _ in range(2)
        ],
    }
    stub = SupabaseStub(rows_by_table)

    _questions, answers = ridge_lasso_service._load_response_context(
        "survey-1",
        ["q1"],
        ["s1", "s2", "s3", "s4", "s5"],
        client=stub,
    )

    answer_calls = [call for call in stub.calls if call["table"] == "answers"]
    session_chunks = [
        next(value for method, column, value in call["filters"] if method == "in_" and column == "session_id")
        for call in answer_calls
        if call["range"] == (0, 2)
    ]

    assert len(answers) == 10
    assert session_chunks == [["s1", "s2"], ["s3", "s4"], ["s5"]]
    assert any(call["range"] == (3, 5) for call in answer_calls)
