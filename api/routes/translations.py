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


def _save_to_legacy_ai_analyses(
    survey_id: str,
    language_code: str,
    title: str,
    description: str,
    questions: list,
):
    """Also write to ai_analyses for backward compatibility during transition."""
    analysis_type = f"translation_{language_code}"
    payload = {
        f"questions_{language_code}": questions,
        f"title_{language_code}": title,
        f"description_{language_code}": description,
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


@router.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a file to Supabase Storage and return its public URL.

    Used primarily for survey question thumbnails and other assets. The file is
    stored in the "survey-assets" bucket under a UUID-based filename, then the
    endpoint returns the public URL and original filename.
    """
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
    """Fetch translations from new table; fallback to ai_analyses for backward compat."""
    try:
        # Try new translations table first
        try:
            res = (
                supabase.table("translations")
                .select("language_code, title, description, questions")
                .eq("survey_id", survey_id)
                .execute()
            )

            if res.data:
                # Return in the new generic format
                translations = {}
                for row in res.data:
                    translations[row["language_code"]] = {
                        "title": row.get("title", ""),
                        "description": row.get("description", ""),
                        "questions": row.get("questions", []),
                    }

                # Also return legacy fields for backward compatibility during transition
                legacy = {}
                for row in res.data:
                    lang = row["language_code"]
                    legacy[f"questions_{lang}"] = row.get("questions", [])
                    legacy[f"title_{lang}"] = row.get("title", "")
                    legacy[f"description_{lang}"] = row.get("description", "")

                return {"translations": translations, **legacy}
        except Exception as inner_e:
            # translations table doesn't exist yet — fall through to legacy
            pass

        # Fallback to legacy ai_analyses
        legacy = {
            "questions_fr": None,
            "title_fr": None,
            "description_fr": None,
            "questions_zh": None,
            "title_zh": None,
            "description_zh": None,
            "translations": {},
        }

        for lang in ["fr", "zh"]:
            r = (
                supabase.table("ai_analyses")
                .select("data")
                .eq("survey_id", survey_id)
                .eq("analysis_type", f"translation_{lang}")
                .execute()
            )
            if r.data:
                data = r.data[0]["data"]
                if isinstance(data, list):
                    legacy[f"questions_{lang}"] = data
                elif isinstance(data, dict):
                    legacy[f"questions_{lang}"] = data.get(f"questions_{lang}")
                    legacy[f"title_{lang}"] = data.get(f"title_{lang}")
                    legacy[f"description_{lang}"] = data.get(f"description_{lang}")

        return legacy
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/api/surveys/{survey_id}/translation")
async def update_survey_translation(survey_id: str, request: Request):
    """Save translations to new table AND legacy ai_analyses (dual-write)."""
    try:
        body = await request.json()

        # Support both new generic format and legacy format during transition
        language_code = body.get("language_code")

        # Handle legacy hardcoded keys
        if not language_code:
            if body.get("questions_fr") is not None:
                language_code = "fr"
            elif body.get("questions_zh") is not None:
                language_code = "zh"

        if not language_code:
            raise HTTPException(status_code=400, detail="language_code is required")

        questions = body.get("questions") or body.get(f"questions_{language_code}")
        title = body.get("title") or body.get(f"title_{language_code}", "")
        description = body.get("description") or body.get(f"description_{language_code}", "")

        # 1. Write to new translations table
        existing = (
            supabase.table("translations")
            .select("id")
            .eq("survey_id", survey_id)
            .eq("language_code", language_code)
            .execute()
        )
        payload = {
            "survey_id": survey_id,
            "language_code": language_code,
            "title": title,
            "description": description,
            "questions": questions,
        }
        if existing.data:
            supabase.table("translations").update(
                {**payload, "updated_at": datetime.utcnow().isoformat()}
            ).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("translations").insert(payload).execute()

        # 2. Also write to ai_analyses for backward compatibility
        _save_to_legacy_ai_analyses(survey_id, language_code, title, description, questions)

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

    # Accept any language code, not just fr/zh
    if not language or len(language) < 2:
        raise HTTPException(status_code=400, detail="Language code is required")

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

        # Map common language codes to full names for the prompt
        LANGUAGE_NAMES = {
            "fr": "French",
            "zh": "Chinese",
            "es": "Spanish",
            "pa": "Punjabi",
            "ar": "Arabic",
            "tl": "Tagalog",
            "yue": "Cantonese",
            "it": "Italian",
            "de": "German",
            "ta": "Tamil",
        }
        language_name = LANGUAGE_NAMES.get(language, language.capitalize())

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

        title = parsed.get("title", "") or ""
        description = parsed.get("description", "") or ""

        # 1. Save to new translations table
        existing = (
            supabase.table("translations")
            .select("id")
            .eq("survey_id", survey_id)
            .eq("language_code", language)
            .execute()
        )
        payload = {
            "survey_id": survey_id,
            "language_code": language,
            "title": title,
            "description": description,
            "questions": questions_translated,
        }
        if existing.data:
            supabase.table("translations").update(
                {**payload, "updated_at": datetime.utcnow().isoformat()}
            ).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("translations").insert(payload).execute()

        # 2. Also save to ai_analyses for backward compatibility
        _save_to_legacy_ai_analyses(survey_id, language, title, description, questions_translated)

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


@router.post("/api/surveys/translate-all")
async def translate_all_languages(request: Request):
    """Translate survey content from English to the target language."""
    result = None
    try:
        body = await request.json()
        api_key = body.get("api_key")
        provider = body.get("provider", "opencode")
        target_language = body.get("target_language")
        english_title = body.get("english_title", "")
        english_description = body.get("english_description", "")
        english_questions = body.get("english_questions", [])

        if not api_key:
            raise HTTPException(status_code=400, detail="API key is required")
        if not target_language:
            raise HTTPException(status_code=400, detail="Target language is required")
        if not english_questions:
            raise HTTPException(status_code=400, detail="No questions to translate")

        LANGUAGE_NAMES = {
            "es": "Spanish",
            "pa": "Punjabi",
            "ar": "Arabic",
            "tl": "Tagalog",
            "yue": "Cantonese",
            "it": "Italian",
            "de": "German",
            "ta": "Tamil",
        }

        if target_language not in LANGUAGE_NAMES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported target language: {target_language}",
            )

        language_name = LANGUAGE_NAMES[target_language]

        if provider == "openrouter":
            API_URL = "https://openrouter.ai/api/v1/chat/completions"
            MODEL = "openrouter/free"
        else:
            API_URL = "https://opencode.ai/zen/go/v1/chat/completions"
            MODEL = "deepseek-v4-flash"

        prompt = f"""You are an expert translator. Translate the following survey content from English into {language_name}.

Return ONLY a JSON object with this exact structure:
{{
  "title": "translated survey title",
  "description": "translated survey description or empty string",
  "questions": [
    {{
      "index": 0,
      "question_text": "translated question text",
      "options": ["translated option 1", "translated option 2"],
      "question_description": "translated helper text or empty string",
      "section_description": "translated section description or empty string",
      "definitions": [{{"term": "translated term", "definition": "translated definition"}}]
    }}
  ]
}}

Rules:
- Preserve any HTML tags like <strong>, <em>, <span> exactly as they appear
- Translate ALL content — nothing should remain in English
- For empty fields in the source, return an empty string
- For empty arrays, return an empty array
- Keep option counts identical — do not add or remove options
- Translate definitions as key-value pairs

=== SURVEY TITLE ===
{english_title}

=== SURVEY DESCRIPTION ===
{english_description}

=== QUESTIONS ===
{json_module.dumps(english_questions, ensure_ascii=False)}

Return ONLY the JSON object, no markdown wrapping, no explanations."""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 65536,
        }

        async with httpx.AsyncClient(timeout=600.0) as client:
            resp = await client.post(API_URL, json=payload, headers=headers)

            if resp.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail=f"Translation API error ({target_language}): {resp.status_code} - {resp.text[:300]}",
                )

            data = resp.json()
            raw = data["choices"][0]["message"]["content"]

            cleaned = raw.strip()
            if not cleaned:
                raise HTTPException(
                    status_code=502,
                    detail=f"Translation API returned empty response for {target_language}",
                )
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()

            try:
                parsed = json_module.loads(cleaned)
            except json_module.JSONDecodeError:
                raise HTTPException(
                    status_code=502,
                    detail=f"Translation API returned invalid JSON for {target_language}: {cleaned[:200]}",
                )

            result = {"translations": {target_language: parsed}}

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail=f"Translation timed out for {target_language}. The request took too long — try again.",
        )
    except HTTPException:
        raise
    except json_module.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    if result is None:
        raise HTTPException(
            status_code=500, detail="Translation produced no result — please try again."
        )
    return result
