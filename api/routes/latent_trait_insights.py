import json
import os
import subprocess
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from api.dependencies import supabase
from api.services.latent_trait_mapping_provider import (
    LatentTraitMappingError,
    get_trait_mapping_for_survey,
    load_all_trait_mappings,
    normalize_survey_id,
    to_config_payload,
)
from api.services.ridge_lasso_service import PREDICTIVE_PENDING, build_predictive_models

router = APIRouter()

API_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = API_DIR.parent
OUTPUT_DIR = Path(
    os.getenv(
        "LATENT_TRAIT_OUTPUT_DIR",
        str(API_DIR / "latent_trait_outputs"),
    )
)
JOB_STATUS_DIR = OUTPUT_DIR / "_jobs"
INPUT_DIR = OUTPUT_DIR / "_inputs"
GENERAL_SCRIPT_PATH = API_DIR / "general_script.r"
R_SCRIPT_TIMEOUT_SECONDS = int(os.getenv("LATENT_TRAIT_R_TIMEOUT_SECONDS", "600"))
MAX_LATENT_TRAITS = int(os.getenv("LATENT_TRAIT_MAX_DIMENSIONS", "3"))
MODELED_QUESTION_TYPES = {"checkboxes", "likert_scale", "multiple_choice"}
EXCLUDED_QUESTION_TYPES = {"ranking"}
SUPABASE_IN_FILTER_CHUNK_SIZE = 50
SUPABASE_PAGE_SIZE = 1000
_running_jobs: set[str] = set()
_running_jobs_lock = threading.Lock()


def _safe_json_path(base_dir: Path, survey_id: str | UUID) -> Path:
    safe_survey_id = normalize_survey_id(survey_id)
    base_path = base_dir.resolve()
    target_path = (base_path / f"{safe_survey_id}.json").resolve()

    if target_path.parent != base_path:
        raise ValueError("Invalid survey_id path")

    return target_path


def _load_all_configs() -> list[dict[str, Any]]:
    return [to_config_payload(mapping) for mapping in load_all_trait_mappings()]


def _get_config_for_survey(survey_id: str) -> dict[str, Any]:
    try:
        return to_config_payload(get_trait_mapping_for_survey(survey_id))
    except LookupError:
        raise HTTPException(
            status_code=404,
            detail=f"No latent trait config found for survey_id {survey_id}",
        )
    except LatentTraitMappingError as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


def _get_mapping_for_survey(survey_id: str):
    try:
        return get_trait_mapping_for_survey(survey_id)
    except LookupError:
        raise HTTPException(
            status_code=404,
            detail=f"No latent trait config found for survey_id {survey_id}",
        )
    except LatentTraitMappingError as e:
        raise HTTPException(status_code=500, detail=str(e))


def _count_valid_responses(survey_id: str) -> int:
    response = (
        supabase.table("response_sessions")
        .select("id", count="exact")
        .eq("survey_id", survey_id)
        .eq("is_valid", True)
        .execute()
    )
    return response.count or 0


def _count_modeled_questions(survey_id: str, configured_question_ids: set[str]) -> int:
    response = (
        supabase.table("questions")
        .select("id,type")
        .eq("survey_id", survey_id)
        .in_("id", list(configured_question_ids))
        .execute()
    )
    return sum(
        1
        for question in response.data or []
        if question.get("type") in MODELED_QUESTION_TYPES
    )


def _chunks(values: list[str], chunk_size: int = SUPABASE_IN_FILTER_CHUNK_SIZE):
    for start in range(0, len(values), chunk_size):
        yield values[start : start + chunk_size]


