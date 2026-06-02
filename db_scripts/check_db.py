import os
from supabase import create_client

from dotenv import load_dotenv

load_dotenv(".env.local")

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

try:
    res = supabase.table("answers").select("time_spent").limit(1).execute()
    print("Answers time_spent query successful:", res.data)
except Exception as e:
    print("Error querying time_spent:", str(e))
