"""
Test: Logic Gating Persistence through Survey Activation/Publish

This test verifies that logic_gates and logic_gate_match_type in question options
persist through the full survey lifecycle: create -> update -> toggle activation.

Usage:
    python test_logic_gating_persistence.py [--url http://localhost:8000]

Requires:
    - API server running (uvicorn api.index:app)
    - Valid Supabase credentials in .env.local

Test flow:
    1. Create a survey with logic-gated questions, is_active=False
    2. GET the survey, verify logic gates are present
    3. Update the survey (simulate edit), verify logic gates are preserved
    4. Toggle the survey active, GET again, verify logic gates are still present
    5. Create another survey with is_active=True (immediate publish)
    6. GET it, verify logic gates are present
"""

import requests
import json
import sys
import argparse
from typing import Dict, Any, List


def assert_eq(actual, expected, msg=""):
    if actual != expected:
        raise AssertionError(f"{msg}: expected={expected!r}, got={actual!r}")


def assert_true(cond, msg=""):
    if not cond:
        raise AssertionError(f"Assertion failed: {msg}")


def get_logic_gates_from_question(q: Dict[str, Any]) -> List[Dict]:
    """Extract logic_gates from a question's options."""
    opts = q.get("options")
    if not opts or not isinstance(opts, dict):
        return []
    return opts.get("logic_gates", [])


