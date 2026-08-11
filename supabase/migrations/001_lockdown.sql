-- Migration v1 -> v2: close the open REST surface.
--
-- v1 shipped `using (true)` policies, which let anyone with the public anon key
-- enumerate every crew and delete every session. This migration drops those
-- policies (leaving RLS enabled with none, i.e. closed), adds the data
-- constraints v1 lacked, and installs the security-definer access layer.
--
-- Safe to run on a live v1 database; it does not touch existing rows.
-- Run it in the Supabase SQL editor, top to bottom, in one go.

begin;

-- 1. Remove the permissive policies -----------------------------------------

drop policy if exists "crews are readable by anyone with the anon key" on crews;
drop policy if exists "anyone can create a crew" on crews;
drop policy if exists "members are readable by anyone with the anon key" on members;
drop policy if exists "anyone can add a member" on members;
drop policy if exists "sessions are readable by anyone with the anon key" on sessions;
drop policy if exists "anyone can add a session" on sessions;
drop policy if exists "anyone can update a session" on sessions;
drop policy if exists "anyone can delete a session" on sessions;

alter table crews enable row level security;
alter table members enable row level security;
alter table sessions enable row level security;

-- 2. Constraints that v1 was missing ----------------------------------------
-- `not valid` skips the scan of pre-existing rows, so the migration cannot
-- fail on legacy test data; new and updated rows are checked from now on.

alter table crews
  add constraint crews_code_hash_is_sha256 check (code_hash ~ '^[0-9a-f]{64}$') not valid,
  add constraint crews_name_length check (name is null or char_length(name) between 1 and 60) not valid;

alter table members
  add constraint members_display_name_length check (char_length(display_name) between 1 and 40) not valid;

alter table sessions
  add constraint sessions_duration_sane check (duration_seconds between 1 and 86400) not valid,
  add constraint sessions_distance_sane check (distance_m between 1 and 200000) not valid,
  add constraint sessions_strokes_sane check (total_strokes is null or total_strokes between 0 and 100000) not valid,
  add constraint sessions_spm_sane check (avg_spm is null or avg_spm between 0 and 200) not valid,
  add constraint sessions_pace_sane check (pace_per_500m_seconds is null or pace_per_500m_seconds between 1 and 3600) not valid,
  add constraint sessions_date_sane check (session_date between date '2000-01-01' and current_date + 1) not valid;

create index if not exists sessions_crew_date_idx on sessions(crew_id, session_date desc);

-- 3. Access layer ------------------------------------------------------------
-- Identical to the function block in schema.sql; kept inline so this file
-- stands alone as a runnable migration.

create or replace function crew_id_for(p_code_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_crew_id uuid;
begin
  select id into v_crew_id from public.crews where code_hash = p_code_hash;
  if v_crew_id is null then
    raise exception 'invalid crew code' using errcode = '28000';
  end if;
  return v_crew_id;
end;
$$;

create or replace function create_crew(p_code_hash text, p_name text)
returns public.crews language plpgsql security definer set search_path = '' as $$
declare v_crew public.crews;
begin
  insert into public.crews (code_hash, name) values (p_code_hash, p_name)
  returning * into v_crew;
  return v_crew;
end;
$$;

create or replace function join_crew(p_code_hash text)
returns public.crews language sql security definer set search_path = '' as $$
  select * from public.crews where code_hash = p_code_hash;
$$;

create or replace function list_members(p_code_hash text)
returns setof public.members language sql security definer set search_path = '' as $$
  select m.* from public.members m
  where m.crew_id = public.crew_id_for(p_code_hash)
  order by m.created_at;
$$;

create or replace function add_member(p_code_hash text, p_display_name text)
returns public.members language plpgsql security definer set search_path = '' as $$
declare v_member public.members;
begin
  insert into public.members (crew_id, display_name)
  values (public.crew_id_for(p_code_hash), p_display_name)
  returning * into v_member;
  return v_member;
end;
$$;

create or replace function list_sessions(p_code_hash text)
returns setof public.sessions language sql security definer set search_path = '' as $$
  select s.* from public.sessions s
  where s.crew_id = public.crew_id_for(p_code_hash)
  order by s.session_date desc, s.created_at desc;
$$;

create or replace function add_session(
  p_code_hash text, p_member_id uuid, p_session_date date,
  p_duration_seconds int, p_distance_m int, p_total_strokes int,
  p_avg_spm numeric, p_pace_per_500m_seconds numeric, p_resistance_level int
)
returns public.sessions language plpgsql security definer set search_path = '' as $$
declare
  v_crew_id uuid := public.crew_id_for(p_code_hash);
  v_session public.sessions;
begin
  if not exists (
    select 1 from public.members where id = p_member_id and crew_id = v_crew_id
  ) then
    raise exception 'member does not belong to this crew' using errcode = '28000';
  end if;
  insert into public.sessions (
    crew_id, member_id, session_date, duration_seconds, distance_m,
    total_strokes, avg_spm, pace_per_500m_seconds, resistance_level
  ) values (
    v_crew_id, p_member_id, p_session_date, p_duration_seconds, p_distance_m,
    p_total_strokes, p_avg_spm, p_pace_per_500m_seconds, p_resistance_level
  )
  returning * into v_session;
  return v_session;
end;
$$;

create or replace function update_session(
  p_code_hash text, p_session_id uuid, p_session_date date,
  p_duration_seconds int, p_distance_m int, p_pace_per_500m_seconds numeric
)
returns public.sessions language plpgsql security definer set search_path = '' as $$
declare v_session public.sessions;
begin
  update public.sessions set
    session_date = p_session_date,
    duration_seconds = p_duration_seconds,
    distance_m = p_distance_m,
    pace_per_500m_seconds = p_pace_per_500m_seconds
  where id = p_session_id and crew_id = public.crew_id_for(p_code_hash)
  returning * into v_session;
  if v_session.id is null then
    raise exception 'session not found in this crew' using errcode = 'P0002';
  end if;
  return v_session;
end;
$$;

create or replace function delete_session(p_code_hash text, p_session_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.sessions
  where id = p_session_id and crew_id = public.crew_id_for(p_code_hash);
  if not found then
    raise exception 'session not found in this crew' using errcode = 'P0002';
  end if;
end;
$$;

-- 4. Privileges --------------------------------------------------------------

revoke all on all functions in schema public from anon, authenticated;

grant execute on function
  create_crew(text, text),
  join_crew(text),
  list_members(text),
  add_member(text, text),
  list_sessions(text),
  add_session(text, uuid, date, int, int, int, numeric, numeric, int),
  update_session(text, uuid, date, int, int, numeric),
  delete_session(text, uuid)
to anon;

commit;

-- Verification (run separately; both should return zero rows):
--   select * from crews;      -- as anon via REST: now empty
--   select polname from pg_policies where tablename in ('crews','members','sessions');
