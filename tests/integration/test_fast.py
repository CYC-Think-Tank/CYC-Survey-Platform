import requests
import pytest
import time


class TestFast:
    def test_results_endpoint(self, base_url):
        survey_id = "c1ef4af9-a2b2-43ad-8e08-defad3baeb35"
        t0 = time.time()
        res = requests.get(f"{base_url}/api/surveys/{survey_id}/results")
        elapsed = time.time() - t0
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        print(f"Time: {elapsed:.2f}s")
        data = res.json()
        assert "total_responses" in data, "Missing total_responses in results"

    def test_summary_endpoint(self, base_url):
        survey_id = "c1ef4af9-a2b2-43ad-8e08-defad3baeb35"
        t0 = time.time()
        res = requests.get(f"{base_url}/api/surveys/{survey_id}/summary")
        elapsed = time.time() - t0
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        print(f"Time: {elapsed:.2f}s")
        data = res.json()
        assert len(data.keys()) > 0, "Summary returned no question keys"

    def test_paginated_responses_endpoint(self, base_url):
        survey_id = "c1ef4af9-a2b2-43ad-8e08-defad3baeb35"
        t0 = time.time()
        res = requests.get(f"{base_url}/api/surveys/{survey_id}/responses/paginated?offset=0&limit=1")
        elapsed = time.time() - t0
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        print(f"Time: {elapsed:.2f}s")
        data = res.json()
        assert "total" in data, "Missing total in paginated responses"
        assert "responses" in data, "Missing responses list in paginated responses"
        assert len(data.get("responses", [])) <= 1, "Paginated responses exceeded limit"
