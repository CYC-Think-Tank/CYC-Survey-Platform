-- db_scripts/migrate_survey_category.sql
-- Phase 4: Survey category filter system.
--
-- Adds a single optional `category` label to each survey so the survey library
-- can be filtered by topic / target audience / program type from the dashboard
-- and the public survey list. NULL = uncategorized (backward compatible).
--
-- A single text column (rather than a many-to-many tag relation) keeps the
-- feature lightweight; it can be promoted to a tag table later if surveys need
-- to belong to multiple categories at once.
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS category VARCHAR(120);

-- Helps the category filter query when the library grows large.
CREATE INDEX IF NOT EXISTS idx_surveys_category ON surveys (category);
