import os

from dotenv import load_dotenv
from supabase import Client, create_client

from api.local_supabase import LocalSupabaseClient

load_dotenv(dotenv_path=".env.local")

LOCAL_DB = os.environ.get("LOCAL_DB")
if LOCAL_DB:
    supabase = LocalSupabaseClient(LOCAL_DB)
else:
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
