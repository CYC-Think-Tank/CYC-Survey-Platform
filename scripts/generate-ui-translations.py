"""
Generates UI translation JSON files from the English master using Gemini.
Run: python scripts/generate-ui-translations.py

Skips languages that already have a JSON file (delete the file to regenerate).
"""
import json
import os
import time
from pathlib import Path

import httpx

MASTER_PATH = Path("src/locales/en.json")
OUT_DIR = Path("src/locales")
GOOGLE_AI_KEY = os.environ.get("GOOGLE_AI_KEY")
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GOOGLE_AI_KEY}"

# Languages to generate (code, Gemini prompt name)
LANGUAGES = [
    ("es", "Spanish"),
    ("pa", "Punjabi"),
    ("ar", "Arabic"),
    ("tl", "Tagalog"),
    ("yue", "Cantonese"),
    ("it", "Italian"),
    ("de", "German"),
    ("ta", "Tamil"),
]


def translate_with_gemini(texts: dict, target_language: str) -> dict:
    """Send English UI strings to Gemini for translation."""
    prompt = f"""You are a professional translator. Translate the following UI strings for a youth survey website into {target_language}.

Rules:
- Keep HTML tags (like <strong>, <em>, <span>) exactly as they appear
- Keep placeholder patterns unchanged
- These are short UI labels, buttons, and error messages — keep them concise
- Output ONLY valid JSON with the exact same keys

Input:
{json.dumps(texts, ensure_ascii=False, indent=2)}

Output ONLY a JSON object with the same keys and translated values. No markdown, no explanations."""

    resp = httpx.post(
        GEMINI_URL,
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 8192},
        },
        timeout=60.0,
    )
    resp.raise_for_status()
    data = resp.json()
    raw = data["candidates"][0]["content"]["parts"][0]["text"]

    # Strip markdown code fences if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

    return json.loads(cleaned)


def main():
    if not GOOGLE_AI_KEY:
        raise SystemExit("ERROR: Set GOOGLE_AI_KEY environment variable")

    with open(MASTER_PATH, "r", encoding="utf-8") as f:
        master = json.load(f)

    for code, name in LANGUAGES:
        out_path = OUT_DIR / f"{code}.json"
        if out_path.exists():
            print(f"Skipping {name} ({code}) — file already exists: {out_path}")
            continue

        print(f"Translating to {name} ({code})...")
        try:
            translated = translate_with_gemini(master, name)
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(translated, f, ensure_ascii=False, indent=2)
            print(f"  -> wrote {out_path}")
        except Exception as e:
            print(f"  ERROR: {e}")
            if out_path.exists():
                out_path.unlink()  # Clean up partial file
        time.sleep(1)  # Rate limit politeness

    print("\nDone!")


if __name__ == "__main__":
    main()
