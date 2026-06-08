import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

POSTAL_PREFIX_RE = re.compile(r"^[A-Z][0-9][A-Z]$")
MIN_POSTAL_GEO_DISPLAY_COUNT = 1

FSA_LOOKUP_PATH = Path(__file__).resolve().parents[1] / "data" / "fsa_centroids.json"

CANADIAN_CITY_CENTROIDS = [
    {"city": "St. John's", "province": "Newfoundland and Labrador", "lat": 47.5615, "lng": -52.7126},
    {"city": "Charlottetown", "province": "Prince Edward Island", "lat": 46.2382, "lng": -63.1311},
    {"city": "Halifax", "province": "Nova Scotia", "lat": 44.6488, "lng": -63.5752},
    {"city": "Moncton", "province": "New Brunswick", "lat": 46.0878, "lng": -64.7782},
    {"city": "Fredericton", "province": "New Brunswick", "lat": 45.9636, "lng": -66.6431},
    {"city": "Saint John", "province": "New Brunswick", "lat": 45.2733, "lng": -66.0633},
    {"city": "Quebec City", "province": "Quebec", "lat": 46.8139, "lng": -71.2080},
    {"city": "Montreal", "province": "Quebec", "lat": 45.5019, "lng": -73.5674},
    {"city": "Gatineau", "province": "Quebec", "lat": 45.4765, "lng": -75.7013},
    {"city": "Sherbrooke", "province": "Quebec", "lat": 45.4042, "lng": -71.8929},
    {"city": "Trois-Rivieres", "province": "Quebec", "lat": 46.3432, "lng": -72.5430},
    {"city": "Saguenay", "province": "Quebec", "lat": 48.4281, "lng": -71.0688},
    {"city": "Ottawa", "province": "Ontario", "lat": 45.4215, "lng": -75.6972},
    {"city": "Toronto", "province": "Ontario", "lat": 43.6532, "lng": -79.3832},
    {"city": "Mississauga", "province": "Ontario", "lat": 43.5890, "lng": -79.6441},
    {"city": "Brampton", "province": "Ontario", "lat": 43.7315, "lng": -79.7624},
    {"city": "Oakville", "province": "Ontario", "lat": 43.4675, "lng": -79.6877},
    {"city": "Hamilton", "province": "Ontario", "lat": 43.2557, "lng": -79.8711},
    {"city": "Kitchener-Waterloo", "province": "Ontario", "lat": 43.4516, "lng": -80.4925},
    {"city": "London", "province": "Ontario", "lat": 42.9849, "lng": -81.2453},
    {"city": "Windsor", "province": "Ontario", "lat": 42.3149, "lng": -83.0364},
    {"city": "Markham", "province": "Ontario", "lat": 43.8561, "lng": -79.3370},
    {"city": "Richmond Hill", "province": "Ontario", "lat": 43.8828, "lng": -79.4403},
    {"city": "Oshawa", "province": "Ontario", "lat": 43.8971, "lng": -78.8658},
    {"city": "Barrie", "province": "Ontario", "lat": 44.3894, "lng": -79.6903},
    {"city": "Kingston", "province": "Ontario", "lat": 44.2312, "lng": -76.4860},
    {"city": "Greater Sudbury", "province": "Ontario", "lat": 46.4917, "lng": -80.9930},
    {"city": "Thunder Bay", "province": "Ontario", "lat": 48.3809, "lng": -89.2477},
    {"city": "Winnipeg", "province": "Manitoba", "lat": 49.8951, "lng": -97.1384},
    {"city": "Brandon", "province": "Manitoba", "lat": 49.8485, "lng": -99.9501},
    {"city": "Regina", "province": "Saskatchewan", "lat": 50.4452, "lng": -104.6189},
    {"city": "Saskatoon", "province": "Saskatchewan", "lat": 52.1579, "lng": -106.6702},
    {"city": "Calgary", "province": "Alberta", "lat": 51.0447, "lng": -114.0719},
    {"city": "Edmonton", "province": "Alberta", "lat": 53.5461, "lng": -113.4938},
    {"city": "Red Deer", "province": "Alberta", "lat": 52.2681, "lng": -113.8112},
    {"city": "Lethbridge", "province": "Alberta", "lat": 49.6956, "lng": -112.8451},
    {"city": "Vancouver", "province": "British Columbia", "lat": 49.2827, "lng": -123.1207},
    {"city": "Victoria", "province": "British Columbia", "lat": 48.4284, "lng": -123.3656},
    {"city": "Kelowna", "province": "British Columbia", "lat": 49.8880, "lng": -119.4960},
    {"city": "Kamloops", "province": "British Columbia", "lat": 50.6745, "lng": -120.3273},
    {"city": "Prince George", "province": "British Columbia", "lat": 53.9171, "lng": -122.7497},
    {"city": "Whitehorse", "province": "Yukon", "lat": 60.7212, "lng": -135.0568},
    {"city": "Yellowknife", "province": "Northwest Territories", "lat": 62.4540, "lng": -114.3718},
    {"city": "Iqaluit", "province": "Nunavut", "lat": 63.7467, "lng": -68.5170},
]


def infer_city(province: str, lat: float, lng: float) -> str:
    candidates = [
        row for row in CANADIAN_CITY_CENTROIDS if row["province"] == province
    ] or CANADIAN_CITY_CENTROIDS
    return min(
        candidates,
        key=lambda row: (float(row["lat"]) - lat) ** 2 + (float(row["lng"]) - lng) ** 2,
    )["city"]


@lru_cache(maxsize=1)
def load_fsa_lookup() -> dict[str, dict[str, float | str]]:
    with FSA_LOOKUP_PATH.open(encoding="utf-8") as f:
        rows = json.load(f)
    return {
        row["fsa"]: {
            "province": row["province"],
            "city": row.get("city")
            or infer_city(row["province"], float(row["lat"]), float(row["lng"])),
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
    # Kept in the signature for callers/tests from the earlier privacy-threshold version.
    del min_display_count

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
        row = fsa_lookup[fsa]
        dots.append(
            {
                "fsa": fsa,
                "province": row["province"],
                "city": row.get("city")
                or infer_city(
                    str(row["province"]),
                    float(row["lat"]),
                    float(row["lng"]),
                ),
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
        "min_display_count": MIN_POSTAL_GEO_DISPLAY_COUNT,
        "dots": dots,
    }
