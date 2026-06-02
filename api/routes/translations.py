import io
import json as json_module
import os
import traceback
import uuid
from datetime import datetime

import httpx
import pdfplumber
from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from api.config import GEMINI_MODEL
from api.dependencies import supabase

router = APIRouter()


@router.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file to Supabase Storage and return the public URL."""
    try:
        content = await file.read()
        ext = file.filename.split(".")[-1] if file.filename else "bin"
        filename = f"{uuid.uuid4()}.{ext}"
        path = f"uploads/{filename}"

        supabase.storage.from_("survey-assets").upload(
            path,
            content,
            file_options={
                "content-type": file.content_type or "application/octet-stream"
            },
        )

        public_url = supabase.storage.from_("survey-assets").get_public_url(path)
        return {"url": public_url, "filename": file.filename}
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/surveys/{survey_id}/translation")
async def get_survey_translation(survey_id: str):
    """Fetch the translated questions if they exist."""
    try:
        res_fr = (
            supabase.table("ai_analyses")
            .select("data")
            .eq("survey_id", survey_id)
            .eq("analysis_type", "translation_fr")
            .execute()
        )
        res_zh = (
            supabase.table("ai_analyses")
            .select("data")
            .eq("survey_id", survey_id)
            .eq("analysis_type", "translation_zh")
            .execute()
        )

        result = {
            "questions_fr": None,
            "title_fr": None,
            "description_fr": None,
            "questions_zh": None,
            "title_zh": None,
            "description_zh": None,
        }

        if res_fr.data:
            data_fr = res_fr.data[0]["data"]
            if isinstance(data_fr, list):
                result["questions_fr"] = data_fr
            elif isinstance(data_fr, dict):
                result["questions_fr"] = data_fr.get("questions_fr")
                result["title_fr"] = data_fr.get("title_fr")
                result["description_fr"] = data_fr.get("description_fr")

        if res_zh.data:
            data_zh = res_zh.data[0]["data"]
            if isinstance(data_zh, list):
                result["questions_zh"] = data_zh
            elif isinstance(data_zh, dict):
                result["questions_zh"] = data_zh.get("questions_zh")
                result["title_zh"] = data_zh.get("title_zh")
                result["description_zh"] = data_zh.get("description_zh")

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/surveys/{survey_id}/translation")
async def update_survey_translation(survey_id: str, request: Request):
    """Manually update the translated questions JSON."""
    try:
        body = await request.json()

        # FR Translation
        questions_fr = body.get("questions_fr")
        if questions_fr is not None:
            payload_fr = {
                "questions_fr": questions_fr,
                "title_fr": body.get("title_fr"),
                "description_fr": body.get("description_fr"),
            }
            existing_fr = (
                supabase.table("ai_analyses")
                .select("id")
                .eq("survey_id", survey_id)
                .eq("analysis_type", "translation_fr")
                .execute()
            )
            if existing_fr.data:
                supabase.table("ai_analyses").update(
                    {"data": payload_fr, "updated_at": datetime.utcnow().isoformat()}
                ).eq("id", existing_fr.data[0]["id"]).execute()
            else:
                supabase.table("ai_analyses").insert(
                    {
                        "survey_id": survey_id,
                        "analysis_type": "translation_fr",
                        "data": payload_fr,
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                ).execute()

        # ZH Translation
        questions_zh = body.get("questions_zh")
        if questions_zh is not None:
            payload_zh = {
                "questions_zh": questions_zh,
                "title_zh": body.get("title_zh"),
                "description_zh": body.get("description_zh"),
            }
            existing_zh = (
                supabase.table("ai_analyses")
                .select("id")
                .eq("survey_id", survey_id)
                .eq("analysis_type", "translation_zh")
                .execute()
            )
            if existing_zh.data:
                supabase.table("ai_analyses").update(
                    {"data": payload_zh, "updated_at": datetime.utcnow().isoformat()}
                ).eq("id", existing_zh.data[0]["id"]).execute()
            else:
                supabase.table("ai_analyses").insert(
                    {
                        "survey_id": survey_id,
                        "analysis_type": "translation_zh",
                        "data": payload_zh,
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                ).execute()

        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/test-gemini")
async def test_gemini():
    """Quick test endpoint to verify Gemini API connectivity."""
    GOOGLE_AI_KEY = os.environ.get("GOOGLE_AI_KEY")
    if not GOOGLE_AI_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_AI_KEY not set")

    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GOOGLE_AI_KEY}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                gemini_url,
                json={
                    "contents": [{"parts": [{"text": "Say hello in French."}]}],
                    "generationConfig": {"maxOutputTokens": 50},
                },
            )
        return {
            "status": res.status_code,
            "body_preview": str(res.text)[:500] if res.text else "empty",
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/surveys/{survey_id}/translation/upload")
async def upload_translation_pdf(
    survey_id: str, language: str = "fr", file: UploadFile = File(...)
):
    """Upload a PDF containing translated survey questions and auto-populate translations."""

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    if language not in ("fr", "zh"):
        raise HTTPException(status_code=400, detail="Language must be 'fr' or 'zh'")

    try:
        print(
            f"[upload_translation_pdf] Starting upload for survey={survey_id}, language={language}, filename={file.filename}"
        )
        content = await file.read()
        print(f"[upload_translation_pdf] Read {len(content)} bytes")
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large (max 10MB)")

        survey_res = supabase.table("surveys").select("*").eq("id", survey_id).execute()
        print(
            f"[upload_translation_pdf] Survey lookup done, found={bool(survey_res.data)}"
        )
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

        if not questions:
            raise HTTPException(status_code=400, detail="Survey has no questions")

        extracted_text = ""
        print("[upload_translation_pdf] Opening PDF with pdfplumber...")
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            print(f"[upload_translation_pdf] PDF opened, pages={len(pdf.pages)}")
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    extracted_text += page_text + "\n"
        print(f"[upload_translation_pdf] Extracted {len(extracted_text)} chars of text")

        if not extracted_text.strip():
            raise HTTPException(
                status_code=400, detail="Could not extract text from PDF"
            )

        reference_questions = []
        for i, q in enumerate(questions):
            ref = {
                "index": i,
                "type": q["type"],
                "question_text": q["question_text"],
            }
            if q["options"] and isinstance(q["options"], dict):
                opts = q["options"]
                if "choices" in opts:
                    ref["options"] = {"choices": opts["choices"]}
                    ref["option_count"] = len(opts["choices"])
                elif "description" in opts:
                    ref["options"] = {"description": opts["description"]}
            reference_questions.append(ref)

        language_name = "French" if language == "fr" else "Chinese"

        prompt = f"""You are an expert translator. Below is a survey with its English questions, followed by {language_name} translations extracted from a PDF.

