import requests
import pytest


class TestSurveySubmission:
    @pytest.fixture
    def active_survey(self, base_url, cleanup_surveys):
        payload = {
            "title": "Submission Test Survey",
            "description": "Testing submissions",
            "estimated_minutes": 2,
            "is_active": True,
            "questions": [
                {
                    "id": "temp-q1",
                    "question_text": "What is your favorite color?",
                    "type": "multiple_choice",
                    "order_index": 1,
                    "is_required": True,
                    "options": {"choices": ["Red", "Blue", "Green"]}
                },
                {
                    "id": "temp-q2",
                    "question_text": "Rate this survey",
                    "type": "rating_scale",
                    "order_index": 2,
                    "is_required": True,
                    "options": {}
                }
            ]
        }
        res = requests.post(f"{base_url}/api/surveys", json=payload)
        assert res.status_code == 200
        survey = res.json()
        cleanup_surveys(survey["id"])
        return survey

    def test_submit_survey_response(self, base_url, active_survey):
        survey_id = active_survey["id"]
        q1_id = active_survey["questions"][0]["id"]
        q2_id = active_survey["questions"][1]["id"]
        payload = {
            "email": "test@example.com",
            "answers": [
                {"question_id": q1_id, "answer_text": "Blue", "time_spent": 5000},
                {"question_id": q2_id, "answer_numeric": 75, "time_spent": 3000}
            ]
        }
        res = requests.post(f"{base_url}/api/surveys/{survey_id}/responses", json=payload)
        assert res.status_code == 200, f"Submission failed: {res.text}"

    def test_check_status_after_submission(self, base_url, active_survey):
        survey_id = active_survey["id"]
        email = "status@test.com"
        requests.post(f"{base_url}/api/surveys/{survey_id}/responses", json={
            "email": email,
            "answers": [
                {"question_id": active_survey["questions"][0]["id"], "answer_text": "Red", "time_spent": 1000}
            ]
        })
        res = requests.post(f"{base_url}/api/surveys/{survey_id}/check-status", json={"email": email})
        assert res.status_code == 200
        data = res.json()
        assert data["has_submitted"] is True
