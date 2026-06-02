import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

try:
    res = supabase.table("answers").insert({"time_spent": 100}).execute()
    print("Insert success")
except Exception as e:
    print("Insert error:", str(e))
