from api.utils.postal_geo import build_postal_geo_stats


def test_build_postal_geo_stats_normalizes_and_counts_matched_prefixes():
    lookup = {
        "M5V": {"province": "Ontario", "city": "Toronto", "lat": 43.64, "lng": -79.39},
        "V6B": {
            "province": "British Columbia",
            "city": "Vancouver",
            "lat": 49.28,
            "lng": -123.11,
        },
    }
    answers = [
        {"answer_text": "m5v"},
        {"answer_text": "M5V"},
        {"answer_text": " M5V "},
        {"answer_text": "V6B"},
        {"answer_text": "V6B"},
    ]

    result = build_postal_geo_stats("question-1", answers, lookup, min_display_count=1)

    assert result["type"] == "fsa_dot_map"
    assert result["question_id"] == "question-1"
    assert result["total_usable"] == 5
    assert result["matched_count"] == 5
    assert result["unmatched_count"] == 0
    assert result["suppressed_count"] == 0
    assert result["dots"] == [
        {
            "fsa": "M5V",
            "province": "Ontario",
            "city": "Toronto",
            "lat": 43.64,
            "lng": -79.39,
            "count": 3,
            "percentage": 60.0,
        },
        {
            "fsa": "V6B",
            "province": "British Columbia",
            "city": "Vancouver",
            "lat": 49.28,
            "lng": -123.11,
            "count": 2,
            "percentage": 40.0,
        },
    ]


def test_build_postal_geo_stats_reports_invalid_and_unknown_prefixes():
    lookup = {
        "M5V": {"province": "Ontario", "city": "Toronto", "lat": 43.64, "lng": -79.39},
    }
    answers = [
        {"answer_text": "M5V"},
        {"answer_text": "123"},
        {"answer_text": "ZZZ"},
        {"answer_text": ""},
        {"answer_text": None},
    ]

    result = build_postal_geo_stats("question-1", answers, lookup, min_display_count=1)

    assert result["total_usable"] == 1
    assert result["matched_count"] == 1
    assert result["unmatched_count"] == 2
    assert result["dots"][0]["fsa"] == "M5V"


def test_build_postal_geo_stats_returns_low_count_dots():
    lookup = {
        "M5V": {"province": "Ontario", "city": "Toronto", "lat": 43.64, "lng": -79.39},
        "V6B": {
            "province": "British Columbia",
            "city": "Vancouver",
            "lat": 49.28,
            "lng": -123.11,
        },
    }
    answers = [
        {"answer_text": "M5V"},
        {"answer_text": "M5V"},
        {"answer_text": "M5V"},
        {"answer_text": "M5V"},
        {"answer_text": "M5V"},
        {"answer_text": "V6B"},
        {"answer_text": "V6B"},
    ]

    result = build_postal_geo_stats("question-1", answers, lookup, min_display_count=5)

    assert [dot["fsa"] for dot in result["dots"]] == ["M5V", "V6B"]
    assert result["suppressed_count"] == 0
    assert result["suppressed_fsa_count"] == 0
    assert result["min_display_count"] == 1
    assert result["matched_count"] == 7


def test_build_postal_geo_stats_infers_city_when_lookup_has_no_city():
    lookup = {
        "M5V": {"province": "Ontario", "lat": 43.64, "lng": -79.39},
    }

    result = build_postal_geo_stats("question-1", [{"answer_text": "M5V"}], lookup)

    assert result["dots"][0]["city"] == "Toronto"
