-- Migration: replace total_strokes/resistance_level with avg_watts.
--
-- The entry form now asks for duration, distance, average power (watts) and
-- average stroke rate (spm) — no stroke count, no resistance level. Existing
-- rows keep whatever they had in the dropped columns; that data is simply no
-- longer surfaced.
--
-- Run in the Supabase SQL editor, top to bottom, in one go.

begin;

-- 1. Column changes -----------------------------------------------------

alter table sessions add column if not exists avg_watts numeric;
alter table sessions drop column if exists total_strokes;
alter table sessions drop column if exists resistance_level;

alter table sessions drop constraint if exists sessions_strokes_sane;
alter table sessions drop constraint if exists sessions_resistance_sane;
alter table sessions
  add constraint sessions_watts_sane check (avg_watts is null or avg_watts between 0 and 2000) not valid;

-- 2. Functions ------------------------------------------------------------
-- Parameter lists changed, so the old signatures must be dropped explicitly
-- before the new ones can be created — CREATE OR REPLACE cannot add or
-- remove parameters on an existing function.

drop function if exists add_session(text, uuid, date, int, int, int, numeric, numeric, int);
drop function if exists update_session(text, uuid, date, int, int, numeric);

create or replace function add_session(
  p_code_hash text,
  p_member_id uuid,
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
  if not exists (
    select 1 from public.members
    where id = p_member_id and crew_id = v_crew_id
  ) then
    raise exception 'member does not belong to this crew' using errcode = '28000';
  end if;

  insert into public.sessions (
    crew_id, member_id, session_date, duration_seconds, distance_m,
    avg_watts, avg_spm, pace_per_500m_seconds
  ) values (
    v_crew_id, p_member_id, p_session_date, p_duration_seconds, p_distance_m,
    p_avg_watts, p_avg_spm, p_pace_per_500m_seconds
  )
  returning * into v_session;
  return v_session;
end;
$$;

create or replace function update_session(
  p_code_hash text,
  p_session_id uuid,
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
  v_session public.sessions;
begin
  update public.sessions set
    session_date = p_session_date,
    duration_seconds = p_duration_seconds,
    distance_m = p_distance_m,
    avg_watts = p_avg_watts,
    avg_spm = p_avg_spm,
    pace_per_500m_seconds = p_pace_per_500m_seconds
  where id = p_session_id
    and crew_id = public.crew_id_for(p_code_hash)
  returning * into v_session;

  if v_session.id is null then
    raise exception 'session not found in this crew' using errcode = 'P0002';
  end if;
  return v_session;
end;
$$;

-- 3. Privileges -------------------------------------------------------------
-- The old add_session/update_session grants were tied to the dropped
-- signatures and disappeared with them; the new signatures need their own.

grant execute on function
  add_session(text, uuid, date, int, int, numeric, numeric, numeric),
  update_session(text, uuid, date, int, int, numeric, numeric, numeric)
to anon;

commit;
