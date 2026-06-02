import json as json_module
import os
from datetime import datetime

import httpx
from fastapi import HTTPException

from api.config import GEMINI_MODEL


def _supabase():
    from api.dependencies import supabase

    return supabase


def parse_gemini_analysis(raw_text: str, survey_id: str, total_respondents: int):
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

    analysis = json_module.loads(cleaned)

    if isinstance(analysis, list):
        if len(analysis) == 1 and isinstance(analysis[0], dict):
            analysis = analysis[0]
        else:
            analysis = {"data": analysis}

    analysis["meta"] = {
        "survey_id": survey_id,
        "total_respondents": total_respondents,
        "generated_at": datetime.utcnow().isoformat(),
    }
    return analysis


def gather_survey_data(survey_id: str):
    """Shared helper: gather all survey data for AI analysis."""
    supabase = _supabase()
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

    sessions_res = (
        supabase.table("response_sessions")
        .select("*")
        .eq("survey_id", survey_id)
        .eq("is_completed", True)
        .execute()
    )
    # Filter out invalid sessions
    sessions = [s for s in sessions_res.data if s.get("is_valid", True) is not False]

    if len(sessions) < 3:
        raise HTTPException(
            status_code=400,
            detail="Need at least 3 completed responses for AI analysis.",
        )

    valid_session_ids = {s["id"] for s in sessions}

    # Fetch all answers for the survey using inner join to bypass URL limits
    answers_res = (
        supabase.table("answers")
        .select("*, response_sessions!inner(survey_id)")
        .eq("response_sessions.survey_id", survey_id)
        .execute()
    )

    # Filter down to only valid, completed sessions
    all_answers = [a for a in answers_res.data if a["session_id"] in valid_session_ids]

    q_map = {q["id"]: q for q in questions}
    answers_by_session = {}
    for a in all_answers:
        sid = a["session_id"]
        if sid not in answers_by_session:
            answers_by_session[sid] = []
        answers_by_session[sid].append(a)

    respondent_profiles = []
    for s in sessions:
        profile = {"respondent_id": s["id"][:8], "answers": {}}
        for a in answers_by_session.get(s["id"], []):
            q = q_map.get(a["question_id"])
            if q:
                q_text = q["question_text"]
                if a.get("answer_text"):
                    profile["answers"][q_text] = a["answer_text"]
                elif a.get("answer_numeric") is not None:
                    profile["answers"][q_text] = a["answer_numeric"]
                elif a.get("answer_options"):
                    profile["answers"][q_text] = a["answer_options"]
        respondent_profiles.append(profile)

    aggregated_summary = []
    questions_summary = []
    for q in questions:
        if q["type"] == "section_header":
            continue
        q_info = {"text": q["question_text"], "type": q["type"]}
        if q.get("options"):
            opts = q["options"]
            if isinstance(opts, dict):
                q_info["choices"] = opts.get("choices", [])
            elif isinstance(opts, list):
                q_info["choices"] = opts
        questions_summary.append(q_info)

        # Build aggregation per question
        q_agg = {"question": q["question_text"], "type": q["type"], "total_answers": 0}
        answers_for_q = [a for a in all_answers if a["question_id"] == q["id"]]
        q_agg["total_answers"] = len(answers_for_q)

        if q["type"] in [
            "multiple_choice",
            "checkboxes",
            "rating_scale",
            "likert_scale",
        ]:
            counts = {}
            for a in answers_for_q:
                vals = []
                if q["type"] == "checkboxes" and a.get("answer_options"):
                    vals = a["answer_options"]
                    if not isinstance(vals, list):
                        vals = [vals]
                elif a.get("answer_text"):
                    vals = [a["answer_text"]]
                elif a.get("answer_numeric") is not None:
                    vals = [str(a["answer_numeric"])]

                for v in vals:
                    counts[v] = counts.get(v, 0) + 1
            q_agg["distribution"] = counts
        elif q["type"] == "short_answer":
            texts = [a["answer_text"] for a in answers_for_q if a.get("answer_text")]
            if len(texts) > 50:
                import random

                texts = random.sample(texts, 50)
            q_agg["sample_responses"] = texts
        aggregated_summary.append(q_agg)

    # Sample respondents to a max of 200 to prevent token limits on large datasets
    if len(respondent_profiles) > 200:
        import random

        respondent_profiles = random.sample(respondent_profiles, 200)

    return (
        survey,
        questions_summary,
        respondent_profiles,
        aggregated_summary,
        len(sessions),
    )


