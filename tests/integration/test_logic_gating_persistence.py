"""
Integration test: Logic Gating Persistence through Survey Activation/Publish.
Requires:
    - API server running (uvicorn api.index:app)
    - Valid Supabase credentials in .env.local
"""

import requests
import pytest


class TestLogicGatingPersistence:
    @pytest.fixture
    def created_survey(self, base_url, cleanup_surveys):
        """Create a survey with logic gates and clean it up after."""
        payload = {
            "title": "Test Logic Gates - Create",
            "description": "Testing logic gate persistence on create",
            "estimated_minutes": 5,
            "is_active": False,
            "questions": [
                {
                    "id": "temp-q0",
                    "question_text": "What is your favorite color?",
                    "type": "multiple_choice",
                    "order_index": 1,
                    "is_required": True,
                    "is_conditional": False,
                    "options": {
                        "choices": ["Red", "Blue", "Green"],
                        "has_other": False,
                        "randomize_options": False,
                        "locked_choices": [],
                        "logic_gates": [],
                        "logic_gate_match_type": "all",
                    }
                },
                {
                    "id": "temp-q1",
                    "question_text": "Why did you choose that color?",
                    "type": "multiple_line",
                    "order_index": 2,
                    "is_required": False,
                    "is_conditional": False,
                    "options": {
                        "logic_gates": [
                            {"question_id": "temp-q0", "condition_type": "equals", "value": "Blue"}
                        ],
                        "logic_gate_match_type": "any"
                    }
                },
                {
                    "id": "temp-q2",
                    "question_text": "Rate your satisfaction",
                    "type": "rating_scale",
                    "order_index": 3,
                    "is_required": True,
                    "is_conditional": False,
                    "options": {
                        "logic_gates": [
                            {"question_id": "temp-q0", "condition_type": "equals", "value": "Red"}
                        ],
                        "logic_gate_match_type": "all"
                    }
                }
            ]
        }

        res = requests.post(f"{base_url}/api/surveys", json=payload)
        assert res.status_code == 200, f"Create survey failed: {res.text}"
        survey = res.json()
        cleanup_surveys(survey["id"])
        return survey

    def _get_logic_gates(self, q):
        opts = q.get("options", {})
        if not opts or not isinstance(opts, dict):
            return []
        return opts.get("logic_gates", [])

    def _get_match_type(self, q):
        opts = q.get("options", {})
        if not opts or not isinstance(opts, dict):
            return "all"
        return opts.get("logic_gate_match_type", "all")

    def test_create_preserves_logic_gates(self, created_survey):
        survey = created_survey
        assert len(survey["questions"]) == 3

        q0 = survey["questions"][0]
        assert self._get_logic_gates(q0) == []
        assert self._get_match_type(q0) == "all"

        q1 = survey["questions"][1]
        gates1 = self._get_logic_gates(q1)
        assert len(gates1) == 1
        assert gates1[0]["condition_type"] == "equals"
        assert gates1[0]["value"] == "Blue"
        assert gates1[0]["question_id"] == q0["id"]
        assert self._get_match_type(q1) == "any"

        q2 = survey["questions"][2]
        gates2 = self._get_logic_gates(q2)
        assert len(gates2) == 1
        assert gates2[0]["value"] == "Red"
        assert gates2[0]["question_id"] == q0["id"]
        assert self._get_match_type(q2) == "all"

    def test_get_preserves_logic_gates(self, base_url, created_survey):
        survey_id = created_survey["id"]
        res = requests.get(f"{base_url}/api/surveys/{survey_id}")
        assert res.status_code == 200

        survey = res.json()
        q0_id = survey["questions"][0]["id"]
        q1 = survey["questions"][1]
        q2 = survey["questions"][2]

        gates1 = self._get_logic_gates(q1)
        assert len(gates1) == 1
        assert gates1[0]["value"] == "Blue"
        assert gates1[0]["question_id"] == q0_id
        assert self._get_match_type(q1) == "any"

        gates2 = self._get_logic_gates(q2)
        assert len(gates2) == 1
        assert self._get_match_type(q2) == "all"

    def test_update_preserves_logic_gates(self, base_url, created_survey):
        survey = created_survey
        survey_id = survey["id"]
        q0_id = survey["questions"][0]["id"]

        q1 = survey["questions"][1]
        q1_updated_options = q1["options"].copy()
        q1_updated_options["logic_gates"] = [
            q1["options"]["logic_gates"][0],
            {"question_id": q0_id, "condition_type": "equals", "value": "Red"}
        ]
        q1_updated_options["logic_gate_match_type"] = "all"

        update_payload = {
            "title": survey["title"] + " (Updated)",
            "description": survey["description"],
            "description_alignment": survey.get("description_alignment", "left"),
            "estimated_minutes": survey["estimated_minutes"],
            "is_active": False,
            "thumbnail_url": survey.get("thumbnail_url"),
            "questions": [
                {**survey["questions"][0], "id": survey["questions"][0]["id"]},
                {**survey["questions"][1], "options": q1_updated_options, "id": survey["questions"][1]["id"]},
                {**survey["questions"][2], "id": survey["questions"][2]["id"]},
            ]
        }

        res = requests.put(f"{base_url}/api/surveys/{survey_id}", json=update_payload)
        assert res.status_code == 200, f"Update survey failed: {res.text}"

        updated_survey = res.json()
        assert updated_survey["questions"][0]["id"] == q0_id

        q1_updated = updated_survey["questions"][1]
        gates = self._get_logic_gates(q1_updated)
        assert len(gates) == 2
        assert self._get_match_type(q1_updated) == "all"
        assert gates[0]["question_id"] == q0_id
        assert gates[1]["question_id"] == q0_id

        q2_updated = updated_survey["questions"][2]
        gates2 = self._get_logic_gates(q2_updated)
        assert len(gates2) == 1

    def test_duplicate_remaps_logic_gates(self, base_url, created_survey):
        survey = created_survey
        survey_id = survey["id"]
        orig_q0_id = survey["questions"][0]["id"]
        orig_q1 = survey["questions"][1]
        orig_q2 = survey["questions"][2]

        res = requests.post(f"{base_url}/api/surveys/{survey_id}/duplicate")
        assert res.status_code == 200, f"Duplicate survey failed: {res.text}"

        dup = res.json()
        dup_q0_id = dup["questions"][0]["id"]
        dup_q1 = dup["questions"][1]
        dup_q2 = dup["questions"][2]

        assert dup_q0_id != orig_q0_id
        assert dup_q1["id"] != orig_q1["id"]
        assert dup_q2["id"] != orig_q2["id"]

        dup_q1_gates = self._get_logic_gates(dup_q1)
        assert len(dup_q1_gates) == len(self._get_logic_gates(orig_q1))
        assert dup_q1_gates[0]["question_id"] == dup_q0_id

        dup_q2_gates = self._get_logic_gates(dup_q2)
        assert dup_q2_gates[0]["question_id"] == dup_q0_id
        assert self._get_match_type(dup_q1) == "all"
        assert self._get_match_type(dup_q2) == "all"

    def test_toggle_active_preserves_logic_gates(self, base_url, created_survey):
        survey_id = created_survey["id"]
        res = requests.patch(f"{base_url}/api/surveys/{survey_id}/toggle")
        assert res.status_code == 200

        toggled = res.json()
        assert toggled["is_active"] is True
        assert toggled.get("has_been_published", False) is True

        res = requests.get(f"{base_url}/api/surveys/{survey_id}")
        assert res.status_code == 200

        survey = res.json()
        q1 = survey["questions"][1]
        gates1 = self._get_logic_gates(q1)
        assert len(gates1) == 2
        assert self._get_match_type(q1) == "all"

        q2 = survey["questions"][2]
        gates2 = self._get_logic_gates(q2)
        assert len(gates2) == 1

    def test_create_active_with_logic_gates(self, base_url, cleanup_surveys):
        payload = {
            "title": "Test Logic Gates - Create Active",
            "description": "Testing logic gate persistence on create with is_active=True",
            "estimated_minutes": 5,
            "is_active": True,
            "questions": [
                {
                    "id": "temp-active-q0",
                    "question_text": "Choose one",
                    "type": "multiple_choice",
                    "order_index": 1,
                    "is_required": True,
                    "is_conditional": False,
                    "options": {"choices": ["X", "Y", "Z"]}
                },
                {
                    "id": "temp-active-q1",
                    "question_text": "Follow up question",
                    "type": "multiple_line",
                    "order_index": 2,
                    "is_required": False,
                    "is_conditional": False,
                    "options": {
                        "logic_gates": [
                            {"question_id": "temp-active-q0", "condition_type": "equals", "value": "X"}
                        ],
                        "logic_gate_match_type": "any"
                    }
                }
            ]
        }

        res = requests.post(f"{base_url}/api/surveys", json=payload)
        assert res.status_code == 200, f"Create active survey failed: {res.text}"

        survey = res.json()
        cleanup_surveys(survey["id"])
        assert survey["is_active"] is True

        q0 = survey["questions"][0]
        q1 = survey["questions"][1]
        gates = self._get_logic_gates(q1)
        assert len(gates) == 1
        assert gates[0]["condition_type"] == "equals"
        assert gates[0]["value"] == "X"
        assert gates[0]["question_id"] == q0["id"]
        assert self._get_match_type(q1) == "any"

    def test_no_logic_gates_defaults(self, base_url, created_survey):
        survey_id = created_survey["id"]
        res = requests.get(f"{base_url}/api/surveys/{survey_id}")
        assert res.status_code == 200

        survey = res.json()
        q0 = survey["questions"][0]
        gates = self._get_logic_gates(q0)
        assert gates == []
