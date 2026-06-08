import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(dotenv_path=".env.local")
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

try:
    res = supabase.table("share_links").insert({"code": "GLOBAL1", "label": "Global Test"}).execute()
    print("Insert null survey_id succeeded:", res.data)
except Exception as e:
    print("Insert null survey_id failed:", str(e))
    
