import json
import os
import subprocess
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

from api.dependencies import supabase

router = APIRouter()

API_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = API_DIR.parent
CONFIG_DIR = API_DIR / "question_topic_configs"
OUTPUT_DIR = Path(
    os.getenv(
        "LATENT_TRAIT_OUTPUT_DIR",
        str(API_DIR / "latent_trait_outputs"),
    )
)
JOB_STATUS_DIR = OUTPUT_DIR / "_jobs"
GENERAL_SCRIPT_PATH = API_DIR / "general_script.r"
R_SCRIPT_TIMEOUT_SECONDS = int(os.getenv("LATENT_TRAIT_R_TIMEOUT_SECONDS", "600"))
MAX_LATENT_TRAITS = int(os.getenv("LATENT_TRAIT_MAX_DIMENSIONS", "3"))
MODELED_QUESTION_TYPES = {"checkboxes", "likert_scale", "multiple_choice"}
EXCLUDED_QUESTION_TYPES = {"ranking"}
_running_jobs: set[str] = set()
_running_jobs_lock = threading.Lock()


def _validate_config(config: dict[str, Any], source_file: Path) -> dict[str, Any]:
    survey_id = config.get("survey_id")
    dimensions = config.get("dimensions")

    if not isinstance(survey_id, str) or not survey_id:
        raise ValueError(f"{source_file.name} is missing survey_id")

    if not isinstance(dimensions, dict) or not dimensions:
        raise ValueError(f"{source_file.name} must define at least one dimension")

    for dimension, question_ids in dimensions.items():
        if not isinstance(dimension, str) or not dimension:
            raise ValueError(f"{source_file.name} contains an unnamed dimension")
        if not isinstance(question_ids, list) or not question_ids:
            raise ValueError(
                f"{source_file.name} dimension '{dimension}' must contain question ids"
            )
        if not all(isinstance(question_id, str) for question_id in question_ids):
            raise ValueError(
                f"{source_file.name} dimension '{dimension}' contains a non-string question id"
            )

    return {
        "survey_id": survey_id,
        "dimensions": dimensions,
        "source_file": str(source_file),
    }


def _load_config_file(path: Path) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as f:
            config = json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in {path.name}: {e}") from e

    return _validate_config(config, path)


def _load_all_configs() -> list[dict[str, Any]]:
    if not CONFIG_DIR.exists():
        raise FileNotFoundError(f"Config directory does not exist: {CONFIG_DIR}")

    configs = [_load_config_file(path) for path in sorted(CONFIG_DIR.glob("*.json"))]
    if not configs:
        raise FileNotFoundError(f"No config JSON files found in {CONFIG_DIR}")

    return configs


def _get_config_for_survey(survey_id: str) -> dict[str, Any]:
    matches = [config for config in _load_all_configs() if config["survey_id"] == survey_id]
    if not matches:
        raise HTTPException(
            status_code=404,
            detail=f"No latent trait config found for survey_id {survey_id}",
        )
    if len(matches) > 1:
        raise HTTPException(
            status_code=500,
            detail=f"Multiple latent trait configs found for survey_id {survey_id}",
        )

    return matches[0]


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


def _get_fitted_result_path(survey_id: str) -> Path:
    return OUTPUT_DIR / f"{survey_id}.json"


def _clear_fitted_result(survey_id: str) -> None:
    result_path = _get_fitted_result_path(survey_id)
    if result_path.exists():
        result_path.unlink()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _get_job_status_path(survey_id: str) -> Path:
    return JOB_STATUS_DIR / f"{survey_id}.json"


def _write_job_status(survey_id: str, status: dict[str, Any]) -> None:
    JOB_STATUS_DIR.mkdir(parents=True, exist_ok=True)
    status_path = _get_job_status_path(survey_id)
    with status_path.open("w", encoding="utf-8") as f:
        json.dump(status, f, indent=2)


def _load_job_status(survey_id: str) -> Optional[dict[str, Any]]:
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


def _load_fitted_result(survey_id: str) -> Optional[dict[str, Any]]:
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
    return result


def _build_status_response(
    survey_id: str,
    config: dict[str, Any],
    status: str,
    message: Optional[str] = None,
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
    }


def _run_latent_trait_script(survey_id: str, config: dict[str, Any]) -> None:
    if not GENERAL_SCRIPT_PATH.exists():
        raise FileNotFoundError(f"Latent trait script does not exist: {GENERAL_SCRIPT_PATH}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    env = {
        **os.environ,
        "LATENT_TRAIT_SURVEY_ID": survey_id,
        "LATENT_TRAIT_CONFIG_PATH": config["source_file"],
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
        raise RuntimeError("Rscript was not found. Install R or ensure Rscript is available on PATH.") from e
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
async def get_latent_trait_config(survey_id: str):
    try:
        return _get_config_for_survey(survey_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/surveys/{survey_id}/latent-traits")
async def get_latent_trait_preview(
    survey_id: str,
    retry: bool = Query(False, description="Clear a failed job status and start a new fit."),
):
    try:
        config = _get_config_for_survey(survey_id)
        if retry:
            _clear_fitted_result(survey_id)
            _clear_job_status(survey_id)

        fitted_result = _load_fitted_result(survey_id)
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
