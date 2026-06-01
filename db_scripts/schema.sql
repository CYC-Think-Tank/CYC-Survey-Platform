-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Surveys Table
CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_minutes INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    has_been_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Question Types Enum
CREATE TYPE question_type AS ENUM ('multiple_choice', 'short_answer', 'rating_scale', 'checkboxes', 'likert_scale', 'ranking', 'dropdown', 'section_header');

-- Questions Table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    type question_type NOT NULL,
    order_index INTEGER NOT NULL,
    options JSONB, -- Array of strings for multiple choice/checkboxes or structured options
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Responses Table (Session Level)
CREATE TABLE response_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    email TEXT,
    referral_source TEXT,
    language VARCHAR(10), -- 'en', 'fr', 'zh', or NULL for legacy
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    completed_at TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT false,
    current_step INTEGER DEFAULT 0,
    attention_check_failures INTEGER DEFAULT 0,
    weight NUMERIC(3,2) DEFAULT 1.0,
    is_valid BOOLEAN DEFAULT true
);

-- Individual Answers Table
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES response_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    answer_numeric INTEGER,
    answer_options JSONB, -- For checkboxes / ranking
    time_spent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create RLS Policies
-- Allow public read access to active surveys and their questions
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read of active surveys" ON surveys FOR SELECT USING (is_active = true);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read of questions" ON questions FOR SELECT USING (true);

-- Allow public to insert responses
ALTER TABLE response_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert of sessions" ON response_sessions FOR INSERT WITH CHECK (true);

ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert of answers" ON answers FOR INSERT WITH CHECK (true);
