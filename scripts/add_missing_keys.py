"""
Add missing translation keys to all locale files.
Run: python scripts/add_missing_keys.py
"""
import json
import os
from pathlib import Path

import httpx

MASTER_PATH = Path("src/locales/en.json")
GOOGLE_AI_KEY = os.environ.get("GOOGLE_AI_KEY")
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GOOGLE_AI_KEY}"

# Only process files that already exist (skip en)
LOCALE_DIR = Path("src/locales")


def translate_batch(texts: dict, target_language: str) -> dict:
    """Send English strings to Gemini for translation."""
    prompt = f"""You are a professional translator. Translate the following UI strings for a youth survey website into {target_language}.

Rules:
- Keep HTML tags exactly as they appear
- Keep short — these are UI labels and messages
- Output ONLY valid JSON with the exact same keys

Input:
{json.dumps(texts, ensure_ascii=False, indent=2)}

Output ONLY a JSON object with the same keys and translated values. No markdown, no explanations."""

    resp = httpx.post(
        GEMINI_URL,
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2048},
        },
        timeout=60.0,
    )
    resp.raise_for_status()
    data = resp.json()
    raw = data["candidates"][0]["content"]["parts"][0]["text"]

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

    # Find the new keys (last 4 added)
    new_keys = list(master.keys())[-4:]
    new_texts = {k: master[k] for k in new_keys}
    print(f"Adding {len(new_keys)} missing keys: {new_keys}")

    for lang_file in sorted(LOCALE_DIR.glob("*.json")):
        if lang_file.name == "en.json":
            continue

        lang_code = lang_file.stem
        # Map code to language name for prompt
        CODE_TO_NAME = {
            "fr": "French", "zh": "Chinese", "es": "Spanish", "pa": "Punjabi",
            "ar": "Arabic", "tl": "Tagalog", "yue": "Cantonese", "it": "Italian",
            "de": "German", "ta": "Tamil",
        }
        lang_name = CODE_TO_NAME.get(lang_code, lang_code.capitalize())

        with open(lang_file, "r", encoding="utf-8") as f:
            existing = json.load(f)

        # Check if any new keys are missing
        missing = {k: v for k, v in new_texts.items() if k not in existing}
        if not missing:
            print(f"Skipping {lang_code} — all keys present")
            continue

        print(f"Translating missing keys to {lang_name} ({lang_code})...")
        try:
            translated = translate_batch(missing, lang_name)
            existing.update(translated)
            with open(lang_file, "w", encoding="utf-8") as f:
                json.dump(existing, f, ensure_ascii=False, indent=2)
            print(f"  -> updated {lang_file}")
        except Exception as e:
            print(f"  ERROR: {e}")

    print("\nDone!")


if __name__ == "__main__":
    main()
