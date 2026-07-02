import json

import pytest

from api.services.latent_trait_mapping_provider import (
    LatentTraitMappingError,
    LatentTraitMappingNotFoundError,
    get_trait_mapping_for_survey,
    load_all_trait_mappings,
    normalize_survey_id,
)

SURVEY_ID = "11111111-1111-4111-8111-111111111111"


def write_config(path, survey_id=SURVEY_ID, dimensions=None):
    path.write_text(
        json.dumps(
            {
                "survey_id": survey_id,
                "dimensions": dimensions
                or {
                    "first": ["q1", "q2"],
                    "second": ["q3"],
                    "third": ["q4"],
                    "fourth": ["q5"],
                },
            }
        ),
        encoding="utf-8",
    )


def test_load_all_trait_mappings_normalizes_and_preserves_order(tmp_path):
    write_config(tmp_path / "survey.json")

    mappings = load_all_trait_mappings(tmp_path)

    assert len(mappings) == 1
    assert mappings[0].survey_id == SURVEY_ID
    assert list(mappings[0].trait_to_question_ids)[:3] == ["first", "second", "third"]
    assert mappings[0].trait_to_question_ids["first"] == ["q1", "q2"]


def test_normalize_survey_id_rejects_invalid_values():
    with pytest.raises(LatentTraitMappingError):
        normalize_survey_id("../not-a-survey")


def test_get_trait_mapping_for_survey_rejects_duplicates(tmp_path):
    write_config(tmp_path / "a.json")
    write_config(tmp_path / "b.json")

    with pytest.raises(LatentTraitMappingError, match="Multiple latent trait configs"):
        get_trait_mapping_for_survey(SURVEY_ID, tmp_path)


def test_get_trait_mapping_for_survey_raises_not_found_when_missing(tmp_path):
    write_config(tmp_path / "survey.json")

    with pytest.raises(LatentTraitMappingNotFoundError):
        get_trait_mapping_for_survey("22222222-2222-4222-8222-222222222222", tmp_path)


def test_get_trait_mapping_for_survey_raises_not_found_for_missing_directory(tmp_path):
    with pytest.raises(LatentTraitMappingNotFoundError):
        get_trait_mapping_for_survey(SURVEY_ID, tmp_path / "missing")


def test_get_trait_mapping_for_survey_raises_not_found_for_empty_directory(tmp_path):
    with pytest.raises(LatentTraitMappingNotFoundError):
        get_trait_mapping_for_survey(SURVEY_ID, tmp_path)
