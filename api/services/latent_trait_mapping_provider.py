import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import UUID

API_DIR = Path(__file__).resolve().parents[1]
CONFIG_DIR = API_DIR / "question_topic_configs"


class LatentTraitMappingError(ValueError):
    pass


@dataclass(frozen=True)
class LatentTraitMapping:
    survey_id: str
    trait_to_question_ids: dict[str, list[str]]
    source_file: str


def normalize_survey_id(survey_id: str | UUID) -> str:
    try:
        return str(UUID(str(survey_id)))
    except (TypeError, ValueError) as e:
        raise LatentTraitMappingError("Invalid survey_id") from e


def _validate_mapping(config: dict[str, Any], source_file: Path) -> LatentTraitMapping:
    survey_id = config.get("survey_id")
    dimensions = config.get("dimensions")

    if not isinstance(survey_id, str) or not survey_id:
        raise LatentTraitMappingError(f"{source_file.name} is missing survey_id")

    try:
        normalized_survey_id = normalize_survey_id(survey_id)
    except LatentTraitMappingError as e:
        raise LatentTraitMappingError(f"{source_file.name} has invalid survey_id") from e

    if not isinstance(dimensions, dict) or not dimensions:
        raise LatentTraitMappingError(
            f"{source_file.name} must define at least one dimension"
        )

    trait_to_question_ids: dict[str, list[str]] = {}
    for trait_id, question_ids in dimensions.items():
        if not isinstance(trait_id, str) or not trait_id:
            raise LatentTraitMappingError(f"{source_file.name} contains an unnamed dimension")
        if not isinstance(question_ids, list) or not question_ids:
            raise LatentTraitMappingError(
                f"{source_file.name} dimension '{trait_id}' must contain question ids"
            )
        if not all(isinstance(question_id, str) for question_id in question_ids):
            raise LatentTraitMappingError(
                f"{source_file.name} dimension '{trait_id}' contains a non-string question id"
            )
        trait_to_question_ids[trait_id] = question_ids

    return LatentTraitMapping(
        survey_id=normalized_survey_id,
        trait_to_question_ids=trait_to_question_ids,
        source_file=str(source_file),
    )


def _load_mapping_file(path: Path) -> LatentTraitMapping:
    try:
        with path.open("r", encoding="utf-8") as f:
            config = json.load(f)
    except json.JSONDecodeError as e:
        raise LatentTraitMappingError(f"Invalid JSON in {path.name}: {e}") from e

    return _validate_mapping(config, path)


def load_all_trait_mappings(config_dir: Path = CONFIG_DIR) -> list[LatentTraitMapping]:
    if not config_dir.exists():
        raise FileNotFoundError(f"Config directory does not exist: {config_dir}")

    mappings = [_load_mapping_file(path) for path in sorted(config_dir.glob("*.json"))]
    if not mappings:
        raise FileNotFoundError(f"No config JSON files found in {config_dir}")

    return mappings


def get_trait_mapping_for_survey(
    survey_id: str | UUID,
    config_dir: Path = CONFIG_DIR,
) -> LatentTraitMapping:
    normalized_survey_id = normalize_survey_id(survey_id)
    matches = [
        mapping
        for mapping in load_all_trait_mappings(config_dir)
        if mapping.survey_id == normalized_survey_id
    ]

    if not matches:
        raise LookupError(f"No latent trait config found for survey_id {normalized_survey_id}")
    if len(matches) > 1:
        raise LatentTraitMappingError(
            f"Multiple latent trait configs found for survey_id {normalized_survey_id}"
        )

    return matches[0]


def to_config_payload(mapping: LatentTraitMapping) -> dict[str, Any]:
    return {
        "survey_id": mapping.survey_id,
        "dimensions": mapping.trait_to_question_ids,
        "source_file": mapping.source_file,
    }
