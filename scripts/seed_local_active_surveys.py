#!/usr/bin/env python3
"""Generate random response data for active surveys in local Supabase.

This script is intentionally local-only. It refuses to run unless the Supabase
URL points at localhost/127.0.0.1, and it never loads .env.local.
"""

from __future__ import annotations

import argparse
import os
import random
import string
import subprocess
import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from dotenv import dotenv_values
from supabase import create_client

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
DEFAULT_BATCH_SIZE = 500
DEFAULT_RESPONSES_PER_SURVEY = 1000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Append randomly generated sessions and answers to active surveys "
            "in a local Supabase instance."
        )
    )
    parser.add_argument(
        "--url",
        default=os.environ.get("LOCAL_SUPABASE_URL"),
        help="Local Supabase API URL, e.g. http://127.0.0.1:54321.",
    )
    parser.add_argument(
        "--key",
        default=(
            os.environ.get("LOCAL_SUPABASE_SERVICE_ROLE_KEY")
            or os.environ.get("LOCAL_SUPABASE_ANON_KEY")
        ),
        help="Local Supabase anon or service-role key.",
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        help=(
            "Optional local-only env file to read LOCAL_SUPABASE_URL and "
            "LOCAL_SUPABASE_SERVICE_ROLE_KEY/LOCAL_SUPABASE_ANON_KEY from. "
            "The production .env.local file is rejected."
        ),
    )
    parser.add_argument(
        "--use-supabase-status",
        action="store_true",
        help=(
            "Read the local Supabase URL/key from `npx supabase status`. "
            "The resulting URL is still validated as localhost-only before use."
        ),
    )
    parser.add_argument(
        "--responses-per-survey",
        type=int,
        default=DEFAULT_RESPONSES_PER_SURVEY,
        help=f"Generated completed sessions per active survey. Default: {DEFAULT_RESPONSES_PER_SURVEY}.",
    )
    parser.add_argument(
        "--active-survey-limit",
        type=int,
        default=3,
        help="Maximum number of active surveys to populate. Default: 3.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=20260628,
        help="Random seed for reproducible generated data.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Read local survey metadata and print planned inserts without writing.",
    )
    return parser.parse_args()


def load_supabase_status(args: argparse.Namespace) -> None:
    if not args.use_supabase_status:
        return

    status = subprocess.check_output(
        ["npx", "supabase", "status"],
        text=True,
    )
    for line in status.splitlines():
        stripped = line.strip()
        if stripped.startswith("│ Project URL │") and not args.url:
            args.url = stripped.split("│")[2].strip()
        elif stripped.startswith("│ Secret      │") and not args.key:
            args.key = stripped.split("│")[2].strip()


def load_explicit_env_file(args: argparse.Namespace) -> None:
    if args.env_file is None:
        return

    env_path = args.env_file.resolve()
    if env_path.name == ".env.local":
        raise SystemExit(
            "Refusing to load .env.local. Use a local-only file such as "
            ".env.local.supabase instead."
        )
    if not env_path.exists():
        raise SystemExit(f"Env file does not exist: {env_path}")

    env_values = dotenv_values(env_path)
    args.url = args.url or env_values.get("LOCAL_SUPABASE_URL")
    args.key = (
        args.key
        or env_values.get("LOCAL_SUPABASE_SERVICE_ROLE_KEY")
        or env_values.get("LOCAL_SUPABASE_ANON_KEY")
    )


def assert_local_supabase_url(url: str | None) -> str:
    if not url:
        raise SystemExit(
            "Missing local Supabase URL. Pass --url or set LOCAL_SUPABASE_URL."
        )

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise SystemExit(f"Supabase URL must be http(s), got: {parsed.scheme!r}")
    if parsed.hostname not in LOCAL_HOSTS:
        raise SystemExit(
            "Refusing to seed a non-local Supabase URL. "
            f"Host was {parsed.hostname!r}; expected localhost or 127.0.0.1."
        )
    if parsed.port not in {54321, 8000, None}:
        print(
            f"Warning: local Supabase URL uses port {parsed.port}, not the default 54321.",
            file=sys.stderr,
        )
    return url.rstrip("/")


