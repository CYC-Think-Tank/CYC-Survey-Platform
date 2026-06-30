from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from api.dependencies import require_admin_context, supabase

router = APIRouter()


class TeamJoinRequestCreate(BaseModel):
    team_id: str


class TeamBootstrapCreate(BaseModel):
    name: str


@router.get("/api/admin/me")
async def get_admin_me(request: Request):
    context = await require_admin_context(request, require_team=False)
    pending_res = (
        supabase.table("team_join_requests")
        .select("id, team_id, status, requested_at, teams(name)")
        .eq("user_id", context.user.id)
        .eq("status", "pending")
        .execute()
    )
    return {
        "user": {"id": context.user.id, "email": context.user.email},
        "teams": [
            {"id": team.team_id, "name": team.team_name, "role": team.role}
            for team in context.teams
        ],
        "pending_requests": pending_res.data or [],
    }


@router.get("/api/admin/teams")
async def list_admin_teams(request: Request):
    await require_admin_context(request, require_team=False)
    res = supabase.table("teams").select("id, name").order("name").execute()
    return res.data or []


@router.post("/api/admin/teams/bootstrap")
async def bootstrap_first_team(body: TeamBootstrapCreate, request: Request):
    context = await require_admin_context(request, require_team=False)
    team_name = body.name.strip()
    if not team_name:
        raise HTTPException(status_code=400, detail="Team name is required")

    existing_res = supabase.table("teams").select("id").limit(1).execute()
    if existing_res.data:
        raise HTTPException(
            status_code=409,
            detail="A team already exists. Request access to an existing team.",
        )

    team_res = (
        supabase.table("teams")
        .insert({"name": team_name, "created_by": context.user.id})
        .execute()
    )
    if not team_res.data:
        raise HTTPException(status_code=500, detail="Failed to create team")

    team = team_res.data[0]
    supabase.table("team_members").insert(
        {
            "team_id": team["id"],
            "user_id": context.user.id,
            "role": "team_leader",
        }
    ).execute()

    return {"team": team, "role": "team_leader"}


@router.post("/api/admin/team-join-requests")
async def create_team_join_request(body: TeamJoinRequestCreate, request: Request):
    context = await require_admin_context(request, require_team=False)
    if any(team.team_id == body.team_id for team in context.teams):
        raise HTTPException(status_code=400, detail="Already a member of this team")

    res = (
        supabase.table("team_join_requests")
        .upsert(
            {
                "team_id": body.team_id,
                "user_id": context.user.id,
                "status": "pending",
                "resolved_at": None,
                "resolved_by": None,
            },
            on_conflict="team_id,user_id,status",
        )
        .execute()
    )
    return res.data[0] if res.data else {"success": True}


@router.get("/api/admin/team-join-requests")
async def list_team_join_requests(request: Request):
    context = await require_admin_context(request)
    leader_team_ids = [
        team.team_id for team in context.teams if team.role == "team_leader"
    ]
    if not leader_team_ids:
        raise HTTPException(status_code=403, detail="Team leader permission required")

    res = (
        supabase.table("team_join_requests")
        .select("id, team_id, user_id, status, requested_at")
        .in_("team_id", leader_team_ids)
        .eq("status", "pending")
        .order("requested_at")
        .execute()
    )
    requests = res.data or []
    user_ids = list({row["user_id"] for row in requests if row.get("user_id")})
    team_ids = list({row["team_id"] for row in requests if row.get("team_id")})

    profiles_by_id = {}
    if user_ids:
        profiles_res = (
            supabase.table("profiles").select("id, email").in_("id", user_ids).execute()
        )
        profiles_by_id = {row["id"]: row for row in profiles_res.data or []}

    teams_by_id = {}
    if team_ids:
        teams_res = supabase.table("teams").select("id, name").in_("id", team_ids).execute()
        teams_by_id = {row["id"]: row for row in teams_res.data or []}

    return [
        {
            "id": row["id"],
            "team_id": row["team_id"],
            "team_name": teams_by_id.get(row["team_id"], {}).get("name"),
            "user_id": row["user_id"],
            "user_email": profiles_by_id.get(row["user_id"], {}).get("email"),
            "status": row["status"],
            "requested_at": row.get("requested_at"),
        }
        for row in requests
    ]


@router.post("/api/admin/team-join-requests/{request_id}/approve")
async def approve_team_join_request(request_id: str, request: Request):
    context = await require_admin_context(request)
    join_res = (
        supabase.table("team_join_requests")
        .select("id, team_id, user_id, status")
        .eq("id", request_id)
        .execute()
    )
    if not join_res.data:
        raise HTTPException(status_code=404, detail="Join request not found")
    join_request = join_res.data[0]
    if not context.is_team_leader(join_request["team_id"]):
        raise HTTPException(status_code=403, detail="Team leader permission required")

    supabase.table("team_members").upsert(
        {
            "team_id": join_request["team_id"],
            "user_id": join_request["user_id"],
            "role": "team_member",
        },
        on_conflict="team_id,user_id",
    ).execute()
    supabase.table("team_join_requests").update(
        {
            "status": "approved",
            "resolved_at": datetime.utcnow().isoformat(),
            "resolved_by": context.user.id,
        }
    ).eq("id", request_id).execute()
    return {"success": True}


@router.post("/api/admin/team-join-requests/{request_id}/reject")
async def reject_team_join_request(request_id: str, request: Request):
    context = await require_admin_context(request)
    join_res = (
        supabase.table("team_join_requests")
        .select("id, team_id")
        .eq("id", request_id)
        .execute()
    )
    if not join_res.data:
        raise HTTPException(status_code=404, detail="Join request not found")
    if not context.is_team_leader(join_res.data[0]["team_id"]):
        raise HTTPException(status_code=403, detail="Team leader permission required")

    supabase.table("team_join_requests").update(
        {
            "status": "rejected",
            "resolved_at": datetime.utcnow().isoformat(),
            "resolved_by": context.user.id,
        }
    ).eq("id", request_id).execute()
    return {"success": True}
