import random
import string

from fastapi import APIRouter, HTTPException

from api.dependencies import supabase
from api.models import ShareLinkCreate

router = APIRouter()


@router.post("/api/surveys/{survey_id}/share-links")
async def create_share_link(survey_id: str, body: ShareLinkCreate):
    """Generate a unique share link code for a survey."""
    try:
        code = "".join(random.choices(string.ascii_letters + string.digits, k=7))
        row = {"survey_id": survey_id, "code": code, "label": body.label or None}
        res = supabase.table("share_links").insert(row).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/surveys/{survey_id}/share-links")
async def get_share_links(survey_id: str):
    """Get all share links for a survey with their response counts."""
    try:
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/share-links/{link_id}")
async def delete_share_link(link_id: str):
    """Delete a share link."""
    try:
        supabase.table("share_links").delete().eq("id", link_id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))