import os

os.environ.setdefault("SUPABASE_URL", "http://127.0.0.1:54321")
os.environ.setdefault("SUPABASE_KEY", "test-key")

import pytest
from fastapi import HTTPException

from api import dependencies
from api.dependencies import (
    AdminContext,
    AdminUser,
    TeamMembership,
    require_admin_only,
    require_survey_team_access,
)


class _SurveyQuery:
    def __init__(self, rows):
        self.rows = rows

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def execute(self):
        return type("Response", (), {"data": self.rows})()


class _SupabaseStub:
    def __init__(self, rows):
        self.rows = rows

    def table(self, _name):
        return _SurveyQuery(self.rows)


def _ctx(is_admin, teams=()):
    return AdminContext(
        user=AdminUser(id="u1", email="u@thecyc.org"),
        teams=list(teams),
        is_admin=is_admin,
    )


def test_admin_bypasses_survey_team_access(monkeypatch):
    # Survey belongs to a team the admin is not a member of.
    monkeypatch.setattr(
        dependencies, "supabase", _SupabaseStub([{"id": "s1", "team_id": "team-x"}])
    )
    survey = require_survey_team_access("s1", _ctx(is_admin=True))
    assert survey["id"] == "s1"


def test_student_without_membership_is_denied(monkeypatch):
    monkeypatch.setattr(
        dependencies, "supabase", _SupabaseStub([{"id": "s1", "team_id": "team-x"}])
    )
    ctx = _ctx(is_admin=False, teams=[TeamMembership("team-y", "Other", "team_member")])
    with pytest.raises(HTTPException) as exc:
        require_survey_team_access("s1", ctx)
    assert exc.value.status_code == 404


def test_require_admin_only_allows_admin_and_blocks_students():
    require_admin_only(_ctx(is_admin=True))  # should not raise
    with pytest.raises(HTTPException) as exc:
        require_admin_only(_ctx(is_admin=False))
    assert exc.value.status_code == 403
