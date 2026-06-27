import re
import traceback
from datetime import datetime

from fastapi import APIRouter, HTTPException

from api.dependencies import supabase
from api.models import (
    AnswerUpsert,
    CheckStatusRequest,
    EventRaffleEnter,
    ResponseSubmission,
    SessionCreate,
)

router = APIRouter()


def _sync_event_raffle_entries(event_code: str, email: str) -> int:
    """
    Give `email` one event raffle ticket per DISTINCT survey they have
    completed. Idempotent: re-running never creates duplicate tickets (the
    table is unique on event_code,email,survey_id). Returns the number of
    surveys (tickets) the person has.
    """
    sessions = (
        supabase.table("response_sessions")
        .select("survey_id")
        .eq("email", email)
        .eq("is_completed", True)
        .execute()
    )
    survey_ids = {s["survey_id"] for s in (sessions.data or []) if s.get("survey_id")}
    if not survey_ids:
        return 0
    rows = [
        {"event_code": event_code, "email": email, "survey_id": sid}
        for sid in survey_ids
    ]
    supabase.table("event_raffle_entries").upsert(
        rows, on_conflict="event_code,email,survey_id"
    ).execute()
    return len(rows)


@router.post("/api/event-raffle/enter")
async def enter_event_raffle(body: EventRaffleEnter):
    """
    Add an email to an event raffle pool, with one ticket per survey completed.

    Used when a respondent who has ALREADY completed a survey scans the event
    QR code: they cannot re-submit, but they should still be entered into the
    in-person draw. Gated by the event_code, which only lives inside the QR.
    """
    try:
        if not body.event_code or not body.email:
            raise HTTPException(
                status_code=400, detail="email and event_code are required"
            )

        # The raffle is only for people who actually completed a survey, so the
        # public entry path cannot be used to add random emails.
        tickets = _sync_event_raffle_entries(body.event_code, body.email)
        if tickets == 0:
            raise HTTPException(
                status_code=403,
                detail="Complete a survey before entering the raffle.",
            )
        return {"status": "entered", "tickets": tickets}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/surveys/{survey_id}/check-status")
