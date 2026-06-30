from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from api.routes import results


class FakeQuery:
    def __init__(self, rows, calls):
        self.rows = rows
        self.calls = calls

    def select(self, columns, **_kwargs):
        self.calls.append(("select", columns))
        return self

    def eq(self, column, value):
        self.calls.append(("eq", column, value))
        return self

    def in_(self, column, values):
        self.calls.append(("in", column, values))
        return self

    def range(self, start, end):
        self.calls.append(("range", start, end))
        return self

    def execute(self):
        return SimpleNamespace(data=self.rows)


class FakeSupabase:
    def __init__(self, rows_by_table):
        self.rows_by_table = rows_by_table
        self.calls = []

    def table(self, name):
        self.calls.append(("table", name))
        return FakeQuery(self.rows_by_table[name], self.calls)


def context(role="team_leader"):
    return SimpleNamespace(
        default_team=SimpleNamespace(team_id="team-1", role=role),
    )


@pytest.mark.asyncio
async def test_general_raffle_returns_weighted_team_pool(monkeypatch):
    fake = FakeSupabase(
        {
            "surveys": [{"id": "survey-1"}, {"id": "survey-2"}],
            "raffle_entries": [
                {"email": "one@example.com"},
                {"email": "one@example.com"},
                {"email": "two@example.com"},
            ],
        }
    )

    async def require_context(_request):
        return context()

    monkeypatch.setattr(results, "supabase", fake)
    monkeypatch.setattr(results, "require_admin_context", require_context)

    payload = await results.get_raffle_entries(SimpleNamespace())

    assert payload == {
        "entries": ["one@example.com", "one@example.com", "two@example.com"],
        "count": 3,
        "participants": 2,
    }
    assert ("eq", "team_id", "team-1") in fake.calls
    assert ("in", "survey_id", ["survey-1", "survey-2"]) in fake.calls


@pytest.mark.asyncio
async def test_regular_member_cannot_read_raffle_emails(monkeypatch):
    async def require_context(_request):
        return context("team_member")

    monkeypatch.setattr(results, "require_admin_context", require_context)

    with pytest.raises(HTTPException) as error:
        await results.get_raffle_entries(SimpleNamespace())

    assert error.value.status_code == 403
    assert error.value.detail == "Team leader permission required"


@pytest.mark.asyncio
async def test_event_raffle_is_filtered_by_team_surveys(monkeypatch):
    fake = FakeSupabase(
        {
            "surveys": [{"id": "survey-1"}],
            "event_raffle_entries": [{"email": "event@example.com"}],
        }
    )

    async def require_context(_request):
        return context()

    monkeypatch.setattr(results, "supabase", fake)
    monkeypatch.setattr(results, "require_admin_context", require_context)

    payload = await results.get_event_raffle_entries("event-1", SimpleNamespace())

    assert payload["entries"] == ["event@example.com"]
    assert ("in", "survey_id", ["survey-1"]) in fake.calls
    assert ("eq", "event_code", "event-1") in fake.calls
