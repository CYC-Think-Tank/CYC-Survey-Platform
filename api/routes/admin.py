from fastapi import APIRouter, HTTPException, Request

from api.dependencies import require_admin_context, supabase

router = APIRouter()


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
        teams_res = (
            supabase.table("teams").select("id, name").in_("id", team_ids).execute()
        )
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
