import random

from fastapi import APIRouter, HTTPException, Request

from api.dependencies import (
    AdminContext,
    require_admin_context,
    require_survey_team_access,
    supabase,
)
from api.utils.postal_geo import build_postal_geo_stats
from api.utils.survey_utils import (
    calculate_median,
    calculate_mode,
    calculate_quartiles,
    calculate_std_dev,
    find_outliers,
)

router = APIRouter()


def _require_team_leader(context: AdminContext) -> str:
    team = context.default_team
    if team.role != "team_leader":
        raise HTTPException(status_code=403, detail="Team leader permission required")
    return team.team_id


def _team_survey_ids(team_id: str) -> list[str]:
    response = supabase.table("surveys").select("id").eq("team_id", team_id).execute()
    return [row["id"] for row in response.data or [] if row.get("id")]


def _raffle_survey_ids(context: AdminContext) -> list[str]:
    """Return the survey scope the current raffle administrator may draw from."""
    if getattr(context, "is_admin", False):
        response = supabase.table("surveys").select("id").execute()
        return [row["id"] for row in response.data or [] if row.get("id")]
    return _team_survey_ids(_require_team_leader(context))


def _fetch_all_raffle_rows(
    table: str,
    columns: str,
    survey_ids: list[str],
    *,
    event_code: str | None = None,
) -> list[dict]:
    if not survey_ids:
        return []

    page_size = 1000
    offset = 0
    rows: list[dict] = []
    while True:
        query = supabase.table(table).select(columns).in_("survey_id", survey_ids)
        if event_code:
            query = query.eq("event_code", event_code)
        response = query.range(offset, offset + page_size - 1).execute()
        data = response.data or []
        rows.extend(data)
        if len(data) < page_size:
            break
        offset += page_size
    return rows


def _raffle_emails(context: AdminContext) -> list[str]:
    rows = _fetch_all_raffle_rows("raffle_entries", "email", _raffle_survey_ids(context))
    return [row["email"] for row in rows if row.get("email")]


@router.get("/api/admin/raffle-email")
async def get_raffle_email(request: Request):
    """
    Returns a list of randomly selected email from the raffle_entries table for raffle purposes.
    Handles any exceptions that may occur during the database query.
    """
    try:
        context = await require_admin_context(request)
        emails = _raffle_emails(context)
        if not emails:
            raise HTTPException(status_code=404, detail="No raffle entries found")
        return {"emails": random.sample(emails, min(9, len(emails)))}
    except HTTPException:
        raise
    except Exception as e:
        raise Exception(f"Failed to select raffle email: {e}")


