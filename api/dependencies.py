import os
from dataclasses import dataclass
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException, Request

from supabase import Client, create_client

load_dotenv(dotenv_path=".env.local")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
)
ALLOWED_ADMIN_EMAIL_DOMAIN = (
    (os.environ.get("ALLOWED_ADMIN_EMAIL_DOMAIN") or "").strip().lstrip("@").lower()
)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


@dataclass
class AdminUser:
    id: str
    email: str


@dataclass
class TeamMembership:
    team_id: str
    team_name: str | None
    role: str


@dataclass
class AdminContext:
    user: AdminUser
    teams: list[TeamMembership]

    @property
    def default_team(self) -> TeamMembership:
        return self.teams[0]

    def team_ids(self) -> list[str]:
        return [team.team_id for team in self.teams]

    def role_for_team(self, team_id: str) -> str | None:
        for team in self.teams:
            if team.team_id == team_id:
                return team.role
        return None

    def is_team_member(self, team_id: str) -> bool:
        return self.role_for_team(team_id) is not None

    def is_team_leader(self, team_id: str) -> bool:
        return self.role_for_team(team_id) == "team_leader"


def _bearer_token(request: Request) -> str:
    auth_header = request.headers.get("authorization") or ""
    scheme, _, token = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Missing Supabase access token")
    return token


def is_allowed_admin_email(email: str) -> bool:
    if not ALLOWED_ADMIN_EMAIL_DOMAIN:
        return False
    domain = email.lower().split("@")[-1] if "@" in email else ""
    return domain == ALLOWED_ADMIN_EMAIL_DOMAIN


async def get_admin_user(request: Request) -> AdminUser:
    token = _bearer_token(request)
    api_key = SUPABASE_ANON_KEY or SUPABASE_KEY
    if not SUPABASE_URL or not api_key:
        raise HTTPException(status_code=500, detail="Supabase auth is not configured")
    if not ALLOWED_ADMIN_EMAIL_DOMAIN:
        raise HTTPException(
            status_code=500, detail="Admin email domain is not configured"
        )

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{SUPABASE_URL.rstrip('/')}/auth/v1/user",
            headers={"apikey": api_key, "Authorization": f"Bearer {token}"},
        )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Supabase session")

    payload: dict[str, Any] = response.json()
    user_id = payload.get("id")
    email = payload.get("email")
    if not user_id or not email:
        raise HTTPException(status_code=401, detail="Invalid Supabase user")

    if not is_allowed_admin_email(email):
        raise HTTPException(status_code=403, detail="Email domain is not authorized")

    return AdminUser(id=user_id, email=email)


def ensure_profile(user: AdminUser) -> None:
    supabase.table("profiles").upsert(
        {"id": user.id, "email": user.email}, on_conflict="id"
    ).execute()


def get_team_memberships(user_id: str) -> list[TeamMembership]:
    response = (
        supabase.table("team_members")
        .select("team_id, role, teams(name)")
        .eq("user_id", user_id)
        .order("created_at")
        .execute()
    )
    memberships: list[TeamMembership] = []
    for row in response.data or []:
        team = row.get("teams") if isinstance(row.get("teams"), dict) else {}
        memberships.append(
            TeamMembership(
                team_id=row["team_id"],
                team_name=team.get("name"),
                role=row.get("role", "team_member"),
            )
        )
    return memberships


async def require_admin_context(
    request: Request, *, require_team: bool = True
) -> AdminContext:
    user = await get_admin_user(request)
    ensure_profile(user)
    teams = get_team_memberships(user.id)
    if len(teams) > 1:
        raise HTTPException(
            status_code=409, detail="Account belongs to more than one team"
        )
    if require_team and not teams:
        raise HTTPException(status_code=403, detail="No team assignment")
    return AdminContext(user=user, teams=teams)


def require_survey_team_access(
    survey_id: str, context: AdminContext, *, leader_required: bool = False
) -> dict:
    survey_res = (
        supabase.table("surveys").select("id, team_id").eq("id", survey_id).execute()
    )
    if not survey_res.data:
        raise HTTPException(status_code=404, detail="Survey not found")
    survey = survey_res.data[0]
    team_id = survey.get("team_id")
    if not team_id or not context.is_team_member(team_id):
        raise HTTPException(status_code=404, detail="Survey not found")
    if leader_required and not context.is_team_leader(team_id):
        raise HTTPException(status_code=403, detail="Team leader permission required")
    return survey