=== SURVEY REFERENCE (English) ===
Title: {survey["title"]}
Description: {survey.get("description", "")}

Questions (in exact order, with index):
{json_module.dumps(reference_questions, ensure_ascii=False)}

=== PDF TEXT ({language_name} Translation) ===
{extracted_text}

=== INSTRUCTIONS ===
The PDF contains {language_name} translations of the survey. Map each translated question to its corresponding English question by position (index). The PDF questions appear in the exact same order as the reference.

For each question:
- Extract the translated question text (may contain HTML like <strong>, <em>)
- Extract translated choice options if the question has choices
- For section_header types, extract the translated section title and description if present
- If a question has no visible translation in the PDF, set question_text to an empty string

IMPORTANT: Do NOT skip any questions from the reference. Every question must appear in the output, with the same index ordering. The "questions" array MUST contain exactly {len(questions)} items.

Return ONLY a JSON object matching EXACTLY this structure:
{{
  "title": "{language_name} survey title",
  "description": "{language_name} survey description or empty string",
  "questions": [
    {{
      "index": 0,
      "question_text": "translated question text",
      "type": "multiple_choice",
      "options": {{ "choices": ["Option 1", "Option 2"] }}
    }},
    ...
  ]
}}

For questions without choices (short_answer, rating_scale, likert_scale), set options to null.
For section_header, set options to {{}}.
Return ONLY the JSON object, no markdown wrapping or extra text."""

        GOOGLE_AI_KEY = os.environ.get("GOOGLE_AI_KEY")
        if not GOOGLE_AI_KEY:
            raise HTTPException(
                status_code=500, detail="Google AI API key not configured"
            )

        print(
            f"[upload_translation_pdf] Calling Gemini API with prompt length={len(prompt)}"
        )
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GOOGLE_AI_KEY}"

        async with httpx.AsyncClient(timeout=120.0) as client:
            gemini_res = await client.post(
                gemini_url,
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 65536},
                },
            )

        print(
            f"[upload_translation_pdf] Gemini response status={gemini_res.status_code}",
            flush=True,
        )
        if gemini_res.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Gemini API error: {gemini_res.status_code} - {gemini_res.text[:500]}",
            )

        gemini_data = gemini_res.json()
        print(
            f"[upload_translation_pdf] Gemini JSON parsed, keys={list(gemini_data.keys())}",
            flush=True,
        )
        raw_text = gemini_data["candidates"][0]["content"]["parts"][0]["text"]
        print(f"[upload_translation_pdf] Raw text length={len(raw_text)}", flush=True)

        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        print(
            f"[upload_translation_pdf] Cleaned text length={len(cleaned)}, starts_with={cleaned[:80].replace(chr(10), ' ')}",
            flush=True,
        )
        try:
            parsed = json_module.loads(cleaned)
        except Exception as e:
            print(f"[upload_translation_pdf] JSON parse FAILED: {e}", flush=True)
            print(
                f"[upload_translation_pdf] First 500 chars: {cleaned[:500]}", flush=True
            )
            raise
        print(
            f"[upload_translation_pdf] JSON parsed successfully, questions_count={len(parsed.get('questions', []))}",
            flush=True,
        )

        if "questions" not in parsed:
            raise HTTPException(
                status_code=502,
                detail="Could not parse translations from PDF — missing questions in AI response",
            )

        questions_translated = []
        gemini_questions = {q["index"]: q for q in parsed["questions"]}

        for i, q in enumerate(questions):
            gemini_q = gemini_questions.get(i)
            if gemini_q:
                translated = {
                    "id": q["id"],
                    "question_text": gemini_q.get("question_text", ""),
                    "type": q["type"],
                    "order_index": q["order_index"],
                    "is_required": q.get("is_required", True),
                    "is_conditional": q.get("is_conditional", False),
                    "options": gemini_q.get("options"),
                }
            else:
                # No translation found in PDF for this question — leave it empty so
                # the frontend can fall back to English and manual edits are preserved.
                translated = {
                    "id": q["id"],
                    "question_text": "",
                    "type": q["type"],
                    "order_index": q["order_index"],
                    "is_required": q.get("is_required", True),
                    "is_conditional": q.get("is_conditional", False),
                    "options": None,
                }
            questions_translated.append(translated)

        title_key = f"title_{language}"
        description_key = f"description_{language}"
        questions_key = f"questions_{language}"
        analysis_type = f"translation_{language}"

        payload = {
            questions_key: questions_translated,
            title_key: parsed.get("title", "") or "",
            description_key: parsed.get("description", "") or "",
        }

        existing = (
            supabase.table("ai_analyses")
            .select("id")
            .eq("survey_id", survey_id)
            .eq("analysis_type", analysis_type)
            .execute()
        )
        if existing.data:
            supabase.table("ai_analyses").update(
                {"data": payload, "updated_at": datetime.utcnow().isoformat()}
            ).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("ai_analyses").insert(
                {
                    "survey_id": survey_id,
                    "analysis_type": analysis_type,
                    "data": payload,
                    "updated_at": datetime.utcnow().isoformat(),
                }
            ).execute()

        print(
            f"[upload_translation_pdf] Successfully saved translations, {len(questions_translated)} questions"
        )
        return {"success": True, "data": payload}

    except HTTPException:
        raise
    except json_module.JSONDecodeError as e:
        raise HTTPException(
            status_code=502, detail=f"Failed to parse AI response: {str(e)}"
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
