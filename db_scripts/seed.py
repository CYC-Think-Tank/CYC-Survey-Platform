import os
from supabase import create_client, Client

from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env.local")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def seed_db():
    print("Clearing existing data...")
    supabase.table("answers").delete().neq(
        "id", "00000000-0000-0000-0000-000000000000"
    ).execute()
    supabase.table("response_sessions").delete().neq(
        "id", "00000000-0000-0000-0000-000000000000"
    ).execute()
    supabase.table("questions").delete().neq(
        "id", "00000000-0000-0000-0000-000000000000"
    ).execute()
    supabase.table("surveys").delete().neq(
        "id", "00000000-0000-0000-0000-000000000000"
    ).execute()

    print("Inserting surveys...")
    surveys = (
        supabase.table("surveys")
        .insert(
            [
                {
                    "title": "Title",
                    "description": "test",
                    "estimated_minutes": 2,
                    "is_active": True,
                }
            ]
        )
        .execute()
    )

    survey_id = surveys.data[0]["id"]

    print("Inserting questions...")
    supabase.table("questions").insert(
        [
            {
                "survey_id": survey_id,
                "question_text": "hello",
                "type": "multiple_choice",
                "order_index": 1,
                "options": ["hello 1", "hello 2", "hello 3", "hello 4", "hello 5"],
                "is_required": True,
            },
            {
                "survey_id": survey_id,
                "question_text": "hello (max 3)",
                "type": "checkboxes",
                "order_index": 2,
                "options": {
                    "choices": ["hello 1", "hello 2", "hello 3", "hello 4", "hello 5"],
                    "max_selections": 3,
                },
                "is_required": True,
            },
            {
                "survey_id": survey_id,
                "question_text": "hello",
                "type": "rating_scale",
                "order_index": 3,
                "is_required": True,
            },
            {
                "survey_id": survey_id,
                "question_text": "hello",
                "type": "likert_scale",
                "order_index": 4,
                "is_required": True,
            },
            {
                "survey_id": survey_id,
                "question_text": "hello",
                "type": "short_answer",
                "order_index": 5,
                "is_required": False,
            },
        ]
    ).execute()

    print("Seeding complete!")


if __name__ == "__main__":
    seed_db()
