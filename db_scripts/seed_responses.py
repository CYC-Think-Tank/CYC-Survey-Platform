import argparse
import os
import random
import uuid
from datetime import datetime

from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path=".env.local")
supabase = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

SURVEY_ID = "c1ef4af9-a2b2-43ad-8e08-defad3baeb35"


def seed_survey(num_responses: int) -> None:
    print(f"Fetching questions for survey {SURVEY_ID}...")
    res = supabase.table("questions").select("*").eq("survey_id", SURVEY_ID).execute()
    questions = res.data

    print(f"Generating {num_responses} sessions...")
    sessions_data = []
    for _ in range(num_responses):
        sessions_data.append(
            {
                "id": str(uuid.uuid4()),
                "survey_id": SURVEY_ID,
                "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
                "is_completed": True,
                "completed_at": datetime.utcnow().isoformat(),
                "is_valid": True,
                "weight": 1.0,
            }
        )

    print("Inserting sessions in batches...")
    batch_size = 500
    for i in range(0, len(sessions_data), batch_size):
        batch = sessions_data[i : i + batch_size]
        supabase.table("response_sessions").insert(batch).execute()

    print("Generating answers...")
    answers_data = []
    for session in sessions_data:
        for q in questions:
            q_type = q["type"]
            if q_type == "section_header":
                continue

            ans = {
                "session_id": session["id"],
                "question_id": q["id"],
            }

            opts = q.get("options") or {}
            choices = opts.get("choices", []) if isinstance(opts, dict) else []

            if q_type in ["multiple_choice", "dropdown"]:
                if choices:
                    ans["answer_text"] = random.choice(choices)
                else:
                    ans["answer_text"] = "Option " + str(random.randint(1, 4))
            elif q_type == "checkboxes":
                if choices:
                    k = random.randint(1, min(3, len(choices)))
                    ans["answer_options"] = random.sample(choices, k)
                else:
                    ans["answer_options"] = ["Option 1"]
            elif q_type in ["likert_scale", "rating_scale"]:
                ans["answer_numeric"] = random.randint(1, 5)
            elif q_type == "short_answer":
                ans["answer_text"] = random.choice(
                    [
                        "Good idea",
                        "Bad idea",
                        "Needs more planning",
                        "No comment",
                        "I strongly support this",
                    ]
                )

            answers_data.append(ans)

    print(f"Total answers to insert: {len(answers_data)}")
    print("Inserting answers in batches...")
    for i in range(0, len(answers_data), batch_size):
        batch = answers_data[i : i + batch_size]
        supabase.table("answers").upsert(
            batch, on_conflict="session_id,question_id"
        ).execute()

    print(f"✅ Success! {num_responses} test responses added.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed test survey responses")
    parser.add_argument(
        "--count",
        type=int,
        default=1000,
        help="Number of responses to generate (default: 1000)",
    )
    args = parser.parse_args()
    seed_survey(args.count)
