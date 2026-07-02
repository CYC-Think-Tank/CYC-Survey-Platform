import os
from uuid import UUID

import pytest

os.environ.setdefault("SUPABASE_URL", "http://127.0.0.1:54321")
os.environ.setdefault("SUPABASE_KEY", "test-key")

from api.routes import latent_trait_insights
from api.services.latent_trait_mapping_provider import (
    LatentTraitMappingError,
    LatentTraitMappingNotFoundError,
)


class Query:
    def __init__(self, rows, calls=None, table=None):
        self.rows = rows
        self.calls = calls if calls is not None else []
        self.table = table
        self.filters = []
        self.page = None

    def select(self, columns, **_kwargs):
        self.columns = columns
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
                "columns": self.columns,
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


def test_build_latent_trait_input_rows_uses_read_only_selects(monkeypatch):
    survey_id = "11111111-1111-4111-8111-111111111111"
    client = SupabaseStub(
        {
            "response_sessions": [
                {"id": "s1", "survey_id": survey_id, "is_valid": True},
                {"id": "s2", "survey_id": survey_id, "is_valid": False},
                {"id": "s3", "survey_id": "other-survey", "is_valid": True},
            ],
            "questions": [
                {
                    "id": "q1",
                    "survey_id": survey_id,
                    "question_text": "Pick one",
                    "type": "multiple_choice",
                    "options": {"choices": ["No", "Yes"]},
                },
                {
                    "id": "q2",
                    "survey_id": survey_id,
                    "question_text": "Skipped by config",
                    "type": "multiple_choice",
                    "options": {"choices": ["A", "B"]},
                },
            ],
            "answers": [
                {
                    "session_id": "s1",
                    "question_id": "q1",
                    "answer_text": "Yes",
                    "answer_numeric": None,
                    "answer_options": None,
                },
                {
                    "session_id": "s2",
                    "question_id": "q1",
                    "answer_text": "No",
                    "answer_numeric": None,
                    "answer_options": None,
                },
                {
                    "session_id": "s1",
                    "question_id": "q2",
                    "answer_text": "A",
                    "answer_numeric": None,
                    "answer_options": None,
                },
            ],
        }
    )
    monkeypatch.setattr(latent_trait_insights, "supabase", client)

    rows = latent_trait_insights._build_latent_trait_input_rows(
        survey_id,
        {
            "survey_id": survey_id,
            "source_file": "config.json",
            "dimensions": {"trait": ["q1"]},
        },
    )

    assert rows == [
        {
            "session_id": "s1",
            "survey_id": survey_id,
            "question_id": "q1",
            "question_text": "Pick one",
            "question_type": "multiple_choice",
            "question_options": '{"choices": ["No", "Yes"]}',
            "answer_text": "Yes",
            "answer_numeric": None,
            "answer_options": "null",
        }
    ]
    assert {call["table"] for call in client.calls} == {
        "response_sessions",
        "questions",
        "answers",
    }


@pytest.mark.asyncio
async def test_missing_config_returns_unavailable_without_starting_job(monkeypatch):
    survey_id = UUID("11111111-1111-4111-8111-111111111111")

    async def allow_request(_request):
        return object()

    def missing_mapping(_survey_id):
        raise LatentTraitMappingNotFoundError("missing")

    def unexpected_call(*_args, **_kwargs):
        raise AssertionError("Missing config must not touch fit state or start a job")

    monkeypatch.setattr(latent_trait_insights, "require_admin_context", allow_request)
    monkeypatch.setattr(
        latent_trait_insights, "require_survey_team_access", lambda *_: None
    )
    monkeypatch.setattr(
        latent_trait_insights, "_get_mapping_for_survey", missing_mapping
    )
    monkeypatch.setattr(latent_trait_insights, "_clear_fitted_result", unexpected_call)
    monkeypatch.setattr(latent_trait_insights, "_clear_job_status", unexpected_call)
    monkeypatch.setattr(latent_trait_insights, "_load_fitted_result", unexpected_call)
    monkeypatch.setattr(
        latent_trait_insights, "_start_latent_trait_job", unexpected_call
    )

    response = await latent_trait_insights.get_latent_trait_preview(
        survey_id,
        object(),
        retry=True,
    )

    assert response["status"] == "unavailable"
    assert response["fit"]["status"] == "unavailable"
    assert response["dimensions"] == []
    assert response["message"] == latent_trait_insights.LATENT_TRAIT_UNAVAILABLE_MESSAGE


@pytest.mark.asyncio
async def test_invalid_config_remains_server_error(monkeypatch):
    survey_id = UUID("11111111-1111-4111-8111-111111111111")

    async def allow_request(_request):
        return object()

    def invalid_mapping(_survey_id):
        raise LatentTraitMappingError("invalid mapping")

    monkeypatch.setattr(latent_trait_insights, "require_admin_context", allow_request)
    monkeypatch.setattr(
        latent_trait_insights, "require_survey_team_access", lambda *_: None
    )
    monkeypatch.setattr(
        latent_trait_insights, "get_trait_mapping_for_survey", invalid_mapping
    )

    with pytest.raises(latent_trait_insights.HTTPException) as exc_info:
        await latent_trait_insights.get_latent_trait_preview(survey_id, object())

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "invalid mapping"
