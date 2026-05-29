import requests
import pytest
import time


class TestLimit:
    def test_summary_response_time(self, base_url):
        survey_id = "c1ef4af9-a2b2-43ad-8e08-defad3baeb35"
        t0 = time.time()
        res = requests.get(f"{base_url}/api/surveys/{survey_id}/summary")
        elapsed = time.time() - t0
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        print(f"Time: {elapsed:.2f}s")
        assert elapsed < 10, f"Summary endpoint took too long: {elapsed:.2f}s"
