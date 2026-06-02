import random

from fastapi import APIRouter, HTTPException

from api.dependencies import supabase
from api.utils.survey_utils import (
    calculate_median,
    calculate_mode,
    calculate_quartiles,
    calculate_std_dev,
    find_outliers,
)

router = APIRouter()


async def _get_random_email_position(num_emails: int = 5) -> list:
    """
    Returns a randomly generated list of integers `x` such that 0 <= x <= length of collection of emails
    without replacement.

    Raises an exception if the collection of emails is empty or if any error occurs during the
    retrieval of total number of emails from the database.
    """
    try:
        # Queries the database to get the total count of emails in the response_sessions table
        count_res = (
            supabase.table("response_sessions").select("id", count="exact").execute()
        )
        total_emails = getattr(count_res, "count", None)
        if total_emails is None:
            total_emails = len(count_res.data) if count_res.data else 0

        if total_emails == 0:
            raise ValueError(
                "No emails found in response_sessions for raffle selection."
            )

        return random.sample(range(total_emails), num_emails)
    #    return random.randint(0, total_emails - 1)
    except Exception as e:
        raise Exception(f"Failed to determine raffle position: {e}")


@router.get("/api/admin/raffle-email")
async def get_raffle_email():
    """
    Returns a list of randomly selected email from the response_sessions table for raffle purposes.
    Handles any exceptions that may occur during the database query.
    """
    try:
        positions = await _get_random_email_position()
        emails = []
        for position in positions:
            response = (
                supabase.table("response_sessions")
                .select("email")
                .order("id")
                .range(position, position)
                .execute()
            )
            if not response.data or not response.data[0]:
                raise ValueError("No email row returned for raffle selection.")

            email = response.data[0].get("email")
            if not email:
                raise ValueError("Selected raffle row does not contain an email.")

            emails.append(email)

        return {"emails": emails}
    except Exception as e:
        raise Exception(f"Failed to select raffle email: {e}")


@router.get("/api/surveys/{survey_id}/results")
async def get_survey_results(survey_id: str):
    """Get survey metadata and basic stats (no raw answers)."""
    try:
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
    survey_id: str, offset: int = 0, limit: int = 1, filter_failed: bool = False
):
    """Fetch individual responses with pagination."""
    try:
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/surveys/{survey_id}/summary")
async def get_survey_summary(survey_id: str):
    """Calculate and return aggregate summary statistics for all questions on the backend."""
    try:
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
                stats[qid] = {"texts": texts[:100]}
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
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/surveys/{survey_id}/responses")
async def delete_all_responses(survey_id: str):
    """Delete all response sessions and their answers for a survey."""
    try:
        # Cascade: deleting sessions will auto-delete answers via ON DELETE CASCADE
        supabase.table("response_sessions").delete().eq(
            "survey_id", survey_id
        ).execute()
        return {"success": True, "message": "All responses deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/responses/{session_id}")
async def delete_single_response(session_id: str):
    """Delete a single response session and its answers."""
    try:
        supabase.table("response_sessions").delete().eq("id", session_id).execute()
        return {"success": True, "message": "Response deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
