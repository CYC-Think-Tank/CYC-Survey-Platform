import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

POSTAL_PREFIX_RE = re.compile(r"^[A-Z][0-9][A-Z]$")
MIN_POSTAL_GEO_DISPLAY_COUNT = 5

FSA_LOOKUP_PATH = Path(__file__).resolve().parents[1] / "data" / "fsa_centroids.json"


@lru_cache(maxsize=1)
def load_fsa_lookup() -> dict[str, dict[str, float | str]]:
    with FSA_LOOKUP_PATH.open(encoding="utf-8") as f:
        rows = json.load(f)
    return {
        row["fsa"]: {
            "province": row["province"],
            "lat": row["lat"],
            "lng": row["lng"],
        }
        for row in rows
    }


def normalize_postal_prefix(value: str | None) -> str | None:
    if not value:
        return None

    prefix = value.strip().upper()
    if not POSTAL_PREFIX_RE.match(prefix):
        return None
    return prefix


def build_postal_geo_stats(
    question_id: str,
    answers: list[dict[str, Any]],
    lookup: dict[str, dict[str, float | str]] | None = None,
    min_display_count: int = MIN_POSTAL_GEO_DISPLAY_COUNT,
) -> dict[str, Any]:
    fsa_lookup = lookup if lookup is not None else load_fsa_lookup()
    counts: dict[str, int] = {}
    unmatched_count = 0

    for answer in answers:
        prefix = normalize_postal_prefix(answer.get("answer_text"))
        if not prefix:
            if answer.get("answer_text"):
                unmatched_count += 1
            continue

        if prefix not in fsa_lookup:
            unmatched_count += 1
            continue

        counts[prefix] = counts.get(prefix, 0) + 1

    matched_count = sum(counts.values())
    dots = []
    suppressed_count = 0
    suppressed_fsa_count = 0

    for fsa, count in sorted(counts.items(), key=lambda item: (-item[1], item[0])):
        if count < min_display_count:
            suppressed_count += count
            suppressed_fsa_count += 1
            continue

        row = fsa_lookup[fsa]
        dots.append(
            {
                "fsa": fsa,
                "province": row["province"],
                "lat": row["lat"],
                "lng": row["lng"],
                "count": count,
                "percentage": round((count / matched_count) * 100, 1)
                if matched_count
                else 0,
            }
        )

    return {
        "type": "fsa_dot_map",
        "question_id": question_id,
        "total_usable": matched_count,
        "matched_count": matched_count,
        "unmatched_count": unmatched_count,
        "suppressed_count": suppressed_count,
        "suppressed_fsa_count": suppressed_fsa_count,
        "min_display_count": min_display_count,
        "dots": dots,
    }
