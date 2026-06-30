from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.dependencies import supabase
from api.utils.postal_geo import build_postal_geo_stats

router = APIRouter()

class JudgeLogin(BaseModel):
    name: str
    passcode: str

class JudgeScore(BaseModel):
    survey_id: str
    judge_id: str
    judge_name: str
    scores: dict
    automated_scores: dict
    total_score: float
    feedback: str

@router.post("/api/judging/login")
async def login_judge(credentials: JudgeLogin):
    """Mock authentication for judges."""
    if credentials.passcode == "judge123":
        judge_id = "judge_" + credentials.name.lower().replace(" ", "_")
        return {"id": judge_id, "name": credentials.name, "role": "judge"}
    raise HTTPException(status_code=401, detail="Invalid passcode")

@router.get("/api/judging/surveys")
async def get_judging_surveys(judge_id: str):
    """Fetch surveys to be scored and identify which have already been scored by this judge."""
    try:
        # Fetch active surveys
        surveys_res = supabase.table("surveys").select("*").eq("is_active", True).execute()
        surveys = surveys_res.data or []

        # Fetch existing scores for this judge
        scores_res = supabase.table("ai_analyses").select("*").eq("analysis_type", f"judge_score_{judge_id}").execute()
        scored_survey_ids = [s["survey_id"] for s in (scores_res.data or [])]

        for s in surveys:
            s["is_scored"] = s["id"] in scored_survey_ids
            
        return surveys
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/judging/surveys/{survey_id}/auto-scores")
async def get_auto_scores(survey_id: str):
    """Calculate the automated metrics based on the rubric."""
    try:
        # 1. Total Respondents & Languages
        sessions_res = supabase.table("response_sessions").select("language", count="exact").eq("survey_id", survey_id).execute()
        total_responses = sessions_res.count if hasattr(sessions_res, 'count') else len(sessions_res.data or [])
        languages = set([s.get("language") for s in (sessions_res.data or []) if s.get("language")])
        lang_count = len(languages)

        # Respondents Score
        if total_responses >= 500:
            respondents_score = 10
        else:
            respondents_score = min(10, max(0, total_responses // 50))
            if total_responses > 0 and respondents_score == 0:
                respondents_score = 1

        # Language Score
        if lang_count >= 5:
            lang_score = 10
        elif lang_count == 0:
            lang_score = 0
        elif lang_count == 1:
            lang_score = 2
        else:
            lang_score = max(0, 10 - (5 - lang_count) * 2)

        # 2. Geographic Score
        q_res = supabase.table("questions").select("*").eq("survey_id", survey_id).execute()
        geo_score = 0
        valid_provs = 0
        for q in (q_res.data or []):
            opts = q.get("options")
            if isinstance(opts, dict) and opts.get("validation", {}).get("type") == "postal_code_prefix":
                ans_res = supabase.table("answers").select("answer_text").eq("question_id", q["id"]).execute()
                geo_stats = build_postal_geo_stats(q["id"], ans_res.data or [])
                provinces = {}
                for dot in geo_stats.get("dots", []):
                    prov = dot.get("province")
                    provinces[prov] = provinces.get(prov, 0) + dot.get("count", 0)
                
                valid_provs = sum(1 for p, count in provinces.items() if count >= 2)
                geo_score = min(10, valid_provs)
                break

        return {
            "respondents_score": respondents_score,
            "total_responses": total_responses,
            "languages_score": lang_score,
            "language_count": lang_count,
            "geographic_score": geo_score,
            "valid_provinces": valid_provs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/judging/score")
async def submit_score(score: JudgeScore):
    """Save the judge's score using the ai_analyses table as a generic JSON store."""
    try:
        payload = {
            "survey_id": score.survey_id,
            "analysis_type": f"judge_score_{score.judge_id}",
            "data": {
                "judge_id": score.judge_id,
                "judge_name": score.judge_name,
                "scores": score.scores,
                "automated_scores": score.automated_scores,
                "total_score": score.total_score,
                "feedback": score.feedback,
            },
            "updated_at": datetime.utcnow().isoformat()
        }

        # Check if score already exists
        existing_res = supabase.table("ai_analyses").select("id").eq("survey_id", score.survey_id).eq("analysis_type", f"judge_score_{score.judge_id}").execute()
        if existing_res.data:
            # Update
            supabase.table("ai_analyses").update(payload).eq("id", existing_res.data[0]["id"]).execute()
        else:
            # Insert
            supabase.table("ai_analyses").insert(payload).execute()

        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
