import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path=".env.local")
supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

res = supabase.table("surveys").select("id, title").execute()
for row in res.data:
    print(f"ID: {row['id']} | Title: {row['title']}")
