import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

try:
    res = supabase.table("ai_analyses").select("*").limit(1).execute()
    print("AI Analyses Query Successful. Row keys:", res.data[0].keys() if res.data else "Empty but table exists")
except Exception as e:
    print("Error querying ai_analyses:", e)