def _select_all_paginated(
    table: str,
    columns: str,
    filters: list[tuple[str, str, Any]],
    page_size: int = SUPABASE_PAGE_SIZE,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    start = 0

    while True:
        query = supabase.table(table).select(columns)
        for method, column, value in filters:
            query = getattr(query, method)(column, value)

        page = query.range(start, start + page_size - 1).execute().data or []
        rows.extend(page)

        if len(page) < page_size:
            return rows

        start += page_size


def _load_valid_response_sessions(survey_id: str) -> list[dict[str, Any]]:
    return _select_all_paginated(
        "response_sessions",
        "id,survey_id",
        [
            ("eq", "survey_id", survey_id),
            ("eq", "is_valid", True),
        ],
    )


def _load_questions_for_latent_traits(
    survey_id: str,
    question_ids: list[str],
) -> dict[str, dict[str, Any]]:
    if not question_ids:
        return {}

    questions: list[dict[str, Any]] = []
    for question_chunk in _chunks(question_ids):
        questions.extend(
            _select_all_paginated(
                "questions",
                "id,question_text,type,options",
                [
                    ("eq", "survey_id", survey_id),
                    ("in_", "id", question_chunk),
                ],
            )
        )

    return {str(question["id"]): question for question in questions}


def _load_answers_for_latent_traits(
    respondent_ids: list[str],
    question_ids: list[str],
) -> list[dict[str, Any]]:
    if not respondent_ids or not question_ids:
        return []

    answers: list[dict[str, Any]] = []
    for respondent_chunk in _chunks(respondent_ids):
        for question_chunk in _chunks(question_ids):
            answers.extend(
                _select_all_paginated(
                    "answers",
                    "session_id,question_id,answer_text,answer_numeric,answer_options",
                    [
                        ("in_", "session_id", respondent_chunk),
                        ("in_", "question_id", question_chunk),
                    ],
                )
            )

    return answers


def _json_cell(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, str):
        return value
    return json.dumps(value)


def _build_latent_trait_input_rows(
    survey_id: str,
    config: dict[str, Any],
) -> list[dict[str, Any]]:
    selected_dimensions = dict(list(config["dimensions"].items())[:MAX_LATENT_TRAITS])
    question_ids = list(
        dict.fromkeys(
            question_id
            for question_ids in selected_dimensions.values()
            for question_id in question_ids
        )
    )
    sessions = _load_valid_response_sessions(survey_id)
    respondent_ids = [str(session["id"]) for session in sessions]
    questions_by_id = _load_questions_for_latent_traits(survey_id, question_ids)
    answers = _load_answers_for_latent_traits(respondent_ids, question_ids)

    input_rows: list[dict[str, Any]] = []
    session_survey_ids = {
        str(session["id"]): str(session.get("survey_id") or survey_id)
        for session in sessions
    }

    for answer in answers:
        question_id = str(answer.get("question_id"))
        question = questions_by_id.get(question_id)
        session_id = str(answer.get("session_id"))
        if not question or session_id not in session_survey_ids:
            continue

        input_rows.append(
            {
                "session_id": session_id,
                "survey_id": session_survey_ids[session_id],
                "question_id": question_id,
                "question_text": question.get("question_text"),
                "question_type": question.get("type"),
                "question_options": _json_cell(question.get("options")),
                "answer_text": answer.get("answer_text"),
                "answer_numeric": answer.get("answer_numeric"),
                "answer_options": _json_cell(answer.get("answer_options")),
            }
        )

    return input_rows


def _write_latent_trait_input_rows(
    survey_id: str,
    config: dict[str, Any],
) -> Path:
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    input_path = _safe_json_path(INPUT_DIR, survey_id)
    input_rows = _build_latent_trait_input_rows(survey_id, config)

    with input_path.open("w", encoding="utf-8") as f:
        json.dump(input_rows, f)

    return input_path


def _get_fitted_result_path(survey_id: str) -> Path:
    return _safe_json_path(OUTPUT_DIR, survey_id)


def _clear_fitted_result(survey_id: str) -> None:
    result_path = _get_fitted_result_path(survey_id)
    if result_path.exists():
        result_path.unlink()


def _utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _get_job_status_path(survey_id: str) -> Path:
    return _safe_json_path(JOB_STATUS_DIR, survey_id)


def _write_job_status(survey_id: str, status: dict[str, Any]) -> None:
    JOB_STATUS_DIR.mkdir(parents=True, exist_ok=True)
    status_path = _get_job_status_path(survey_id)
    with status_path.open("w", encoding="utf-8") as f:
        json.dump(status, f, indent=2)


def _load_job_status(survey_id: str) -> dict[str, Any] | None:
    status_path = _get_job_status_path(survey_id)
    if not status_path.exists():
        return None

    try:
        with status_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return {
            "status": "error",
            "message": f"Invalid job status JSON in {status_path}",
        }


def _clear_job_status(survey_id: str) -> None:
    status_path = _get_job_status_path(survey_id)
    if status_path.exists():
        status_path.unlink()


def _load_fitted_result(survey_id: str, mapping: Any) -> dict[str, Any] | None:
    path = _get_fitted_result_path(survey_id)
    if not path.exists():
        return None

    try:
        with path.open("r", encoding="utf-8") as f:
            result = json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid latent trait output JSON in {path.name}: {e}") from e

    if result.get("survey_id") != survey_id:
        raise ValueError(
            f"Latent trait output {path.name} is for survey_id {result.get('survey_id')}, "
            f"not {survey_id}"
        )

    if not isinstance(result.get("dimensions"), list):
        raise ValueError(f"Latent trait output {path.name} is missing dimensions")

    if not isinstance(result.get("fit"), dict):
        raise ValueError(f"Latent trait output {path.name} is missing fit diagnostics")

    result["status"] = result.get("status") or "fit_complete"
    result["source_file"] = result.get("source_file") or str(path)
    result["predictiveModels"] = build_predictive_models(survey_id, mapping, result)
    return result


def _build_status_response(
    survey_id: str,
    config: dict[str, Any],
    status: str,
    message: str | None = None,
) -> dict[str, Any]:
    selected_dimensions = dict(list(config["dimensions"].items())[:MAX_LATENT_TRAITS])
    configured_question_ids = {
        question_id
        for question_ids in selected_dimensions.values()
        for question_id in question_ids
    }
    valid_responses = _count_valid_responses(survey_id)
    estimated_items = _count_modeled_questions(survey_id, configured_question_ids)

    return {
        "survey_id": survey_id,
        "status": status,
        "source_file": config["source_file"],
        "message": message,
        "dimensions": [
            {
                "id": dimension,
                "label": dimension,
                "description": f"Config-defined latent trait: {dimension}",
                "question_ids": question_ids,
                "mean": None,
                "median": None,
                "standardDeviation": None,
                "standardError": None,
                "min": -3,
                "max": 3,
                "reliability": None,
                "respondents": valid_responses,
                "thetaValues": [],
            }
            for dimension, question_ids in selected_dimensions.items()
        ],
        "fit": {
            "status": status,
            "model": "Config-driven mixed-format MIRT",
            "itemTypes": ["2PL", "GRM", "NRM"],
            "estimatedItems": estimated_items,
            "excludedQuestionTypes": sorted(EXCLUDED_QUESTION_TYPES),
            "logLikelihood": None,
            "aic": None,
            "bic": None,
            "lastRun": None,
        },
        "predictiveModels": PREDICTIVE_PENDING,
    }


def _run_latent_trait_script(survey_id: str, config: dict[str, Any]) -> None:
    if not GENERAL_SCRIPT_PATH.exists():
        raise FileNotFoundError(
            f"Latent trait script does not exist: {GENERAL_SCRIPT_PATH}"
        )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    input_path = _write_latent_trait_input_rows(survey_id, config)
    env = {
        **os.environ,
        "LATENT_TRAIT_SURVEY_ID": survey_id,
        "LATENT_TRAIT_CONFIG_PATH": config["source_file"],
        "LATENT_TRAIT_INPUT_PATH": str(input_path),
        "LATENT_TRAIT_OUTPUT_DIR": str(OUTPUT_DIR),
        "LATENT_TRAIT_API_MODE": "true",
    }

    try:
        result = subprocess.run(
            ["Rscript", str(GENERAL_SCRIPT_PATH)],
            cwd=str(PROJECT_ROOT),
            env=env,
            capture_output=True,
            text=True,
            timeout=R_SCRIPT_TIMEOUT_SECONDS,
            check=False,
        )
    except FileNotFoundError as e:
        raise RuntimeError(
            "Rscript was not found. Install R or ensure Rscript is available on PATH."
        ) from e
    except subprocess.TimeoutExpired as e:
        raise TimeoutError(
            f"Latent trait fitting timed out after {R_SCRIPT_TIMEOUT_SECONDS} seconds."
        ) from e

    if result.returncode != 0:
        raise RuntimeError(
            json.dumps(
                {
                    "message": "Latent trait fitting failed.",
                    "returncode": result.returncode,
                    "stdout": result.stdout[-4000:],
                    "stderr": result.stderr[-4000:],
                }
            )
        )


def _run_latent_trait_job(survey_id: str, config: dict[str, Any]) -> None:
    try:
        _run_latent_trait_script(survey_id, config)
        _write_job_status(
            survey_id,
            {
                "status": "complete",
                "message": "Latent trait fitting completed.",
                "completed_at": _utc_now(),
            },
        )
    except Exception as e:
        _write_job_status(
            survey_id,
            {
                "status": "error",
                "message": str(e),
                "completed_at": _utc_now(),
            },
        )
    finally:
        with _running_jobs_lock:
            _running_jobs.discard(survey_id)


def _start_latent_trait_job(survey_id: str, config: dict[str, Any]) -> None:
    with _running_jobs_lock:
        if survey_id in _running_jobs:
            return

        _running_jobs.add(survey_id)

    _write_job_status(
        survey_id,
        {
            "status": "running",
            "message": "Latent trait fitting is running.",
            "started_at": _utc_now(),
        },
    )
    thread = threading.Thread(
        target=_run_latent_trait_job,
        args=(survey_id, config),
        daemon=True,
    )
    thread.start()


@router.get("/api/latent-trait-configs")
async def list_latent_trait_configs():
    try:
        configs = _load_all_configs()
        return {
            "configs": [
                {
                    "survey_id": config["survey_id"],
                    "dimensions": list(config["dimensions"].keys()),
                    "source_file": config["source_file"],
                }
                for config in configs
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/surveys/{survey_id}/latent-traits/config")
async def get_latent_trait_config(survey_id: UUID):
    survey_id = str(survey_id)
    try:
        return _get_config_for_survey(survey_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/surveys/{survey_id}/latent-traits")
async def get_latent_trait_preview(
    survey_id: UUID,
    retry: bool = Query(
        False, description="Clear a failed job status and start a new fit."
    ),
):
    survey_id = str(survey_id)
    try:
        mapping = _get_mapping_for_survey(survey_id)
        config = to_config_payload(mapping)
        if retry:
            _clear_fitted_result(survey_id)
            _clear_job_status(survey_id)

        fitted_result = _load_fitted_result(survey_id, mapping)
        if fitted_result is not None:
            return fitted_result

        job_status = _load_job_status(survey_id)

        if job_status and job_status.get("status") == "running":
            with _running_jobs_lock:
                is_active_in_process = survey_id in _running_jobs

            if not is_active_in_process:
                _start_latent_trait_job(survey_id, config)

            return _build_status_response(
                survey_id,
                config,
                "running",
                job_status.get("message"),
            )

        if job_status and job_status.get("status") == "error":
            return _build_status_response(
                survey_id,
                config,
                "error",
                job_status.get("message"),
            )

        _start_latent_trait_job(survey_id, config)
        return _build_status_response(
            survey_id,
            config,
            "running",
            "Latent trait fitting has started.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
