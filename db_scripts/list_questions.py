import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path=".env.local")
supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

res = (
    supabase.table("questions")
    .select("*")
    .eq("survey_id", "c1ef4af9-a2b2-43ad-8e08-defad3baeb35")
    .execute()
)
for row in res.data:
    print(f"ID: {row['id']} | Type: {row['type']} | Options: {row.get('options')}")
