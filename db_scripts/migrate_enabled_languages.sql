-- db_scripts/migrate_enabled_languages.sql
-- Add per-survey language visibility column
-- NULL = all languages enabled (backward compatible)
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS enabled_languages JSONB;
