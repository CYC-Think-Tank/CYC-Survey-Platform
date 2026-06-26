CREATE TABLE IF NOT EXISTS translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
    title TEXT,
    description TEXT,
    questions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(survey_id, language_code)
);

-- Create index for fast lookups by survey + language
CREATE INDEX IF NOT EXISTS idx_translations_survey_lang ON translations(survey_id, language_code);
