import requests
import pytest


class TestSurveyCrud:
    def test_create_survey(self, base_url, cleanup_surveys):
        payload = {
            "title": "CRUD Test Survey",
            "description": "Testing CRUD operations",
            "estimated_minutes": 5,
            "is_active": False,
            "questions": [
                {
                    "id": "temp-q1",
                    "question_text": "Test question?",
                    "type": "multiple_choice",
                    "order_index": 1,
                    "is_required": True,
                    "options": {"choices": ["A", "B", "C"]}
                }
            ]
        }
        res = requests.post(f"{base_url}/api/surveys", json=payload)
        assert res.status_code == 200
        survey = res.json()
        cleanup_surveys(survey["id"])
        assert survey["title"] == "CRUD Test Survey"
        assert len(survey["questions"]) == 1

    def test_get_survey(self, base_url, cleanup_surveys):
        create_res = requests.post(f"{base_url}/api/surveys", json={
            "title": "Get Test", "description": "Test", "estimated_minutes": 1,
            "is_active": False, "questions": []
        })
        survey = create_res.json()
        cleanup_surveys(survey["id"])
        res = requests.get(f"{base_url}/api/surveys/{survey['id']}")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == survey["id"]

    def test_update_survey(self, base_url, cleanup_surveys):
        create_res = requests.post(f"{base_url}/api/surveys", json={
            "title": "Update Test", "description": "Before update",
            "estimated_minutes": 1, "is_active": False, "questions": []
        })
        survey = create_res.json()
        cleanup_surveys(survey["id"])
        update_res = requests.put(f"{base_url}/api/surveys/{survey['id']}", json={
            "title": "Updated Title", "description": "After update",
            "description_alignment": "left", "estimated_minutes": 2,
            "is_active": False, "questions": []
        })
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["title"] == "Updated Title"

    def test_delete_survey(self, base_url, cleanup_surveys):
        create_res = requests.post(f"{base_url}/api/surveys", json={
            "title": "Delete Test", "description": "To be deleted",
            "estimated_minutes": 1, "is_active": False, "questions": []
        })
        survey = create_res.json()
        cleanup_surveys(survey["id"])
        delete_res = requests.delete(f"{base_url}/api/surveys/{survey['id']}")
        assert delete_res.status_code == 200
        get_res = requests.get(f"{base_url}/api/surveys/{survey['id']}")
        assert get_res.status_code == 404

    def test_duplicate_survey(self, base_url, cleanup_surveys):
        create_res = requests.post(f"{base_url}/api/surveys", json={
            "title": "Duplicate Test", "description": "Original",
            "estimated_minutes": 1, "is_active": False,
            "questions": [
                {
                    "id": "temp-q1", "question_text": "Q1",
                    "type": "multiple_choice", "order_index": 1,
                    "is_required": True, "options": {"choices": ["A", "B"]}
                }
            ]
        })
        survey = create_res.json()
        cleanup_surveys(survey["id"])
        dup_res = requests.post(f"{base_url}/api/surveys/{survey['id']}/duplicate")
        assert dup_res.status_code == 200
        dup = dup_res.json()
        cleanup_surveys(dup["id"])
        assert dup["title"] == "Duplicate Test"
        assert dup["id"] != survey["id"]
        assert len(dup["questions"]) == len(survey["questions"])
