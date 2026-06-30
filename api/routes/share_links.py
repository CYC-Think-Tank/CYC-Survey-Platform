import random
import string

from fastapi import APIRouter, HTTPException, Request

from api.dependencies import require_admin_context, require_survey_team_access, supabase
from api.models import ShareLinkCreate

router = APIRouter()


@router.post("/api/surveys/{survey_id}/share-links")
async def create_share_link(survey_id: str, body: ShareLinkCreate, request: Request):
    """Generate a unique share link code for a survey."""
    try:
        context = await require_admin_context(request)
        require_survey_team_access(survey_id, context)
        code = "".join(random.choices(string.ascii_letters + string.digits, k=7))
        row = {"survey_id": survey_id, "code": code, "label": body.label or None}
        res = supabase.table("share_links").insert(row).execute()
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/surveys/{survey_id}/share-links")
async def get_share_links(survey_id: str, request: Request):
    """Get all share links for a survey with their response counts."""
    try:
        context = await require_admin_context(request)
        require_survey_team_access(survey_id, context)
        links_res = (
            supabase.table("share_links")
            .select("*")
            .eq("survey_id", survey_id)
            .order("created_at", desc=True)
            .execute()
        )
        links = links_res.data

        if not links:
            return []

        # Get response counts per referral_source code
        codes = [link["code"] for link in links]
        sessions_res = (
            supabase.table("response_sessions")
            .select("referral_source")
            .eq("survey_id", survey_id)
            .in_("referral_source", codes)
            .execute()
        )

        counts = {}
        for s in sessions_res.data:
            ref = s.get("referral_source")
            if ref:
                counts[ref] = counts.get(ref, 0) + 1

        for link in links:
            link["response_count"] = counts.get(link["code"], 0)

        return links
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/global-share-links")
async def create_global_share_link(body: ShareLinkCreate, request: Request):
    """Generate a unique global share link code."""
    try:
        await require_admin_context(request)
        code = "".join(random.choices(string.ascii_letters + string.digits, k=7))
        row = {"survey_id": None, "code": code, "label": body.label or None}
        res = supabase.table("share_links").insert(row).execute()
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/global-share-links")
async def get_global_share_links(request: Request):
    """Get all global share links with their response counts."""
    try:
        await require_admin_context(request)
        links_res = (
            supabase.table("share_links")
            .select("*")
            .is_("survey_id", "null")
            .order("created_at", desc=True)
            .execute()
        )
        links = links_res.data

        if not links:
            return []

        # Get response counts per referral_source code
        codes = [link["code"] for link in links]
        sessions_res = (
            supabase.table("response_sessions")
            .select("referral_source")
            .in_("referral_source", codes)
            .execute()
        )

        counts = {}
        for s in sessions_res.data:
            ref = s.get("referral_source")
            if ref:
                counts[ref] = counts.get(ref, 0) + 1

        for link in links:
            link["response_count"] = counts.get(link["code"], 0)

        return links
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/share-links/{link_id}")
async def delete_share_link(link_id: str, request: Request):
    """Delete a share link."""
    try:
        context = await require_admin_context(request)
        link_res = (
            supabase.table("share_links")
            .select("survey_id")
            .eq("id", link_id)
            .execute()
        )
        if not link_res.data:
            raise HTTPException(status_code=404, detail="Share link not found")
        survey_id = link_res.data[0].get("survey_id")
        if survey_id:
            require_survey_team_access(survey_id, context)
        supabase.table("share_links").delete().eq("id", link_id).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/user/referral-link")
async def get_or_create_referral_link(email: str):
    """Get or generate a unique global share link code for a user email."""
    try:
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")

        # Check if one already exists
        existing = (
            supabase.table("share_links")
            .select("*")
            .eq("email", email)
            .is_("survey_id", "null")
            .execute()
        )
        if existing.data:
            return existing.data[0]

        # Generate new one
        code = "".join(random.choices(string.ascii_letters + string.digits, k=7))
        row = {
            "survey_id": None,
            "code": code,
            "label": "User Referral",
            "email": email,
        }
        res = supabase.table("share_links").insert(row).execute()
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/admin/referrals/leaderboard")
async def get_referral_leaderboard(request: Request):
    """Get a leaderboard of users who referred the most people."""
    try:
        await require_admin_context(request)
        # Fetch raffle entries that are referrals
        res = (
            supabase.table("raffle_entries")
            .select("email")
            .eq("is_referral", True)
            .execute()
        )

        counts = {}
        for entry in res.data:
            email = entry.get("email")
            if email:
                counts[email] = counts.get(email, 0) + 1

        # Format and sort
        leaderboard = [
            {"email": email, "referral_count": count} for email, count in counts.items()
        ]
        leaderboard.sort(key=lambda x: x["referral_count"], reverse=True)

        return leaderboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- AI ANALYSIS SUITE ---