def get_logic_gate_match_type(q: Dict[str, Any]) -> str:
    """Extract logic_gate_match_type from a question's options."""
    opts = q.get("options")
    if not opts or not isinstance(opts, dict):
        return "all"
    return opts.get("logic_gate_match_type", "all")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    args = parser.parse_args()
    base_url = args.url.rstrip("/")

    print(f"Testing against: {base_url}")
    print("=" * 60)

    created_survey_ids = []
    passed = 0
    failed = 0

    def run_test(name, fn):
        nonlocal passed, failed
        try:
            fn()
            print(f"  PASS: {name}")
            passed += 1
        except Exception as e:
            print(f"  FAIL: {name}: {e}")
            failed += 1

    def cleanup():
        for sid in created_survey_ids:
            try:
                requests.delete(f"{base_url}/api/surveys/{sid}")
            except Exception:
                pass

    try:
        # ============================================================
        # Test 1: Create survey (is_active=False) with logic gates,
        #         then GET and verify
        # ============================================================
        def test_create_with_logic_gates():
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
                                {
                                    "question_id": "temp-q0",
                                    "condition_type": "equals",
                                    "value": "Blue"
                                }
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
                                {
                                    "question_id": "temp-q0",
                                    "condition_type": "equals",
                                    "value": "Red"
                                }
                            ],
                            "logic_gate_match_type": "all"
                        }
                    }
                ]
            }

            # Fix placeholder IDs with actual question IDs after creation
            res = requests.post(f"{base_url}/api/surveys", json=payload)
            assert_eq(res.status_code, 200, f"Create survey failed: {res.text}")

            survey = res.json()
            created_survey_ids.append(survey["id"])
            assert_true(len(survey["questions"]) == 3, "Should have 3 questions")

            # Question 0: No logic gates
            q0 = survey["questions"][0]
            assert_eq(get_logic_gates_from_question(q0), [], "Q0 should have no logic gates")
            assert_eq(get_logic_gate_match_type(q0), "all", "Q0 match type should be all")

            # Question 1: Has logic gates (any match) - question_id should be remapped to real UUID
            q1 = survey["questions"][1]
            gates1 = get_logic_gates_from_question(q1)
            assert_eq(len(gates1), 1, "Q1 should have 1 logic gate")
            assert_eq(gates1[0]["condition_type"], "equals")
            assert_eq(gates1[0]["value"], "Blue")
            assert_eq(get_logic_gate_match_type(q1), "any", "Q1 match type should be any")
            # The question_id should have been remapped from "temp-q0" to q0's real UUID
            assert_eq(gates1[0]["question_id"], q0["id"],
                       "Q1 gate should reference Q0's real UUID after create remapping")

            # Question 2: Has logic gates (all match) - also remapped
            q2 = survey["questions"][2]
            gates2 = get_logic_gates_from_question(q2)
            assert_eq(len(gates2), 1, "Q2 should have 1 logic gate")
            assert_eq(gates2[0]["value"], "Red")
            assert_eq(get_logic_gate_match_type(q2), "all", "Q2 match type should be all")
            assert_eq(gates2[0]["question_id"], q0["id"],
                       "Q2 gate should reference Q0's real UUID after create remapping")

        run_test("Create survey with logic gates (inactive)", test_create_with_logic_gates)
        created_id = created_survey_ids[0]

        # ============================================================
        # Test 2: GET the survey by ID, verify logic gates are present
        # ============================================================
        def test_get_survey_logic_gates():
            res = requests.get(f"{base_url}/api/surveys/{created_id}")
            assert_eq(res.status_code, 200, f"GET survey failed: {res.text}")

            survey = res.json()
            q0_id = survey["questions"][0]["id"]
            q1 = survey["questions"][1]
            q2 = survey["questions"][2]

            gates1 = get_logic_gates_from_question(q1)
            assert_eq(len(gates1), 1, "Q1 should still have 1 logic gate after GET")
            assert_eq(gates1[0]["value"], "Blue")
            assert_eq(gates1[0]["question_id"], q0_id, "Q1 gate question_id should still be real UUID after GET")
            assert_eq(get_logic_gate_match_type(q1), "any")

            gates2 = get_logic_gates_from_question(q2)
            assert_eq(len(gates2), 1, "Q2 should still have 1 logic gate after GET")
            assert_eq(get_logic_gate_match_type(q2), "all")

        run_test("GET survey preserves logic gates", test_get_survey_logic_gates)

        # ============================================================
        # Test 3: Update survey (simulate edit), verify logic gates
        #         are preserved through delete+recreate
        # ============================================================
        def test_update_survey_preserves_logic_gates():
            res = requests.get(f"{base_url}/api/surveys/{created_id}")
            survey = res.json()

            q0 = survey["questions"][0]
            q0_id_before = q0["id"]

            # Add another logic gate to Q1
            q1 = survey["questions"][1]
            q1_updated_options = json.loads(json.dumps(q1["options"]))
            q1_updated_options["logic_gates"] = [
                q1["options"]["logic_gates"][0],
                {
                    "question_id": q0["id"],
                    "condition_type": "equals",
                    "value": "Red"
                }
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

            res = requests.put(f"{base_url}/api/surveys/{created_id}", json=update_payload)
            assert_eq(res.status_code, 200, f"Update survey failed: {res.text}")

            updated_survey = res.json()

            # Verify UUIDs are PRESERVED (not regenerated)
            assert_eq(updated_survey["questions"][0]["id"], q0_id_before,
                       "Q0 UUID should be preserved across update")

            q1_updated = updated_survey["questions"][1]
            gates = get_logic_gates_from_question(q1_updated)
            assert_eq(len(gates), 2, "Q1 should have 2 logic gates after update")
            assert_eq(get_logic_gate_match_type(q1_updated), "all",
                       "Q1 match type should be 'all' after update")
            # Both gates should reference q0's UUID (which is preserved)
            assert_eq(gates[0]["question_id"], q0_id_before,
                       "Q1 gate[0] should still reference Q0 UUID after update")
            assert_eq(gates[1]["question_id"], q0_id_before,
                       "Q1 gate[1] should reference Q0 UUID after update")

            q2_updated = updated_survey["questions"][2]
            gates2 = get_logic_gates_from_question(q2_updated)
            assert_eq(len(gates2), 1, "Q2 should still have 1 logic gate after update")

        run_test("Update survey preserves logic gates", test_update_survey_preserves_logic_gates)

        # ============================================================
        # Test 4: Duplicate survey, verify logic gates are remapped
        #         to new question UUIDs
        # ============================================================
        def test_duplicate_preserves_and_remaps_logic_gates():
            res = requests.get(f"{base_url}/api/surveys/{created_id}")
            survey = res.json()

            orig_q0_id = survey["questions"][0]["id"]
            orig_q1 = survey["questions"][1]
            orig_q2 = survey["questions"][2]

            orig_q1_gates = get_logic_gates_from_question(orig_q1)
            orig_q2_gates = get_logic_gates_from_question(orig_q2)

            # Original Q1 gates should reference Q0
            assert_eq(orig_q1_gates[0]["question_id"], orig_q0_id,
                       "Original Q1 gate should reference orig Q0")

            # Duplicate the survey
            res = requests.post(f"{base_url}/api/surveys/{created_id}/duplicate")
            assert_eq(res.status_code, 200, f"Duplicate survey failed: {res.text}")

            dup = res.json()
            created_survey_ids.append(dup["id"])

            dup_q0_id = dup["questions"][0]["id"]
            dup_q1 = dup["questions"][1]
            dup_q2 = dup["questions"][2]

            # New UUIDs should be different from original
            assert_true(dup_q0_id != orig_q0_id, "Duplicate Q0 should have new UUID")
            assert_true(dup_q1["id"] != orig_q1["id"], "Duplicate Q1 should have new UUID")
            assert_true(dup_q2["id"] != orig_q2["id"], "Duplicate Q2 should have new UUID")

            # Duplicate Q1 gates should reference DUPLICATE Q0 (not original Q0)
            dup_q1_gates = get_logic_gates_from_question(dup_q1)
            assert_eq(len(dup_q1_gates), len(orig_q1_gates),
                       "Duplicate Q1 should have same number of gates")
            assert_eq(dup_q1_gates[0]["question_id"], dup_q0_id,
                       "Duplicate Q1 gate should reference duplicate Q0 UUID, not original")

            # Duplicate Q2 gates should also reference DUPLICATE Q0
            dup_q2_gates = get_logic_gates_from_question(dup_q2)
            assert_eq(len(dup_q2_gates), len(orig_q2_gates),
                       "Duplicate Q2 should have same number of gates")
            assert_eq(dup_q2_gates[0]["question_id"], dup_q0_id,
                       "Duplicate Q2 gate should reference duplicate Q0 UUID")

            # Verify match type is preserved
            assert_eq(get_logic_gate_match_type(dup_q1), "all",
                       "Duplicate Q1 match type should be preserved")
            assert_eq(get_logic_gate_match_type(dup_q2), "all",
                       "Duplicate Q2 match type should be preserved")

        run_test("Duplicate remaps logic gate question_ids", test_duplicate_preserves_and_remaps_logic_gates)

        # ============================================================
        # Test 5: Toggle survey active, then GET and verify
        #         logic gates are still present
        # ============================================================
        def test_toggle_active_preserves_logic_gates():
            # Toggle: inactive -> active
            res = requests.patch(f"{base_url}/api/surveys/{created_id}/toggle")
            assert_eq(res.status_code, 200, f"Toggle survey failed: {res.text}")

            toggled = res.json()
            assert_true(toggled["is_active"], "Survey should be active after toggle")
            assert_true(toggled.get("has_been_published", False),
                        "Survey should be published after toggle")

            # GET the survey, verify logic gates
            res = requests.get(f"{base_url}/api/surveys/{created_id}")
            assert_eq(res.status_code, 200, f"GET after toggle failed: {res.text}")

            survey = res.json()
            q1 = survey["questions"][1]
            gates1 = get_logic_gates_from_question(q1)
            assert_eq(len(gates1), 2, "Q1 logic gates should persist after toggle")
            assert_eq(get_logic_gate_match_type(q1), "all")

            q2 = survey["questions"][2]
            gates2 = get_logic_gates_from_question(q2)
            assert_eq(len(gates2), 1, "Q2 logic gates should persist after toggle")

        run_test("Toggle active preserves logic gates", test_toggle_active_preserves_logic_gates)

        # ============================================================
        # Test 6: Create survey WITH is_active=True (immediate publish)
        #         and verify logic gates are present
        # ============================================================
        def test_create_active_with_logic_gates():
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
                        "options": {
                            "choices": ["X", "Y", "Z"],
                            "has_other": False,
                            "randomize_options": False,
                            "locked_choices": [],
                        }
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
                                {
                                    "question_id": "temp-active-q0",
                                    "condition_type": "equals",
                                    "value": "X"
                                }
                            ],
                            "logic_gate_match_type": "any"
                        }
                    }
                ]
            }

            res = requests.post(f"{base_url}/api/surveys", json=payload)
            assert_eq(res.status_code, 200, f"Create active survey failed: {res.text}")

            survey = res.json()
            created_survey_ids.append(survey["id"])
            assert_true(survey["is_active"], "Survey should be active")

            q0 = survey["questions"][0]
            q1 = survey["questions"][1]
            gates = get_logic_gates_from_question(q1)
            assert_eq(len(gates), 1, "Q1 should have 1 logic gate on active create")
            assert_eq(gates[0]["condition_type"], "equals")
            assert_eq(gates[0]["value"], "X")
            assert_eq(gates[0]["question_id"], q0["id"],
                       "Gate should reference Q0's real UUID after create remapping (active)")
            assert_eq(get_logic_gate_match_type(q1), "any")

            # Verify via GET
            res = requests.get(f"{base_url}/api/surveys/{survey['id']}")
            assert_eq(res.status_code, 200)

            survey2 = res.json()
            q1_get = survey2["questions"][1]
            gates_get = get_logic_gates_from_question(q1_get)
            assert_eq(len(gates_get), 1, "Q1 logic gates should persist on GET after active create")

        run_test("Create active survey preserves logic gates", test_create_active_with_logic_gates)

        # ============================================================
        # Test 7: Verify that questions WITHOUT logic gates
        #         still default to empty (backward compat)
        # ============================================================
        def test_no_logic_gates_defaults():
            res = requests.get(f"{base_url}/api/surveys/{created_survey_ids[0]}")
            survey = res.json()

            q0 = survey["questions"][0]
            gates = get_logic_gates_from_question(q0)
            assert_eq(gates, [], "Q0 should have empty logic gates (backward compat)")

        run_test("Questions without logic gates default to empty", test_no_logic_gates_defaults)

    finally:
        cleanup()
        print("-" * 60)
        print(f"Results: {passed} passed, {failed} failed, {passed + failed} total")
        if failed > 0:
            sys.exit(1)


if __name__ == "__main__":
    main()