async def check_survey_status(survey_id: str, body: CheckStatusRequest):
    """Check if the given email has already submitted the survey."""
    try:
        existing = (
            supabase.table("response_sessions")
            .select("id")
            .eq("survey_id", survey_id)
            .eq("email", body.email)
            .eq("is_completed", True)
            .execute()
        )
        return {"has_submitted": bool(existing.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/user/profile-data")
async def get_user_profile_data(email: str):
    """Fetch past answers for an email to populate conditional fields."""
    try:
        sessions = (
            supabase.table("response_sessions")
            .select("id")
            .eq("email", email)
            .eq("is_completed", True)
            .execute()
        )
        if not sessions.data:
            return {}

        session_ids = [s["id"] for s in sessions.data]

        # Get answers joined with question text
        answers = (
            supabase.table("answers")
            .select("*, questions(question_text)")
            .in_("session_id", session_ids)
            .execute()
        )

        profile_data = {}
        for ans in answers.data:
            q_info = ans.get("questions")
            if q_info and isinstance(q_info, dict):
                q_text = q_info.get("question_text")
                if q_text:
                    profile_data[q_text] = {
                        "answer_text": ans.get("answer_text"),
                        "answer_numeric": ans.get("answer_numeric"),
                        "answer_options": ans.get("answer_options"),
                    }

        return profile_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/surveys/{survey_id}/sessions")
async def create_session(survey_id: str, body: SessionCreate):
    """Create a new partial response session when user enters their email."""
    try:
        # Check if there's already an incomplete session for this email + survey
        existing = (
            supabase.table("response_sessions")
            .select("id", "current_step")
            .eq("survey_id", survey_id)
            .eq("email", body.email)
            .eq("is_completed", False)
            .execute()
        )

        if existing.data:
            # Return existing session for resume
            session = existing.data[0]
            # Fetch saved answers
            answers_res = (
                supabase.table("answers")
                .select("*")
                .eq("session_id", session["id"])
                .execute()
            )
            return {
                "session_id": session["id"],
                "current_step": session.get("current_step", 0),
                "saved_answers": answers_res.data,
                "resumed": True,
            }

        session_data = {
            "survey_id": survey_id,
            "email": body.email,
            "is_completed": False,
            "current_step": 0,
        }
        if body.referral_source:
            session_data["referral_source"] = body.referral_source
        session_res = supabase.table("response_sessions").insert(session_data).execute()

        return {
            "session_id": session_res.data[0]["id"],
            "current_step": 0,
            "saved_answers": [],
            "resumed": False,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/sessions/{session_id}/answers")
async def upsert_answer(session_id: str, body: AnswerUpsert):
    """Save or update a single answer for a session (auto-save on Next)."""
    try:
        q_res = (
            supabase.table("questions")
            .select("options, is_required")
            .eq("id", body.question_id)
            .execute()
        )
        if q_res.data:
            q = q_res.data[0]
            opts = q.get("options")
            if isinstance(opts, dict):
                validation = opts.get("validation")
                if (
                    validation
                    and isinstance(validation, dict)
                    and validation.get("type") != "none"
                ):
                    val = body.answer_text
                    max_len = validation.get("max_length")
                    regex_str = validation.get("regex")
                    normalize_upper = validation.get("normalize_uppercase")

                    if val and normalize_upper:
                        val = val.upper()
                        body.answer_text = val

                    if val and max_len and len(val) > max_len:
                        raise HTTPException(
                            status_code=422,
                            detail=f"Answer exceeds maximum length of {max_len}",
                        )

                    if val and regex_str:
                        if not re.match(regex_str, val):
                            raise HTTPException(
                                status_code=422,
                                detail=f"Answer must match pattern: {regex_str}",
                            )

        answer_data = {
            "session_id": session_id,
            "question_id": body.question_id,
            "answer_text": body.answer_text,
            "answer_numeric": body.answer_numeric,
            "answer_options": body.answer_options,
        }
        if body.time_spent is not None:
            answer_data["time_spent"] = body.time_spent
        try:
            supabase.table("answers").upsert(
                answer_data, on_conflict="session_id,question_id"
            ).execute()
        except Exception as insert_err:
            err_str = str(insert_err).lower()
            if "time_spent" in err_str and (
                "does not exist" in err_str or "column" in err_str
            ):
                print("[upsert_answer] time_spent column missing, retrying without it")
                answer_data.pop("time_spent", None)
                supabase.table("answers").upsert(
                    answer_data, on_conflict="session_id,question_id"
                ).execute()
            else:
                raise

        return {"status": "saved"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/sessions/{session_id}/step")
async def update_step(session_id: str, body: dict):
    """Update the current step for a session (for resume)."""
    try:
        supabase.table("response_sessions").update(
            {"current_step": body.get("current_step", 0)}
        ).eq("id", session_id).execute()
        return {"status": "updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/sessions/{session_id}/attention-failure")
async def report_attention_failure(session_id: str):
    """Report a failed attention check for a session."""
    try:
        session_res = (
            supabase.table("response_sessions")
            .select("attention_check_failures")
            .eq("id", session_id)
            .execute()
        )
        if not session_res.data:
            raise HTTPException(status_code=404, detail="Session not found")

        failures = session_res.data[0].get("attention_check_failures", 0)
        if failures is None:
            failures = 0
        failures += 1

        weight = 1.0
        is_valid = True

        if failures == 1:
            weight = 0.5
        elif failures >= 2:
            weight = 0.0
            is_valid = False

        supabase.table("response_sessions").update(
            {
                "attention_check_failures": failures,
                "weight": weight,
                "is_valid": is_valid,
            }
        ).eq("id", session_id).execute()

        return {
            "status": "updated",
            "failures": failures,
            "weight": weight,
            "is_valid": is_valid,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/sessions/{session_id}/complete")
async def complete_session(session_id: str):
    """Mark a session as complete."""
    try:
        supabase.table("response_sessions").update(
            {"is_completed": True, "completed_at": datetime.utcnow().isoformat()}
        ).eq("id", session_id).execute()

        # --- NEW LOGIC FOR RAFFLE ---
        try:
            # Fetch the session
            session_res = (
                supabase.table("response_sessions")
                .select("email, survey_id, referral_source")
                .eq("id", session_id)
                .execute()
            )
            if session_res.data:
                session = session_res.data[0]
                # 1. Entry for the respondent
                supabase.table("raffle_entries").insert(
                    {
                        "email": session["email"],
                        "survey_id": session["survey_id"],
                        "session_id": session_id,
                        "is_referral": False,
                    }
                ).execute()

                # 2. Check if there is a referral source
                if session.get("referral_source"):
                    share_link_res = (
                        supabase.table("share_links")
                        .select("email")
                        .eq("code", session["referral_source"])
                        .execute()
                    )
                    if share_link_res.data and share_link_res.data[0].get("email"):
                        referrer_email = share_link_res.data[0]["email"]
                        if referrer_email != session["email"]:  # Prevent self-referral
                            supabase.table("raffle_entries").insert(
                                {
                                    "email": referrer_email,
                                    "survey_id": session["survey_id"],
                                    "session_id": session_id,
                                    "is_referral": True,
                                }
                            ).execute()
        except Exception as e:
            print(f"[complete_session] Failed to add raffle entries: {e}")
        # ----------------------------

        return {"status": "completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/surveys/{survey_id}/responses")
async def submit_response(survey_id: str, submission: ResponseSubmission):
    """Legacy: Submit a full response at once (fallback)."""
    try:
        session_data = {
            "survey_id": survey_id,
            "email": submission.email,
            "is_completed": True,
            "completed_at": datetime.utcnow().isoformat(),
        }
        if submission.language:
            session_data["language"] = submission.language
        if submission.referral_source:
            session_data["referral_source"] = submission.referral_source
        session_res = supabase.table("response_sessions").insert(session_data).execute()

        session_id = session_res.data[0]["id"]

        answers_to_insert = []
        for answer in submission.answers:
            item = {
                "session_id": session_id,
                "question_id": answer.question_id,
                "answer_text": answer.answer_text,
                "answer_numeric": answer.answer_numeric,
                "answer_options": answer.answer_options,
            }
            if answer.time_spent is not None:
                item["time_spent"] = answer.time_spent
            answers_to_insert.append(item)

        if answers_to_insert:
            try:
                supabase.table("answers").insert(answers_to_insert).execute()
            except Exception as insert_err:
                err_str = str(insert_err).lower()
                # If time_spent column is missing, retry without it
                if "time_spent" in err_str and (
                    "does not exist" in err_str or "column" in err_str
                ):
                    print(
                        "[submit_response] time_spent column missing, retrying without it"
                    )
                    for item in answers_to_insert:
                        item.pop("time_spent", None)
                    supabase.table("answers").insert(answers_to_insert).execute()
                else:
                    raise

        # --- NEW LOGIC FOR RAFFLE ---
        try:
            # 1. Entry for the respondent
            supabase.table("raffle_entries").insert(
                {
                    "email": submission.email,
                    "survey_id": survey_id,
                    "session_id": session_id,
                    "is_referral": False,
                }
            ).execute()

            # 2. Check if there is a referral source
            if submission.referral_source:
                share_link_res = (
                    supabase.table("share_links")
                    .select("email")
                    .eq("code", submission.referral_source)
                    .execute()
                )
                if share_link_res.data and share_link_res.data[0].get("email"):
                    referrer_email = share_link_res.data[0]["email"]
                    if referrer_email != submission.email:  # Prevent self-referral
                        supabase.table("raffle_entries").insert(
                            {
                                "email": referrer_email,
                                "survey_id": survey_id,
                                "session_id": session_id,
                                "is_referral": True,
                            }
                        ).execute()
        except Exception as e:
            print(f"[submit_response] Failed to add raffle entries: {e}")
        # ----------------------------

        # --- EVENT RAFFLE (separate from raffle_entries) ---
        # Only completions that came in through an event QR code (carrying an
        # ?event=<code> param) are entered into the in-person spinning wheel.
        # They get one ticket per survey they have completed.
        if submission.event_code:
            try:
                _sync_event_raffle_entries(submission.event_code, submission.email)
            except Exception as e:
                print(f"[submit_response] Failed to add event raffle entries: {e}")
        # ----------------------------

        return {"status": "success", "session_id": session_id}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
