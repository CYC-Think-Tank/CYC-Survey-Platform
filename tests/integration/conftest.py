import pytest
import os


@pytest.fixture(scope="session")
def base_url():
    return os.environ.get("CYC_API_URL", "http://127.0.0.1:8000")


@pytest.fixture
def auth_headers():
    return {}


@pytest.fixture
def cleanup_surveys(base_url):
    """Context manager that tracks created survey IDs and deletes them in teardown."""
    created_ids = []

    def track(survey_id: str):
        created_ids.append(survey_id)
        return survey_id

    yield track

    # Teardown: delete all created surveys
    import requests
    for sid in created_ids:
        try:
            requests.delete(f"{base_url}/api/surveys/{sid}")
        except Exception:
            pass
