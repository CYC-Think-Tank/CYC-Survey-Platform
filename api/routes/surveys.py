import json as json_module
import traceback
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException

from api.dependencies import supabase
from api.models import SurveyCreate, SurveyDetail, SurveyList

router = APIRouter()


@router.get("/api/surveys", response_model=list[SurveyList])
async def get_surveys(include_inactive: bool = False):
    """
    Return surveys and their response counts for the survey listing UI.

    By default, only active surveys are returned. When `include_inactive` is true,
    inactive surveys are included as well. Each returned row gets a `response_count`
    derived from the joined `response_sessions` count.
    """
    try:
        query = supabase.table("surveys").select("*, response_sessions(count)")
        if not include_inactive:
            query = query.eq("is_active", True)

        response = query.execute()

        surveys = []
        for row in response.data:
            # Safely extract count from the joined response_sessions relation
            # PostgREST returns [{"count": X}] for relation counts
            count = 0
            if row.get("response_sessions"):
                try:
                    count = row["response_sessions"][0]["count"]
                except Exception:
                    # Alternative format depending on supabase python client version
                    if (
                        isinstance(row["response_sessions"], list)
                        and len(row["response_sessions"]) > 0
                    ):
                        count = len(row["response_sessions"])
                    else:
                        count = row["response_sessions"]

            row["response_count"] = count
            surveys.append(row)

        return surveys
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/surveys/{survey_id}", response_model=SurveyDetail)
async def get_survey(survey_id: str):
    """
    Return a single survey and its ordered questions.

    Used by survey editing, response viewing, and respondent-facing flows. Returns
    404 when the survey does not exist.
    """
    try:
        # Fetch survey
        survey_res = supabase.table("surveys").select("*").eq("id", survey_id).execute()
        if not survey_res.data:
            raise HTTPException(status_code=404, detail="Survey not found")

        survey = survey_res.data[0]

        # Fetch questions
        questions_res = (
            supabase.table("questions")
            .select("*")
            .eq("survey_id", survey_id)
            .order("order_index")
            .execute()
        )

        survey["questions"] = questions_res.data

        # Fetch translations from new table (gracefully skip if table doesn't exist yet)
        try:
            trans_res = (
                supabase.table("translations")
                .select("language_code, title, description, questions")
                .eq("survey_id", survey_id)
                .execute()
            )
            survey["translations"] = {}
            if trans_res.data:
                for row in trans_res.data:
                    survey["translations"][row["language_code"]] = {
                        "title": row.get("title", ""),
                        "description": row.get("description", ""),
                        "questions": row.get("questions", []),
                    }
        except Exception:
            # translations table doesn't exist yet — skip silently
            survey["translations"] = {}

        return survey
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/surveys", response_model=SurveyDetail)
async def create_survey(survey: SurveyCreate):
    """
    Create a survey and its questions, including logic gate ID remapping.

    The frontend may send temporary question IDs so conditional logic can refer to
    questions before they have database UUIDs. After inserting questions, this route
    maps temporary IDs to real UUIDs and updates any logic gate references.
    """
    try:
        has_been_published = survey.is_active

        # 1. Create Survey
        survey_res = (
            supabase.table("surveys")
            .insert(
                {
                    "title": survey.title,
                    "description": survey.description,
                    "description_alignment": survey.description_alignment,
                    "estimated_minutes": survey.estimated_minutes,
                    "is_active": survey.is_active,
                    "has_been_published": has_been_published,
                    "thumbnail_url": survey.thumbnail_url,
                }
            )
            .execute()
        )

        created_survey = survey_res.data[0]

        # 2. Create Questions
        if survey.questions:
            questions_to_insert = []
            for q in survey.questions:
                questions_to_insert.append(
                    {
                        "survey_id": created_survey["id"],
                        "question_text": q.question_text,
                        "type": q.type,
                        "order_index": q.order_index,
                        "options": q.options,
                        "is_required": q.is_required,
                        "is_conditional": q.is_conditional,
                    }
                )

            questions_res = (
                supabase.table("questions").insert(questions_to_insert).execute()
            )
            created_questions = questions_res.data

            # Build mapping from frontend temp IDs to real UUIDs
            req_sorted = sorted(survey.questions, key=lambda q: q.order_index)
            created_sorted = sorted(created_questions, key=lambda q: q["order_index"])
            temp_to_real = {}
            for req_q, created_q in zip(req_sorted, created_sorted, strict=False):
                if req_q.id:
                    temp_to_real[req_q.id] = created_q["id"]

            # Remap logic_gates question_ids from temp IDs to real UUIDs
            if temp_to_real:
                for new_q in created_questions:
                    opts = new_q.get("options")
                    if isinstance(opts, dict) and opts.get("logic_gates"):
                        remapped = False
                        for gate in opts["logic_gates"]:
                            old_id = gate.get("question_id")
                            if old_id and old_id in temp_to_real:
                                gate["question_id"] = temp_to_real[old_id]
                                remapped = True
                        if remapped:
                            supabase.table("questions").update(
                                {"options": json_module.loads(json_module.dumps(opts))}
                            ).eq("id", new_q["id"]).execute()
                            new_q["options"] = json_module.loads(
                                json_module.dumps(opts)
                            )

            created_survey["questions"] = created_questions
        else:
            created_survey["questions"] = []

        # 3. Append response_count to match SurveyDetail shape although it's 0 initially
        created_survey["response_count"] = 0

        return created_survey
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/surveys/{survey_id}/duplicate", response_model=SurveyDetail)
async def duplicate_survey(survey_id: str):
    """
    Duplicate a survey, its questions, logic gates, and stored translations.

    The duplicated survey is inactive by default. Question options are deep-copied,
    old question IDs are mapped to new question IDs, logic gate references are
    remapped, and stored translation payloads are copied with translated question IDs
    updated for the new survey.
    """
    try:
        # 1. Fetch original survey
        survey_res = supabase.table("surveys").select("*").eq("id", survey_id).execute()
        if not survey_res.data:
            raise HTTPException(status_code=404, detail="Survey not found")

        original_survey = survey_res.data[0]

        # 2. Fetch original questions
        questions_res = (
            supabase.table("questions")
            .select("*")
            .eq("survey_id", survey_id)
            .order("order_index")
            .execute()
        )
        original_questions = questions_res.data

        # 3. Create new survey based on original
        new_survey_res = (
            supabase.table("surveys")
            .insert(
                {
                    "title": f"{original_survey['title']} (Copy)",
                    "description": original_survey.get("description"),
                    "description_alignment": original_survey.get(
                        "description_alignment", "left"
                    ),
                    "estimated_minutes": original_survey.get("estimated_minutes", 5),
                    "is_active": False,  # Duplicate should be inactive by default
                    "has_been_published": False,  # Duplicate hasn't been published
                    "thumbnail_url": original_survey.get("thumbnail_url"),
                }
            )
            .execute()
        )

        new_survey = new_survey_res.data[0]

        # 4. Duplicate questions
        if original_questions:
            original_sorted = sorted(original_questions, key=lambda q: q["order_index"])
            questions_to_insert = []
            for q in original_sorted:
                new_opts = (
                    json_module.loads(json_module.dumps(q["options"]))
                    if q.get("options")
                    else None
                )
                questions_to_insert.append(
                    {
                        "survey_id": new_survey["id"],
                        "question_text": q["question_text"],
                        "type": q["type"],
                        "order_index": q["order_index"],
                        "options": new_opts,
                        "is_required": q["is_required"],
                        "is_conditional": q.get("is_conditional", False),
                    }
                )

            new_questions_res = (
                supabase.table("questions").insert(questions_to_insert).execute()
            )
            new_questions = sorted(
                new_questions_res.data, key=lambda q: q["order_index"]
            )

            # Build old-to-new UUID mapping and remap logic_gates
            old_to_new = {}
            for old_q, new_q in zip(original_sorted, new_questions, strict=False):
                old_to_new[old_q["id"]] = new_q["id"]

            # Duplicate and Remap Translations (new table)
            existing_translations_res = (
                supabase.table("translations")
                .select("*")
                .eq("survey_id", survey_id)
                .execute()
            )
            existing_translations = existing_translations_res.data

            if existing_translations:
                for trans in existing_translations:
                    questions = trans.get("questions", [])
                    if isinstance(questions, list):
                        for tq in questions:
                            old_id = tq.get("id")
                            if old_id in old_to_new:
                                tq["id"] = old_to_new[old_id]

                    supabase.table("translations").insert({
                        "survey_id": new_survey["id"],
                        "language_code": trans["language_code"],
                        "title": trans.get("title", ""),
                        "description": trans.get("description", ""),
                        "questions": questions,
                    }).execute()

            # Also duplicate legacy ai_analyses for backward compatibility
            existing_legacy_res = (
                supabase.table("ai_analyses")
                .select("*")
                .eq("survey_id", survey_id)
                .in_("analysis_type", ["translation_fr", "translation_zh"])
                .execute()
            )
            existing_legacy = existing_legacy_res.data

            if existing_legacy:
                legacy_to_insert = []
                for trans in existing_legacy:
                    trans_data = json_module.loads(json_module.dumps(trans["data"]))
                    lang_suffix = (
                        "fr" if "translation_fr" in trans["analysis_type"] else "zh"
                    )
                    q_key = f"questions_{lang_suffix}"

                    if q_key in trans_data and isinstance(trans_data[q_key], list):
                        for tq in trans_data[q_key]:
                            old_id = tq.get("id")
                            if old_id in old_to_new:
                                tq["id"] = old_to_new[old_id]

                    legacy_to_insert.append(
                        {
                            "survey_id": new_survey["id"],
                            "analysis_type": trans["analysis_type"],
                            "data": trans_data,
                            "updated_at": datetime.utcnow().isoformat(),
                        }
                    )
                if legacy_to_insert:
                    supabase.table("ai_analyses").insert(
                        legacy_to_insert
                    ).execute()

            updates_needed = []
            for new_q in new_questions:
                opts = new_q.get("options")
                if isinstance(opts, dict) and opts.get("logic_gates"):
                    remapped = False
                    for gate in opts["logic_gates"]:
                        old_id = gate.get("question_id")
                        if old_id and old_id in old_to_new:
                            gate["question_id"] = old_to_new[old_id]
                            remapped = True
                    if remapped:
                        updates_needed.append(
                            {
                                "id": new_q["id"],
                                "options": json_module.loads(json_module.dumps(opts)),
                            }
                        )

            if updates_needed:
                for update in updates_needed:
                    supabase.table("questions").update(
                        {"options": update["options"]}
                    ).eq("id", update["id"]).execute()
                    for new_q in new_questions:
                        if new_q["id"] == update["id"]:
                            new_q["options"] = update["options"]

            new_survey["questions"] = new_questions
        else:
            new_survey["questions"] = []

        new_survey["response_count"] = 0

        return new_survey
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/surveys/{survey_id}", response_model=SurveyDetail)
async def update_survey(survey_id: str, survey: SurveyCreate):
    """Update an existing survey and its questions. Fails if the survey has ever been published."""
    try:
        # 1. Check if existing survey has been published
        existing_res = (
            supabase.table("surveys")
            .select("has_been_published")
            .eq("id", survey_id)
            .execute()
        )
        if not existing_res.data:
            raise HTTPException(status_code=404, detail="Survey not found")

        # Enforce editing lock
        if existing_res.data[0]["has_been_published"]:
            raise HTTPException(
                status_code=400,
                detail="Cannot edit a survey that has been published and locked.",
            )

        has_been_published = (
            survey.is_active or existing_res.data[0]["has_been_published"]
        )

        # 2. Update Survey
        survey_res = (
            supabase.table("surveys")
            .update(
                {
                    "title": survey.title,
                    "description": survey.description,
                    "description_alignment": survey.description_alignment,
                    "estimated_minutes": survey.estimated_minutes,
                    "is_active": survey.is_active,
                    "has_been_published": has_been_published,
                    "thumbnail_url": survey.thumbnail_url,
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            .eq("id", survey_id)
            .execute()
        )

        updated_survey = survey_res.data[0]

        # 3. Delete existing questions
        supabase.table("questions").delete().eq("survey_id", survey_id).execute()

        # 4. Insert new questions
        if survey.questions:
            questions_to_insert = []
            temp_to_real = {}
            for q in survey.questions:
                new_q = {
                    "survey_id": updated_survey["id"],
                    "question_text": q.question_text,
                    "type": q.type,
                    "order_index": q.order_index,
                    "options": q.options,
                    "is_required": q.is_required,
                    "is_conditional": q.is_conditional,
                }
                got_id = False
                if q.id:
                    try:
                        uuid.UUID(q.id)
                        new_q["id"] = q.id
                        got_id = True
                    except ValueError:
                        pass
                if not got_id:
                    gen_id = str(uuid.uuid4())
                    new_q["id"] = gen_id
                    if q.id:
                        temp_to_real[q.id] = gen_id
                questions_to_insert.append(new_q)

            questions_res = (
                supabase.table("questions").insert(questions_to_insert).execute()
            )
            inserted = questions_res.data

            # Remap logic_gates that reference temp IDs
            if temp_to_real:
                for new_q in inserted:
                    opts = new_q.get("options")
                    if isinstance(opts, dict) and opts.get("logic_gates"):
                        remapped = False
                        for gate in opts["logic_gates"]:
                            old_id = gate.get("question_id")
                            if old_id and old_id in temp_to_real:
                                gate["question_id"] = temp_to_real[old_id]
                                remapped = True
                        if remapped:
                            supabase.table("questions").update(
                                {"options": json_module.loads(json_module.dumps(opts))}
                            ).eq("id", new_q["id"]).execute()
                            new_q["options"] = json_module.loads(
                                json_module.dumps(opts)
                            )

            updated_survey["questions"] = inserted
        else:
            updated_survey["questions"] = []

        updated_survey["response_count"] = 0  # Dummy count for response_model

        return updated_survey
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/surveys/{survey_id}")
async def delete_survey(survey_id: str):
    """Delete a survey and all its associated data (cascade)."""
    try:
        # Check if exists
        existing = supabase.table("surveys").select("id").eq("id", survey_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Survey not found")

        # Delete survey (Postgres ON DELETE CASCADE handles questions, sessions, and answers)
        supabase.table("surveys").delete().eq("id", survey_id).execute()

        return {
            "success": True,
            "message": "Survey and all related data deleted successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/surveys/{survey_id}/toggle", response_model=SurveyList)
async def toggle_survey_status(survey_id: str):
    """Toggle a survey's active status."""
    try:
        existing = (
            supabase.table("surveys")
            .select("is_active", "has_been_published")
            .eq("id", survey_id)
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Survey not found")

        current = existing.data[0]
        new_status = not current["is_active"]

        res = (
            supabase.table("surveys")
            .update(
                {
                    "is_active": new_status,
                    "has_been_published": True
                    if new_status
                    else current["has_been_published"],
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            .eq("id", survey_id)
            .execute()
        )

        updated = res.data[0]
        updated["response_count"] = 0
        return updated
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- SHARE LINKS ---
