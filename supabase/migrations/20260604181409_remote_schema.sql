


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."question_type" AS ENUM (
    'multiple_choice',
    'short_answer',
    'rating_scale',
    'checkboxes',
    'likert_scale',
    'section_header',
    'dropdown',
    'ranking'
);


ALTER TYPE "public"."question_type" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_analyses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "survey_id" "uuid",
    "analysis_type" character varying(50) NOT NULL,
    "data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_analyses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."answers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "session_id" "uuid",
    "question_id" "uuid",
    "answer_text" "text",
    "answer_numeric" integer,
    "answer_options" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "time_spent" integer DEFAULT 0
);


ALTER TABLE "public"."answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "survey_id" "uuid",
    "question_text" "text" NOT NULL,
    "type" "public"."question_type" NOT NULL,
    "order_index" integer NOT NULL,
    "options" "jsonb",
    "is_required" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "is_conditional" boolean DEFAULT false
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."raffle_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "survey_id" "uuid",
    "session_id" "uuid",
    "is_referral" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."raffle_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."response_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "survey_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "completed_at" timestamp with time zone,
    "is_completed" boolean DEFAULT false,
    "email" "text",
    "reminder_sent" boolean DEFAULT false,
    "current_step" integer DEFAULT 0,
    "referral_source" "text",
    "attention_check_failures" integer DEFAULT 0,
    "weight" double precision DEFAULT 1.0,
    "is_valid" boolean DEFAULT true,
    "language" character varying(10)
);


ALTER TABLE "public"."response_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."share_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "survey_id" "uuid",
    "code" "text" NOT NULL,
    "label" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text"
);


ALTER TABLE "public"."share_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."surveys" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "estimated_minutes" integer DEFAULT 5,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "has_been_published" boolean DEFAULT false,
    "thumbnail_url" "text",
    "description_alignment" character varying DEFAULT 'left'::character varying
);


ALTER TABLE "public"."surveys" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_analyses"
    ADD CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_analyses"
    ADD CONSTRAINT "ai_analyses_survey_id_analysis_type_key" UNIQUE ("survey_id", "analysis_type");



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raffle_entries"
    ADD CONSTRAINT "raffle_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."response_sessions"
    ADD CONSTRAINT "response_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."share_links"
    ADD CONSTRAINT "share_links_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."share_links"
    ADD CONSTRAINT "share_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "unique_session_question" UNIQUE ("session_id", "question_id");



ALTER TABLE ONLY "public"."ai_analyses"
    ADD CONSTRAINT "ai_analyses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."response_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raffle_entries"
    ADD CONSTRAINT "raffle_entries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."response_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raffle_entries"
    ADD CONSTRAINT "raffle_entries_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."response_sessions"
    ADD CONSTRAINT "response_sessions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."share_links"
    ADD CONSTRAINT "share_links_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE CASCADE;



CREATE POLICY "Allow public insert of answers" ON "public"."answers" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public insert of sessions" ON "public"."response_sessions" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public read of active surveys" ON "public"."surveys" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Allow public read of questions" ON "public"."questions" FOR SELECT USING (true);



ALTER TABLE "public"."answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."raffle_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."response_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."surveys" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."ai_analyses" TO "anon";
GRANT ALL ON TABLE "public"."ai_analyses" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_analyses" TO "service_role";



GRANT ALL ON TABLE "public"."answers" TO "anon";
GRANT ALL ON TABLE "public"."answers" TO "authenticated";
GRANT ALL ON TABLE "public"."answers" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."raffle_entries" TO "anon";
GRANT ALL ON TABLE "public"."raffle_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."raffle_entries" TO "service_role";



GRANT ALL ON TABLE "public"."response_sessions" TO "anon";
GRANT ALL ON TABLE "public"."response_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."response_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."share_links" TO "anon";
GRANT ALL ON TABLE "public"."share_links" TO "authenticated";
GRANT ALL ON TABLE "public"."share_links" TO "service_role";



GRANT ALL ON TABLE "public"."surveys" TO "anon";
GRANT ALL ON TABLE "public"."surveys" TO "authenticated";
GRANT ALL ON TABLE "public"."surveys" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


