-- Event raffle entries.
--
-- This is intentionally SEPARATE from `raffle_entries` (the general/referral
-- raffle). A row is only created here when someone completes a survey via an
-- event QR code that carries an `?event=<code>` query param. The in-person
-- spinning wheel draws ONLY from this table, filtered by event_code.
--
-- One ticket per survey completed: a person who completes (or has completed)
-- multiple surveys gets multiple tickets in the same event, so the wheel is
-- weighted by how many surveys each person did. The unique constraint is on
-- (event_code, email, survey_id) so each survey grants at most one ticket.

create table if not exists event_raffle_entries (
  id uuid primary key default gen_random_uuid(),
  event_code text not null,
  email text not null,
  survey_id uuid references surveys(id) on delete set null,
  session_id uuid,
  created_at timestamptz default now(),
  unique (event_code, email, survey_id)
);

create index if not exists idx_event_raffle_event_code
  on event_raffle_entries (event_code);
