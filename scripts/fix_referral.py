import os
import sys
from supabase import create_client, Client

# load env vars from .env.local
from dotenv import load_dotenv
load_dotenv(".env.local")

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(url, key)

code = "J9DbMtk"
email = "elaineryu@gmail.com"

# 1. Check if J9DbMtk is in share_links
share_link_res = supabase.table("share_links").select("*").eq("code", code).execute()

if not share_link_res.data:
    print(f"Share link {code} not found. We should find its survey_id from sessions.")
    # find survey_id from a session
    sess_res = supabase.table("response_sessions").select("survey_id").eq("referral_source", code).limit(1).execute()
    if sess_res.data:
        survey_id = sess_res.data[0]["survey_id"]
        # Insert
        print(f"Inserting into share_links for survey {survey_id}")
        supabase.table("share_links").insert({
            "code": code,
            "label": email,
            "email": email,
            "survey_id": survey_id
        }).execute()
    else:
        print(f"No sessions found for {code}")
        sys.exit(1)
else:
    print(f"Found share link, updating email to {email}")
    supabase.table("share_links").update({"email": email}).eq("code", code).execute()

# 2. Add raffle entries
# Find all completed sessions for this code
sessions_res = supabase.table("response_sessions").select("id, survey_id, email").eq("referral_source", code).eq("is_completed", True).execute()

added = 0
for session in sessions_res.data:
    if session["email"] == email:
        continue # self referral
    
    # check if entry already exists
    existing = supabase.table("raffle_entries").select("id").eq("session_id", session["id"]).eq("email", email).eq("is_referral", True).execute()
    if not existing.data:
        supabase.table("raffle_entries").insert({
            "email": email,
            "survey_id": session["survey_id"],
            "session_id": session["id"],
            "is_referral": True
        }).execute()
        added += 1

print(f"Added {added} missing raffle entries for {email}.")
