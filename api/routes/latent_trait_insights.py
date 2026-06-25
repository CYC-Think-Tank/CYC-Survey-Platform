import json
import os
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException

from api.dependencies import supabase

router = APIRouter()

CONFIG_DIR = Path(__file__).resolve().parents[1] / "question_topic_configs"
OUTPUT_DIR = Path(
    os.getenv(
        "LATENT_TRAIT_OUTPUT_DIR",
        str(Path(__file__).resolve().parents[1] / "latent_trait_outputs"),
    )
)
MODELED_QUESTION_TYPES = {"checkboxes", "likert_scale", "multiple_choice"}
EXCLUDED_QUESTION_TYPES = {"ranking"}


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
async def get_latent_trait_preview(survey_id: str):
    try:
        fitted_result = _load_fitted_result(survey_id)
        if fitted_result is not None:
            return fitted_result

        config = _get_config_for_survey(survey_id)
        configured_question_ids = {
            question_id
            for question_ids in config["dimensions"].values()
            for question_id in question_ids
        }
        valid_responses = _count_valid_responses(survey_id)
        estimated_items = _count_modeled_questions(survey_id, configured_question_ids)

        return {
            "survey_id": survey_id,
            "status": "config_ready",
            "source_file": config["source_file"],
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
                for dimension, question_ids in config["dimensions"].items()
            ],
            "fit": {
                "status": "preview",
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
