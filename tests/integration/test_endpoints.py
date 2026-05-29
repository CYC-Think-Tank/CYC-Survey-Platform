import requests
import pytest


class TestEndpoints:
    def test_results_endpoint(self, base_url):
        survey_id = "c1ef4af9-a2b2-43ad-8e08-defad3baeb35"
        res = requests.get(f"{base_url}/api/surveys/{survey_id}/results")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