def assert_key(key: str | None) -> str:
    if not key:
        raise SystemExit(
            "Missing local Supabase key. Pass --key or set "
            "LOCAL_SUPABASE_SERVICE_ROLE_KEY/LOCAL_SUPABASE_ANON_KEY."
        )
    return key


def table_select_all(client: Any, table: str, columns: str = "*") -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    start = 0
    page_size = 1000

    while True:
        response = (
            client.table(table)
            .select(columns)
            .range(start, start + page_size - 1)
            .execute()
        )
        batch = response.data or []
        rows.extend(batch)
        if len(batch) < page_size:
            return rows
        start += page_size


def insert_batches(
    client: Any,
    table: str,
    rows: list[dict[str, Any]],
    *,
    batch_size: int = DEFAULT_BATCH_SIZE,
    dry_run: bool = False,
) -> None:
    if dry_run:
        print(f"[dry-run] Would insert {len(rows)} rows into {table}.")
        return

    for start in range(0, len(rows), batch_size):
        batch = rows[start : start + batch_size]
        client.table(table).insert(batch).execute()


def active_surveys(client: Any, limit: int) -> list[dict[str, Any]]:
    surveys = (
        client.table("surveys")
        .select("id,title,is_active,created_at")
        .eq("is_active", True)
        .order("created_at")
        .limit(limit)
        .execute()
    ).data or []
    return surveys


