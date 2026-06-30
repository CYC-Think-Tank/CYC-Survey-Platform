from typing import Any

from fastapi import APIRouter, HTTPException, Request

from api.dependencies import require_admin_context, supabase
from api.models import BlogPost, BlogPostCreate, BlogPostUpdate

router = APIRouter(prefix="/api/blog", tags=["blog"])


@router.get("", response_model=list[BlogPost])
async def list_blog_posts(request: Request, include_unpublished: bool = False) -> Any:
    try:
        if include_unpublished:
            await require_admin_context(request)
        query = supabase.table("blog_posts").select("*").order("created_at", desc=True)
        if not include_unpublished:
            query = query.eq("is_published", True)

        res = query.execute()
        return res.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tags", response_model=list[str])
async def list_blog_tags() -> Any:
    try:
        res = supabase.table("blog_posts").select("tags").execute()
        if not res.data:
            return []

        # tags are stored as JSON array of strings
        all_tags = set()
        for row in res.data:
            tags = row.get("tags")
            if isinstance(tags, list):
                all_tags.update(tags)

        return sorted(list(all_tags))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{post_id}", response_model=BlogPost)
async def get_blog_post(post_id: str, request: Request) -> Any:
    try:
        res = supabase.table("blog_posts").select("*").eq("id", post_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Blog post not found")
        if not res.data[0].get("is_published"):
            await require_admin_context(request)
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=BlogPost)
async def create_blog_post(post: BlogPostCreate, request: Request) -> Any:
    try:
        await require_admin_context(request)
        res = supabase.table("blog_posts").insert(post.model_dump()).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create blog post")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{post_id}", response_model=BlogPost)
async def update_blog_post(post_id: str, post: BlogPostUpdate, request: Request) -> Any:
    try:
        await require_admin_context(request)
        update_data = post.model_dump(exclude_unset=True)
        if not update_data:
            return await get_blog_post(post_id)

        res = (
            supabase.table("blog_posts").update(update_data).eq("id", post_id).execute()
        )
        if not res.data:
            raise HTTPException(
                status_code=404, detail="Blog post not found or update failed"
            )
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{post_id}")
async def delete_blog_post(post_id: str, request: Request) -> Any:
    try:
        await require_admin_context(request)
        supabase.table("blog_posts").delete().eq("id", post_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