async def call_gemini(prompt: str, survey_id: str, total_respondents: int):
    """Shared helper: call Gemini and parse the JSON response."""
    GOOGLE_AI_KEY = os.environ.get("GOOGLE_AI_KEY")
    if not GOOGLE_AI_KEY:
        raise HTTPException(status_code=500, detail="Google AI API key not configured")

    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GOOGLE_AI_KEY}"

    async with httpx.AsyncClient(timeout=90.0) as client:
        gemini_res = await client.post(
            gemini_url,
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 8192,
                    "responseMimeType": "application/json",
                },
            },
        )

    if gemini_res.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API error: {gemini_res.status_code} - {gemini_res.text[:500]}",
        )

    gemini_data = gemini_res.json()
    raw_text = gemini_data["candidates"][0]["content"]["parts"][0]["text"]

    return parse_gemini_analysis(raw_text, survey_id, total_respondents)


async def handle_ai_analysis(
    survey_id: str, analysis_type: str, force_refresh: bool, prompt_suffix: str
):
    """Handles the caching and generation flow for AI analysis."""
    supabase = _supabase()
    if not force_refresh:
        try:
            res = (
                supabase.table("ai_analyses")
                .select("data")
                .eq("survey_id", survey_id)
                .eq("analysis_type", analysis_type)
                .execute()
            )
            if res.data:
                return res.data[0]["data"]
        except Exception as e:
            print(f"Warning: Failed to read AI cache: {e}")

    survey, questions_summary, profiles, aggregated_summary, total_respondents = (
        gather_survey_data(survey_id)
    )
    if total_respondents < 3:
        raise HTTPException(
            status_code=400, detail="Not enough responses for AI analysis."
        )

    prompt = (
        base_context(
            survey, questions_summary, profiles, aggregated_summary, total_respondents
        )
        + prompt_suffix
    )

    analysis = await call_gemini(prompt, survey_id, total_respondents)

    # Save to cache
    try:
        # Get existing record to handle upsert properly without relying purely on constraint if preferred,
        # but UPSERT should work. To be safe since we don't have primary key from client:
        existing = (
            supabase.table("ai_analyses")
            .select("id")
            .eq("survey_id", survey_id)
            .eq("analysis_type", analysis_type)
            .execute()
        )
        if existing.data:
            supabase.table("ai_analyses").update(
                {"data": analysis, "updated_at": datetime.utcnow().isoformat()}
            ).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("ai_analyses").insert(
                {
                    "survey_id": survey_id,
                    "analysis_type": analysis_type,
                    "data": analysis,
                    "updated_at": datetime.utcnow().isoformat(),
                }
            ).execute()
    except Exception as e:
        print(f"Warning: Failed to cache AI analysis: {e}")

    return analysis


def base_context(
    survey,
    questions_summary,
    respondent_profiles,
    aggregated_summary,
    total_respondents,
):
    """Build the shared context block for all prompts."""
    return f"""You are an expert policy research analyst working for a Canadian youth advocacy organization called CYC (Canadian Youth Cabinet).

Survey: "{survey["title"]}"
Description: {survey.get("description", "N/A")}
Total respondents: {total_respondents}

Questions asked:
{json_module.dumps(questions_summary, indent=2)}

Aggregated Survey Data (Exact distributions and counts across ALL {total_respondents} respondents):
{json_module.dumps(aggregated_summary, indent=2)}

Representative Sample of Respondent Profiles (Sampled {len(respondent_profiles)} respondents to show correlations and individual answer combinations):
{json_module.dumps(respondent_profiles, indent=2)}"""


# --- 1. PERSUADABILITY DETECTION ---
