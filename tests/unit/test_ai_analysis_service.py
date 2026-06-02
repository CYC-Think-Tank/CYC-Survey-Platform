import json

import pytest
from fastapi import HTTPException

from api.services import ai_analysis


def test_parse_gemini_json_unwraps_markdown_and_adds_meta():
    payload = {"overall_summary": "ok"}

    result = ai_analysis.parse_gemini_analysis(
        f"```json\n{json.dumps(payload)}\n```",
        survey_id="survey-1",
        total_respondents=4,
    )

    assert result["overall_summary"] == "ok"
    assert result["meta"]["survey_id"] == "survey-1"
    assert result["meta"]["total_respondents"] == 4
    assert "generated_at" in result["meta"]


def test_parse_gemini_json_wraps_multi_item_array():
    result = ai_analysis.parse_gemini_analysis(
        '[{"a": 1}, {"b": 2}]',
        survey_id="survey-1",
        total_respondents=4,
    )

    assert result["data"] == [{"a": 1}, {"b": 2}]
    assert result["meta"]["survey_id"] == "survey-1"


def test_parse_gemini_json_raises_for_malformed_json():
    with pytest.raises(json.JSONDecodeError):
        ai_analysis.parse_gemini_analysis(
            "not-json",
            survey_id="survey-1",
            total_respondents=4,
        )


@pytest.mark.asyncio
async def test_call_gemini_requires_api_key(monkeypatch):
    monkeypatch.delenv("GOOGLE_AI_KEY", raising=False)

    with pytest.raises(HTTPException) as exc:
        await ai_analysis.call_gemini("prompt", "survey-1", 4)

    assert exc.value.status_code == 500
    assert exc.value.detail == "Google AI API key not configured"


@pytest.mark.asyncio
async def test_handle_ai_analysis_returns_cached_data_without_refresh(monkeypatch):
    class Query:
        def select(self, *_args, **_kwargs):
            return self

        def eq(self, *_args, **_kwargs):
            return self

        def execute(self):
            return type("Response", (), {"data": [{"data": {"cached": True}}]})()

    class SupabaseStub:
        def table(self, _name):
            return Query()

    async def fail_call_gemini(*_args, **_kwargs):
        raise AssertionError("Gemini should not be called for a cache hit")

    monkeypatch.setattr(ai_analysis, "_supabase", lambda: SupabaseStub())
    monkeypatch.setattr(ai_analysis, "call_gemini", fail_call_gemini)

    result = await ai_analysis.handle_ai_analysis(
        "survey-1",
        "mood",
        force_refresh=False,
        prompt_suffix="suffix",
    )

    assert result == {"cached": True}


@pytest.mark.asyncio
async def test_handle_ai_analysis_force_refresh_bypasses_cache(monkeypatch):
    class Query:
        def select(self, *_args, **_kwargs):
            return self

        def eq(self, *_args, **_kwargs):
            return self

        def execute(self):
            return type("Response", (), {"data": [{"data": {"cached": True}}]})()

    class SupabaseStub:
        def table(self, _name):
            return Query()

    monkeypatch.setattr(ai_analysis, "_supabase", lambda: SupabaseStub())
    monkeypatch.setattr(
        ai_analysis,
        "gather_survey_data",
        lambda _survey_id: (
            {"title": "Survey", "description": ""},
            [],
            [],
            [],
            3,
        ),
    )

    async def call_gemini(_prompt, survey_id, total_respondents):
        return {
            "fresh": True,
            "meta": {
                "survey_id": survey_id,
                "total_respondents": total_respondents,
            },
        }

    monkeypatch.setattr(ai_analysis, "call_gemini", call_gemini)

    result = await ai_analysis.handle_ai_analysis(
        "survey-1",
        "mood",
        force_refresh=True,
        prompt_suffix="suffix",
    )

    assert result["fresh"] is True
    assert result["meta"]["survey_id"] == "survey-1"


def test_gather_survey_data_requires_three_valid_sessions(monkeypatch):
    class Query:
        def __init__(self, rows):
            self.rows = rows

        def select(self, *_args, **_kwargs):
            return self

        def eq(self, *_args, **_kwargs):
            return self

        def order(self, *_args, **_kwargs):
            return self

        def execute(self):
            return type("Response", (), {"data": self.rows})()

    class SupabaseStub:
        def table(self, name):
            rows_by_table = {
                "surveys": [{"id": "survey-1", "title": "Survey"}],
                "questions": [],
                "response_sessions": [
                    {"id": "s1", "is_valid": True},
                    {"id": "s2", "is_valid": False},
                ],
            }
            return Query(rows_by_table[name])

    monkeypatch.setattr(ai_analysis, "_supabase", lambda: SupabaseStub())

    with pytest.raises(HTTPException) as exc:
        ai_analysis.gather_survey_data("survey-1")

    assert exc.value.status_code == 400
    assert exc.value.detail == "Need at least 3 completed responses for AI analysis."
