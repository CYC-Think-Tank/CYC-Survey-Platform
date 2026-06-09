from typing import Any

from fastapi import APIRouter, HTTPException

from api.dependencies import supabase
from api.models import BlogPost, BlogPostCreate, BlogPostUpdate

router = APIRouter(prefix="/api/blog", tags=["blog"])


@router.get("", response_model=list[BlogPost])
async def list_blog_posts(include_unpublished: bool = False) -> Any:
    try:
        query = supabase.table("blog_posts").select("*").order("created_at", desc=True)
        if not include_unpublished:
            query = query.eq("is_published", True)
            
        res = query.execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subjects", response_model=list[str])
async def list_blog_subjects() -> Any:
    try:
        res = supabase.table("blog_posts").select("subject").execute()
        if not res.data:
            return []
        subjects = list(set([row["subject"] for row in res.data if row.get("subject")]))
        return sorted(subjects)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{post_id}", response_model=BlogPost)
async def get_blog_post(post_id: str) -> Any:
    try:
        res = supabase.table("blog_posts").select("*").eq("id", post_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Blog post not found")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=BlogPost)
async def create_blog_post(post: BlogPostCreate) -> Any:
    try:
        res = supabase.table("blog_posts").insert(post.model_dump()).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create blog post")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{post_id}", response_model=BlogPost)
async def update_blog_post(post_id: str, post: BlogPostUpdate) -> Any:
    try:
        update_data = post.model_dump(exclude_unset=True)
        if not update_data:
            return await get_blog_post(post_id)
            
        res = supabase.table("blog_posts").update(update_data).eq("id", post_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Blog post not found or update failed")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{post_id}")
async def delete_blog_post(post_id: str) -> Any:
    try:
        res = supabase.table("blog_posts").delete().eq("id", post_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
