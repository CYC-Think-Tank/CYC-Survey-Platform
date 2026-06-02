import json as json_module

from fastapi import APIRouter, HTTPException

from api.models import AIAnalysisRequest
from api.services.ai_analysis import handle_ai_analysis

router = APIRouter()


@router.post("/api/surveys/{survey_id}/ai-analysis")
async def ai_persuadability_analysis(
    survey_id: str, body: AIAnalysisRequest = AIAnalysisRequest()
):
    try:
        prompt_suffix = """

Produce a Persuadability Detection report as JSON with EXACTLY this structure:
{
  "overall_summary": "2-3 sentence executive summary of the persuadability landscape.",
  "persuadability_score": { "overall": <0-100>, "label": "<Low|Moderate|High|Very High>" },
  "key_findings": [{ "title": "...", "description": "...", "confidence": "<High|Medium|Low>", "icon": "<lightbulb|trending_up|users|alert_triangle|bar_chart>" }],
  "demographic_segments": [{ "segment_name": "...", "size": <n>, "persuadability": <0-100>, "label": "<Fixed|Leaning Fixed|Moderate|Leaning Flexible|Flexible>", "key_trait": "..." }],
  "opinion_flexibility_map": [{ "topic": "...", "flexibility_score": <0-100>, "sentiment": "<Strongly Against|Against|Mixed|For|Strongly For>", "insight": "..." }],
  "recommendations": [{ "action": "...", "target_audience": "...", "rationale": "..." }]
}

Guidelines: High variance in rating/likert = persuadable. Split multiple choice = opinion still forming. Analyze sentiment strength in short answers. Be specific and data-driven. Return ONLY valid JSON."""

        return await handle_ai_analysis(
            survey_id, "persuadability", body.force_refresh, prompt_suffix
        )
    except HTTPException:
        raise
    except json_module.JSONDecodeError as e:
        raise HTTPException(
            status_code=502, detail=f"Failed to parse AI response: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- 2. PUBLIC MOOD HEATMAP ---


@router.post("/api/surveys/{survey_id}/ai-mood")
async def ai_mood_heatmap(
    survey_id: str, body: AIAnalysisRequest = AIAnalysisRequest()
):
    try:
        prompt_suffix = """

Produce a Public Mood Heatmap report as JSON with EXACTLY this structure:
{
  "overall_mood": { "label": "<Optimistic|Anxious|Frustrated|Apathetic|Divided|Determined>", "description": "2-3 sentence summary of the overarching mood." },
  "mood_dimensions": [
    { "dimension": "A key mood dimension (e.g. 'Economic Anxiety', 'Hope for Future')", "score": <0-100 severity/intensity>, "insight": "..." }
  ],
  "emerging_concerns": [
    { "concern": "...", "urgency": "<High|Medium|Low>", "evidence": "..." }
  ]
}

Guidelines: Focus on emotional valence and intensity across responses. Look for underlying frustration, optimism, or apathy. Identify specific trigger points or issues driving negative/positive sentiment. Return ONLY valid JSON."""

        return await handle_ai_analysis(
            survey_id, "mood", body.force_refresh, prompt_suffix
        )
    except HTTPException:
        raise
    except json_module.JSONDecodeError as e:
        raise HTTPException(
            status_code=502, detail=f"Failed to parse AI response: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- 3. BELIEF NETWORK GRAPH ---


@router.post("/api/surveys/{survey_id}/ai-beliefs")
async def ai_belief_network(
    survey_id: str, body: AIAnalysisRequest = AIAnalysisRequest()
):
    try:
        prompt_suffix = """

Produce a Hidden Belief Network report as JSON with EXACTLY this structure:
{
  "summary": "2-3 sentence summary of the core ideological or belief clusters found.",
  "belief_clusters": [
    { "cluster_name": "...", "size": "<Approximate % or descriptive size>", "description": "...", "beliefs": ["Core belief 1", "Core belief 2"] }
  ],
  "surprising_connections": [
    { "connection": "e.g., 'Pro-Environment AND Pro-Oil-Subsidies'", "why_surprising": "...", "evidence": "..." }
  ]
}

Guidelines: Look for correlations in how people answer seemingly unrelated questions. Identify clusters of respondents sharing underlying ideological frameworks or worldviews. Highlight contradictory or surprising combinations of beliefs. Return ONLY valid JSON."""

        return await handle_ai_analysis(
            survey_id, "beliefs", body.force_refresh, prompt_suffix
        )
    except HTTPException:
        raise
    except json_module.JSONDecodeError as e:
        raise HTTPException(
            status_code=502, detail=f"Failed to parse AI response: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- 4. MINORITY INSIGHT AMPLIFIER ---


@router.post("/api/surveys/{survey_id}/ai-minority")
async def ai_minority_insights(
    survey_id: str, body: AIAnalysisRequest = AIAnalysisRequest()
):
    try:
        prompt_suffix = """

Produce a Minority Insight Amplifier report as JSON with EXACTLY this structure:
{
  "summary": "2-3 sentence overview of minority concerns detected.",
  "amplified_concerns": [
    {
      "concern": "The issue or concern",
      "percentage": <% of respondents who raised it>,
      "intensity": <0-100 intensity score>,
      "intensity_label": "<Critical|High|Elevated|Moderate>",
      "concentration": "Where/who this is concentrated among",
      "evidence": "Specific response patterns supporting this",
      "why_it_matters": "Why this warrants attention despite low volume"
    }
  ],
  "overlooked_demographics": [{ "group": "...", "concern": "...", "detail": "..." }],
  "recommended_actions": [{ "action": "...", "priority": "<High|Medium|Low>", "rationale": "..." }]
}

Guidelines: Focus on issues raised by <25% of respondents but with unusually high emotional intensity or concentration. Look for geographic/demographic clustering. Prioritize concerns with disproportionate potential impact. Detect urgency language in open-ended responses. Return ONLY valid JSON."""

        return await handle_ai_analysis(
            survey_id, "minority", body.force_refresh, prompt_suffix
        )
    except HTTPException:
        raise
    except json_module.JSONDecodeError as e:
        raise HTTPException(
            status_code=502, detail=f"Failed to parse AI response: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- 5. RESPONDENT ARCHETYPE GENERATOR ---


@router.post("/api/surveys/{survey_id}/ai-archetypes")
async def ai_archetypes(survey_id: str, body: AIAnalysisRequest = AIAnalysisRequest()):
    try:
        prompt_suffix = """

Produce a Behavioural Archetypes report as JSON with EXACTLY this structure:
{
  "summary": "2-3 sentence summary of the main personas discovered.",
  "archetypes": [
    {
      "name": "Creative archetype name (e.g. 'Pragmatic Skeptic')",
      "size": <number of respondents fitting this archetype>,
      "percentage": <% of total>,
      "description": "2-3 sentence description of this archetype",
      "key_traits": ["trait 1", "trait 2", "trait 3"],
      "values": "What this group values most",
      "policy_stance": "Their general policy orientation",
      "engagement_level": "<Highly Engaged|Engaged|Moderate|Low|Disengaged>"
    }
  ],
  "archetype_comparison": [
    { "dimension": "A key dimension (e.g. 'Trust in Government')", "scores": { "<archetype_name>": <0-100> } }
  ],
  "implications": [{ "insight": "...", "recommendation": "..." }]
}

Guidelines: Cluster respondents by recurring patterns in attitudes, values, and priorities. Go beyond simple demographics — create meaningful behavioural personas. Give each archetype an intuitive, memorable name. Provide 3-5 archetypes. Return ONLY valid JSON."""

        return await handle_ai_analysis(
            survey_id, "archetypes", body.force_refresh, prompt_suffix
        )
    except HTTPException:
        raise
    except json_module.JSONDecodeError as e:
        raise HTTPException(
            status_code=502, detail=f"Failed to parse AI response: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- 6. SURVEY BLIND SPOT ANALYZER ---


@router.post("/api/surveys/{survey_id}/ai-blindspots")
async def ai_blindspots(survey_id: str, body: AIAnalysisRequest = AIAnalysisRequest()):
    try:
        prompt_suffix = """

Produce a Survey Blind Spot Analyzer report as JSON with EXACTLY this structure:
{
  "summary": "2-3 sentence overview of the survey's coverage and gaps.",
  "coverage_score": { "overall": <0-100>, "label": "<Comprehensive|Good|Moderate|Limited|Narrow>" },
  "blind_spots": [
    {
      "topic": "The underexplored topic",
      "severity": "<Critical|Significant|Minor>",
      "evidence": "What in the responses suggests this gap",
      "suggested_questions": ["Specific question to add in future"]
    }
  ],
  "emerging_themes": [
    { "theme": "...", "frequency": "<Frequent|Occasional|Rare>", "source": "Where this appeared (e.g. open-ended responses)", "detail": "..." }
  ],
  "methodology_flags": [
    { "issue": "...", "severity": "<High|Medium|Low>", "suggestion": "..." }
  ],
  "improvement_recommendations": [
    { "recommendation": "...", "priority": "<High|Medium|Low>", "rationale": "..." }
  ]
}

Guidelines: Review which topics the survey covers well and where gaps exist. Look for recurring themes in open-ended responses not reflected in structured questions. Flag potential question bias or missing response options. Suggest specific new questions for future iterations. Return ONLY valid JSON."""

        return await handle_ai_analysis(
            survey_id, "blindspots", body.force_refresh, prompt_suffix
        )
    except HTTPException:
        raise
    except json_module.JSONDecodeError as e:
        raise HTTPException(
            status_code=502, detail=f"Failed to parse AI response: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
