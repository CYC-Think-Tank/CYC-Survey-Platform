import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import requests
import json

url = "http://localhost:8000/api/surveys/1114fdd1-7a8a-4473-b066-90f31d910f5f/responses"
payload = {
    "email": "testref@example.com",
    "answers": [],
    "language": "en",
    "referral_source": "KRhJwPj"
}
headers = {'Content-Type': 'application/json'}
try:
    response = requests.post(url, json=payload, headers=headers)
    print("Status:", response.status_code)
    print("Response:", response.text)
except Exception as e:
    print("Error:", e)