@router.get("/api/admin/raffle-entries")
async def get_raffle_entries(request: Request):
    """Return the current team raffle's weighted email ticket pool."""
    try:
        context = await require_admin_context(request)
        emails = _raffle_emails(context)
        return {
            "entries": emails,
            "count": len(emails),
            "participants": len(set(emails)),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/admin/event-raffle-entries")
async def get_event_raffle_entries(event_code: str, request: Request):
    """
    Return the tickets for a single in-person event raffle.

    This pool is fed ONLY by survey completions that came through an event QR
    code (carrying ?event=<code>), and is completely separate from the general
    `raffle_entries` table. Each person gets one ticket per survey completed, so
    `entries` contains one item per ticket (emails repeat) and the wheel can
    draw a winner weighted by how many surveys each person did.
    """
    try:
        context = await require_admin_context(request)
        rows = _fetch_all_raffle_rows(
            "event_raffle_entries",
            "email",
            _raffle_survey_ids(context),
            event_code=event_code,
        )
        emails = [r["email"] for r in rows if r.get("email")]
        return {
            "entries": emails,
            "count": len(emails),
            "participants": len(set(emails)),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/admin/event-codes")
async def get_event_codes(request: Request):
    """List existing event codes with their participant counts (newest first)."""
    try:
        context = await require_admin_context(request)
        rows = _fetch_all_raffle_rows(
            "event_raffle_entries",
            "event_code, email, created_at",
            _raffle_survey_ids(context),
        )
        events: dict[str, dict] = {}
        for r in rows:
            code = r.get("event_code")
            if not code:
                continue
            entry = events.setdefault(
                code, {"event_code": code, "emails": set(), "latest": None}
            )
            if r.get("email"):
                entry["emails"].add(r["email"])
            created = r.get("created_at")
            if created and (entry["latest"] is None or created > entry["latest"]):
                entry["latest"] = created

        result = sorted(
            (
                {
                    "event_code": e["event_code"],
                    "count": len(e["emails"]),
                    "latest": e["latest"],
                }
                for e in events.values()
            ),
            key=lambda e: e["latest"] or "",
            reverse=True,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/surveys/{survey_id}/results")
async def get_survey_results(survey_id: str, request: Request):
    """Get survey metadata and basic stats (no raw answers)."""
    try:
        context = await require_admin_context(request)
        require_survey_team_access(survey_id, context)
        survey_res = supabase.table("surveys").select("*").eq("id", survey_id).execute()
        if not survey_res.data:
            raise HTTPException(status_code=404, detail="Survey not found")
        survey = survey_res.data[0]

        questions_res = (
            supabase.table("questions")
            .select("*")
            .eq("survey_id", survey_id)
            .order("order_index")
            .execute()
        )
        questions = questions_res.data

        # Get total responses efficiently
        sessions_count_res = (
            supabase.table("response_sessions")
            .select("id", count="exact")
            .eq("survey_id", survey_id)
            .execute()
        )
        total_responses = (
            sessions_count_res.count if hasattr(sessions_count_res, "count") else 0
        )

        # Get referral counts efficiently
        referrals_res = (
            supabase.table("response_sessions")
            .select("referral_source")
            .eq("survey_id", survey_id)
            .execute()
        )
        referral_counts = {}
        for row in referrals_res.data:
            ref = row.get("referral_source") or "Direct"
            referral_counts[ref] = referral_counts.get(ref, 0) + 1

        # Get language breakdown
        lang_res = (
            supabase.table("response_sessions")
            .select("language")
            .eq("survey_id", survey_id)
            .execute()
        )
        language_counts = {}
        for row in lang_res.data:
            lang = row.get("language") or "Unknown"
            language_counts[lang] = language_counts.get(lang, 0) + 1

        return {
            "survey": survey,
            "questions": questions,
            "total_responses": total_responses,
            "referral_breakdown": referral_counts,
            "language_breakdown": language_counts,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/surveys/{survey_id}/responses/paginated")
async def get_survey_responses_paginated(
    survey_id: str,
    request: Request,
    offset: int = 0,
    limit: int = 1,
    filter_failed: bool = False,
):
    """Fetch individual responses with pagination."""
    try:
        context = await require_admin_context(request)
        require_survey_team_access(survey_id, context)
        query = (
            supabase.table("response_sessions")
            .select("*")
            .eq("survey_id", survey_id)
            .order("completed_at", desc=True)
        )
        if filter_failed:
            query = query.gt("attention_check_failures", 0)

        sessions_res = query.range(offset, offset + limit - 1).execute()
        sessions = sessions_res.data

        if not sessions:
            return {"responses": [], "total": 0}

        # Get count
        count_query = (
            supabase.table("response_sessions")
            .select("id", count="exact")
            .eq("survey_id", survey_id)
        )
        if filter_failed:
            count_query = count_query.gt("attention_check_failures", 0)
        total = count_query.execute().count

        session_ids = [s["id"] for s in sessions]
        answers_res = (
            supabase.table("answers")
            .select("*")
            .in_("session_id", session_ids)
            .execute()
        )

        answers_by_session = {}
        for a in answers_res.data:
            sid = a["session_id"]
            if sid not in answers_by_session:
                answers_by_session[sid] = []
            answers_by_session[sid].append(a)

        responses = []
        for s in sessions:
            responses.append(
                {
                    "session_id": s["id"],
                    "completed_at": s.get("completed_at"),
                    "referral_source": s.get("referral_source"),
                    "language": s.get("language"),
                    "attention_check_failures": s.get("attention_check_failures", 0),
                    "weight": s.get("weight", 1.0),
                    "is_valid": s.get("is_valid", True),
                    "answers": answers_by_session.get(s["id"], []),
                }
            )

        return {"responses": responses, "total": total}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/surveys/{survey_id}/summary")
async def get_survey_summary(survey_id: str, request: Request):
    """Calculate and return aggregate summary statistics for all questions on the backend."""
    try:
        context = await require_admin_context(request)
        require_survey_team_access(survey_id, context)
        questions_res = (
            supabase.table("questions")
            .select("*")
            .eq("survey_id", survey_id)
            .order("order_index")
            .execute()
        )
        questions = questions_res.data

        sessions = []
        page_size = 10000
        start = 0
        while True:
            chunk = (
                supabase.table("response_sessions")
                .select("id, is_valid, weight")
                .eq("survey_id", survey_id)
                .range(start, start + page_size - 1)
                .execute()
                .data
            )
            if not chunk:
                break
            sessions.extend(chunk)
            if len(chunk) < page_size:
                break
            start += page_size

        valid_sessions = {
            s["id"]: s.get("weight", 1.0)
            for s in sessions
            if s.get("is_valid") is not False
        }

        all_answers = []
        start = 0
        while True:
            chunk = (
                supabase.table("answers")
                .select("*, response_sessions!inner(survey_id)")
                .eq("response_sessions.survey_id", survey_id)
                .range(start, start + page_size - 1)
                .execute()
                .data
            )
            if not chunk:
                break
            all_answers.extend(chunk)
            if len(chunk) < page_size:
                break
            start += page_size

        answers_by_question = {}
        for a in all_answers:
            sid = a["session_id"]
            if sid in valid_sessions:
                qid = a["question_id"]
                if qid not in answers_by_question:
                    answers_by_question[qid] = []
                a["weight"] = valid_sessions[sid]
                answers_by_question[qid].append(a)

        stats = {}
        for q in questions:
            qid = q["id"]
            q_type = q["type"]
            ans = answers_by_question.get(qid, [])

            if q_type in ["multiple_choice", "dropdown"]:
                counts = {}
                for a in ans:
                    if a.get("answer_text"):
                        txt = a["answer_text"]
                        counts[txt] = counts.get(txt, 0) + 1
                modes = calculate_mode(counts)
                max_count = max(counts.values()) if counts else 0
                mode_data = {"modes": modes, "count": max_count}
                stats[qid] = {
                    "counts": counts,
                    "sample_size": len(ans),
                    "mode_data": mode_data,
                }
            elif q_type == "checkboxes":
                counts = {}
                total_weighted = 0
                for a in ans:
                    total_weighted += a.get("weight", 1.0)
                    opts = a.get("answer_options")
                    if opts:
                        for o in opts:
                            counts[o] = counts.get(o, 0) + a.get("weight", 1.0)
                modes = calculate_mode(counts)
                max_count = max(counts.values()) if counts else 0
                mode_data = {"modes": modes, "count": max_count}
                stats[qid] = {
                    "counts": counts,
                    "total_weighted": total_weighted,
                    "sample_size": len(ans),
                    "mode_data": mode_data,
                }
            elif q_type == "rating_scale":
                nums_weights = [
                    (a["answer_numeric"], a.get("weight", 1.0))
                    for a in ans
                    if a.get("answer_numeric") is not None
                ]
                nums = [x[0] for x in nums_weights]
                total_w = sum(x[1] for x in nums_weights)
                mean = (
                    sum(x[0] * x[1] for x in nums_weights) / total_w
                    if total_w > 0
                    else 0
                )
                avg = round(mean, 1) if nums else None
                median = calculate_median(nums)
                std_dev = calculate_std_dev(nums, mean)
                variance = std_dev**2
                q1, q2, q3 = calculate_quartiles(nums)
                iqr = q3 - q1
                outliers = find_outliers(nums, q1, q3, iqr)

                stats[qid] = {
                    "sample_size": len(nums),
                    "avg": avg,
                    "median": median,
                    "std_dev": std_dev,
                    "variance": variance,
                    "min": min(nums) if nums else 0,
                    "max": max(nums) if nums else 0,
                    "quartiles": {"q1": q1, "q2": q2, "q3": q3, "iqr": iqr},
                    "outliers": outliers,
                }
            elif q_type == "likert_scale":
                counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
                for a in ans:
                    val = a.get("answer_numeric")
                    if val is not None and val in counts:
                        counts[val] += 1
                nums = [
                    a.get("answer_numeric")
                    for a in ans
                    if a.get("answer_numeric") is not None
                ]
                mean = sum(nums) / len(nums) if nums else 0
                avg = round(mean, 1) if nums else None
                median = round(calculate_median(nums)) if nums else 0
                std_dev = calculate_std_dev(nums, mean)
                modes = calculate_mode(counts)
                max_count = max(counts.values()) if counts else 0
                mode_data = {"modes": modes, "count": max_count}

                stats[qid] = {
                    "counts": counts,
                    "sample_size": len(nums),
                    "avg": avg,
                    "median": median,
                    "std_dev": std_dev,
                    "mode_data": mode_data,
                }
            elif q_type == "short_answer":
                texts = [a.get("answer_text") for a in ans if a.get("answer_text")]
                opts = q.get("options")
                validation = opts.get("validation") if isinstance(opts, dict) else None
                is_postal_prefix = (
                    isinstance(validation, dict)
                    and validation.get("type") == "postal_code_prefix"
                )
                stats[qid] = {
                    "texts": [] if is_postal_prefix else texts[:100],
                    "sample_size": len(texts),
                }
                if is_postal_prefix:
                    stats[qid]["postal_geo"] = build_postal_geo_stats(qid, ans)
            elif q_type == "ranking":
                sums = {}
                counts = {}
                total_weighted = 0
                for a in ans:
                    opts = a.get("answer_options")
                    weight = a.get("weight", 1.0)
                    if opts and isinstance(opts, list):
                        total_weighted += weight
                        for i, opt in enumerate(opts):
                            sums[opt] = sums.get(opt, 0) + (i + 1) * weight
                            counts[opt] = counts.get(opt, 0) + weight
                avg_ranks = {}
                for opt, s in sums.items():
                    if counts[opt] > 0:
                        avg_ranks[opt] = round(s / counts[opt], 2)
                stats[qid] = {
                    "avg_ranks": avg_ranks,
                    "sample_size": len(ans),
                    "total_weighted": total_weighted,
                }

        return stats
    except HTTPException:
        raise
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/surveys/{survey_id}/responses")
async def delete_all_responses(survey_id: str, request: Request):
    """Delete all response sessions and their answers for a survey."""
    try:
        context = await require_admin_context(request)
        require_survey_team_access(survey_id, context)
        # Cascade: deleting sessions will auto-delete answers via ON DELETE CASCADE
        supabase.table("response_sessions").delete().eq(
            "survey_id", survey_id
        ).execute()
        return {"success": True, "message": "All responses deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/responses/{session_id}")
async def delete_single_response(session_id: str, request: Request):
    """Delete a single response session and its answers."""
    try:
        context = await require_admin_context(request)
        session_res = (
            supabase.table("response_sessions")
            .select("survey_id")
            .eq("id", session_id)
            .execute()
        )
        if not session_res.data:
            raise HTTPException(status_code=404, detail="Response not found")
        require_survey_team_access(session_res.data[0]["survey_id"], context)
        supabase.table("response_sessions").delete().eq("id", session_id).execute()
        return {"success": True, "message": "Response deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
