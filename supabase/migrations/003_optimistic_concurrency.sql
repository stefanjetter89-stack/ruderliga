-- Migration: fix the K2 data-loss pattern (silent overwrite on concurrent edit).
--
-- update_session previously wrote all six editable columns unconditionally,
-- with no check for whether the row had changed since the edit form loaded
-- it. Two devices editing the same session around the same time would race:
-- whichever save landed last would silently discard the other's change to
-- fields it never touched.
--
-- Fix: add updated_at, and make update_session's UPDATE require the caller's
-- expected_updated_at to still match. A mismatch means the row changed after
-- the edit form was opened — the write is rejected instead of applied, and
-- the caller is told to reload.
--
-- Run in the Supabase SQL editor, top to bottom, in one go.

begin;

-- 1. Column ------------------------------------------------------------

alter table sessions add column if not exists updated_at timestamptz not null default now();

-- Existing rows have no meaningful "last edited" time; created_at is the
-- closest honest value.
update sessions set updated_at = created_at where updated_at is null;

-- 2. Function -------------------------------------------------------------
-- Parameter list changed (expected_updated_at inserted), so the old
-- signature must be dropped first — CREATE OR REPLACE cannot do that.

drop function if exists update_session(text, uuid, date, int, int, numeric, numeric, numeric);

create or replace function update_session(
  p_code_hash text,
  p_session_id uuid,
  p_expected_updated_at timestamptz,
  p_session_date date,
  p_duration_seconds int,
  p_distance_m int,
  p_avg_watts numeric,
  p_avg_spm numeric,
  p_pace_per_500m_seconds numeric
)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_crew_id uuid := public.crew_id_for(p_code_hash);
  v_session public.sessions;
begin
  update public.sessions set
    session_date = p_session_date,
    duration_seconds = p_duration_seconds,
    distance_m = p_distance_m,
    avg_watts = p_avg_watts,
    avg_spm = p_avg_spm,
    pace_per_500m_seconds = p_pace_per_500m_seconds,
    updated_at = now()
  where id = p_session_id
    and crew_id = v_crew_id
    and updated_at = p_expected_updated_at
  returning * into v_session;

  if v_session.id is not null then
    return v_session;
  end if;

  if exists (select 1 from public.sessions where id = p_session_id and crew_id = v_crew_id) then
    raise exception 'session was changed by another device' using errcode = 'RL001';
  else
    raise exception 'session not found in this crew' using errcode = 'P0002';
  end if;
end;
$$;

-- 3. Privileges -------------------------------------------------------------

grant execute on function
  update_session(text, uuid, timestamptz, date, int, int, numeric, numeric, numeric)
to anon;

commit;

-- Verification (run separately):
--   select column_name from information_schema.columns
--   where table_name = 'sessions' and column_name = 'updated_at';