def questions_by_survey(client: Any, survey_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
    all_questions = table_select_all(
        client,
        "questions",
        "id,survey_id,question_text,type,order_index,options,is_required,is_conditional",
    )
    grouped: dict[str, list[dict[str, Any]]] = {survey_id: [] for survey_id in survey_ids}
    for question in all_questions:
        survey_id = question.get("survey_id")
        if survey_id in grouped:
            grouped[survey_id].append(question)

    for survey_questions in grouped.values():
        survey_questions.sort(key=lambda q: q.get("order_index") or 0)
    return grouped


def choices_from_options(options: Any) -> list[str]:
    if isinstance(options, dict):
        choices = options.get("choices") or []
        locked_choices = options.get("locked_choices") or []
        all_choices = [*choices, *locked_choices]
    elif isinstance(options, list):
        all_choices = options
    else:
        all_choices = []

    return [str(choice) for choice in all_choices if choice is not None]


def max_checkbox_selections(options: Any, choice_count: int) -> int:
    if isinstance(options, dict) and isinstance(options.get("max_selections"), int):
        return max(1, min(options["max_selections"], choice_count))
    return max(1, min(3, choice_count))


def random_postal_prefix(rng: random.Random) -> str:
    return (
        rng.choice(string.ascii_uppercase)
        + str(rng.randint(0, 9))
        + rng.choice(string.ascii_uppercase)
    )


def random_short_answer(question: dict[str, Any], rng: random.Random) -> str:
    options = question.get("options")
    validation = options.get("validation") if isinstance(options, dict) else None
    if isinstance(validation, dict) and validation.get("type") == "postal_code_prefix":
        return random_postal_prefix(rng)

    return rng.choice(
        [
            "Strongly support",
            "Somewhat support",
            "Need more information",
            "No comment",
            "Prefer a different approach",
        ]
    )


def generated_answer(
    question: dict[str, Any],
    session_id: str,
    rng: random.Random,
) -> dict[str, Any] | None:
    question_type = question.get("type")
    if question_type == "section_header":
        return None

    options = question.get("options")
    choices = choices_from_options(options)
    answer: dict[str, Any] = {
        "session_id": session_id,
        "question_id": question["id"],
        "time_spent": rng.randint(2, 45),
    }

    if question_type in {"multiple_choice", "dropdown"}:
        answer["answer_text"] = rng.choice(choices) if choices else "Option 1"
    elif question_type == "checkboxes":
        if choices:
            max_selected = max_checkbox_selections(options, len(choices))
            selected_count = rng.randint(1, max_selected)
            answer["answer_options"] = rng.sample(choices, selected_count)
        else:
            answer["answer_options"] = ["Option 1"]
    elif question_type == "ranking":
        ranked = choices[:]
        rng.shuffle(ranked)
        answer["answer_options"] = ranked
    elif question_type in {"likert_scale", "rating_scale"}:
        answer["answer_numeric"] = rng.randint(1, 5)
    elif question_type == "short_answer":
        answer["answer_text"] = random_short_answer(question, rng)
    else:
        answer["answer_text"] = "Generated response"

    return answer


def generate_for_survey(
    survey: dict[str, Any],
    questions: list[dict[str, Any]],
    response_count: int,
    rng: random.Random,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    now = datetime.now(UTC)
    sessions: list[dict[str, Any]] = []
    answers: list[dict[str, Any]] = []

    answerable_questions = [q for q in questions if q.get("type") != "section_header"]
    for index in range(response_count):
        session_id = str(uuid.uuid4())
        completed_at = now - timedelta(minutes=rng.randint(0, 60 * 24 * 21))
        started_at = completed_at - timedelta(minutes=rng.randint(2, 20))
        sessions.append(
            {
                "id": session_id,
                "survey_id": survey["id"],
                "started_at": started_at.isoformat(),
                "completed_at": completed_at.isoformat(),
                "is_completed": True,
                "email": f"local_seed_{index}_{uuid.uuid4().hex[:10]}@example.test",
                "reminder_sent": False,
                "current_step": len(answerable_questions),
                "referral_source": rng.choice([None, "local_seed", "test_link"]),
                "attention_check_failures": rng.choice([0, 0, 0, 1]),
                "weight": 1.0,
                "is_valid": True,
                "language": rng.choice(["en", "fr", "zh"]),
            }
        )

        for question in answerable_questions:
            answer = generated_answer(question, session_id, rng)
            if answer is not None:
                answers.append(answer)

    return sessions, answers


def main() -> int:
    args = parse_args()
    load_supabase_status(args)
    load_explicit_env_file(args)
    url = assert_local_supabase_url(args.url)
    key = assert_key(args.key)

    if args.responses_per_survey <= 0:
        raise SystemExit("--responses-per-survey must be greater than 0.")
    if args.active_survey_limit <= 0:
        raise SystemExit("--active-survey-limit must be greater than 0.")

    rng = random.Random(args.seed)
    client = create_client(url, key)

    surveys = active_surveys(client, args.active_survey_limit)
    if not surveys:
        raise SystemExit("No active surveys found in local Supabase.")

    survey_ids = [survey["id"] for survey in surveys]
    grouped_questions = questions_by_survey(client, survey_ids)

    print(f"Using local Supabase URL: {url}")
    print(f"Active surveys selected: {len(surveys)}")

    total_sessions = 0
    total_answers = 0
    for survey in surveys:
        survey_questions = grouped_questions.get(survey["id"], [])
        sessions, answers = generate_for_survey(
            survey,
            survey_questions,
            args.responses_per_survey,
            rng,
        )
        print(
            f"- {survey['title']} ({survey['id']}): "
            f"{len(survey_questions)} questions, "
            f"{len(sessions)} sessions, {len(answers)} answers"
        )
        insert_batches(client, "response_sessions", sessions, dry_run=args.dry_run)
        insert_batches(client, "answers", answers, dry_run=args.dry_run)
        total_sessions += len(sessions)
        total_answers += len(answers)

    print(
        "Done. "
        f"{'Planned' if args.dry_run else 'Inserted'} "
        f"{total_sessions} sessions and {total_answers} answers."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
