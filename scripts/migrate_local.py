"""
One-time migration: copies translation_fr and translation_zh rows
from ai_analyses into the new translations table.

Run against local DB:
    python scripts/migrate_local.py
"""
import psycopg2
from psycopg2.extras import Json

LOCAL_DB = "postgresql://rsxing@localhost:5432/cyc_survey_platform_local"


def main():
    conn = psycopg2.connect(LOCAL_DB)
    cur = conn.cursor()

    cur.execute("""
        SELECT survey_id, analysis_type, data
        FROM ai_analyses
        WHERE analysis_type IN ('translation_fr', 'translation_zh')
    """)

    migrated = 0
    for survey_id, analysis_type, data in cur.fetchall():
        lang = analysis_type.replace("translation_", "")

        title = ""
        description = ""
        questions = []

        if isinstance(data, dict):
            title = data.get(f"title_{lang}", "") or data.get("title", "")
            description = data.get(f"description_{lang}", "") or data.get("description", "")
            questions = data.get(f"questions_{lang}", []) or data.get("questions", [])

        cur.execute("""
            INSERT INTO translations (survey_id, language_code, title, description, questions)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (survey_id, language_code)
            DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                questions = EXCLUDED.questions,
                updated_at = NOW()
        """, (survey_id, lang, title, description, Json(questions)))

        migrated += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"Migrated {migrated} translation records to new table.")


if __name__ == "__main__":
    main()
