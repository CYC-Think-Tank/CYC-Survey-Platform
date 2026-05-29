import requests
import pytest


class TestAdminAuth:
    def test_admin_login_page_renders(self, base_url):
        res = requests.get(f"{base_url}/api/admin/raffle-email")
        assert res.status_code in [401, 403, 404]

    def test_surveys_list_public(self, base_url):
        res = requests.get(f"{base_url}/api/surveys")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
