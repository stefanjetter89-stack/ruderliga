-- Ruderliga schema v2 — run once in the Supabase SQL editor of a fresh project.
-- Replaces v1, whose RLS policies were `using (true)` and therefore let anyone
-- holding the (public, bundle-embedded) anon key enumerate every crew and
-- delete every session. See supabase/migrations/001_lockdown.sql to upgrade an
-- existing v1 database in place.
--
-- SECURITY MODEL
-- There is no Supabase Auth. The Crew-Code is the sole credential, exactly as
-- specified: possession of the code — and nothing else — grants access to that
-- one crew. Enforcement works like this:
--
--   1. The tables have RLS enabled and NO policies at all. For the anon role
--      that means every direct PostgREST call (select/insert/update/delete)
--      returns nothing and writes nothing. The REST surface is closed.
--   2. All access goes through the `security definer` functions below, which
--      run as the owner and therefore bypass RLS — but each one takes
--      p_code_hash and resolves the crew from it. No valid code hash, no rows.
--
-- The crew id is consequently never a capability on its own: knowing (or
-- guessing) a uuid buys nothing without the code that hashes to that crew.
-- That is what makes the code's entropy the actual security boundary — see
-- src/lib/crewCode.ts, which generates ~49 bits from a CSPRNG.
--
-- `set search_path = ''` on every function prevents search-path hijacking, the
-- standard privilege-escalation vector against security-definer functions.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables ---

create table crews (
  id uuid primary key default gen_random_uuid(),
  code_hash text unique not null,
  name text,
  created_at timestamptz not null default now(),
  -- SHA-256, lowercase hex.
  constraint crews_code_hash_is_sha256 check (code_hash ~ '^[0-9a-f]{64}$'),
  constraint crews_name_length check (name is null or char_length(name) between 1 and 60)
);

create table members (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crews(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (crew_id, display_name),
  constraint members_display_name_length check (char_length(display_name) between 1 and 40)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crews(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  session_date date not null,
  duration_seconds int not null,
  distance_m int not null,
  avg_watts numeric,
  avg_spm numeric,
  -- Client-precomputed from duration_seconds/distance_m*500, but a plain
  -- (non-generated) column so it can be overridden before saving if the
  -- device's own display disagrees with the arithmetic.
  pace_per_500m_seconds numeric,
  created_at timestamptz not null default now(),
  -- Bumped by update_session on every write; the edit form's optimistic-
  -- concurrency check compares against this so a stale edit is rejected
  -- instead of silently overwriting a concurrent change from the other
  -- device (see update_session below).
  updated_at timestamptz not null default now(),

  -- Bounds are deliberately generous — they exist to keep impossible data out
  -- of the leaderboard (a 0 m row makes pace Infinity and would take rank 1),
  -- not to second-guess anyone's training.
  constraint sessions_duration_sane check (duration_seconds between 1 and 86400),
  constraint sessions_distance_sane check (distance_m between 1 and 200000),
  constraint sessions_watts_sane check (avg_watts is null or avg_watts between 0 and 2000),
  constraint sessions_spm_sane check (avg_spm is null or avg_spm between 0 and 200),
  constraint sessions_pace_sane check (pace_per_500m_seconds is null or pace_per_500m_seconds between 1 and 3600),
  constraint sessions_date_sane check (session_date between date '2000-01-01' and current_date + 1)
);

create index sessions_crew_id_idx on sessions(crew_id);
create index sessions_crew_date_idx on sessions(crew_id, session_date desc);
create index members_crew_id_idx on members(crew_id);

-- ------------------------------------------------------------------ RLS ---
-- Enabled with zero policies: closed to anon/authenticated by default.
-- Every legitimate read/write goes through the functions below instead.

alter table crews enable row level security;
alter table members enable row level security;
alter table sessions enable row level security;

-- ------------------------------------------------------------ functions ---

-- Resolves a code hash to a crew id, or raises. Every public function funnels
-- through this so the authorization check exists in exactly one place.
create or replace function crew_id_for(p_code_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_crew_id uuid;
begin
  select id into v_crew_id from public.crews where code_hash = p_code_hash;
  if v_crew_id is null then
    raise exception 'invalid crew code' using errcode = '28000';
  end if;
  return v_crew_id;
end;
$$;

create or replace function create_crew(p_code_hash text, p_name text)
returns public.crews
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_crew public.crews;
begin
  insert into public.crews (code_hash, name) values (p_code_hash, p_name)
  returning * into v_crew;
  return v_crew;
end;
$$;

-- Returns the crew for a code, or NULL when the code is unknown. This is the
-- one function that must not raise on a bad code: the join screen needs to
-- tell "no such crew" apart from "request failed".
create or replace function join_crew(p_code_hash text)
returns public.crews
language sql
security definer
set search_path = ''
as $$
  select * from public.crews where code_hash = p_code_hash;
$$;

create or replace function list_members(p_code_hash text)
returns setof public.members
language sql
security definer
set search_path = ''
as $$
  select m.* from public.members m
  where m.crew_id = public.crew_id_for(p_code_hash)
  order by m.created_at;
$$;

create or replace function add_member(p_code_hash text, p_display_name text)
returns public.members
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.members;
begin
  insert into public.members (crew_id, display_name)
  values (public.crew_id_for(p_code_hash), p_display_name)
  returning * into v_member;
  return v_member;
end;
$$;

create or replace function list_sessions(p_code_hash text)
returns setof public.sessions
language sql
security definer
set search_path = ''
as $$
  select s.* from public.sessions s
  where s.crew_id = public.crew_id_for(p_code_hash)
  order by s.session_date desc, s.created_at desc;
$$;

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
  -- The member must belong to this crew, otherwise a valid code for crew A
  -- could be used to file sessions under a member of crew B.
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

-- The edit form owns every column except id/crew_id/member_id/created_at, so
-- this writes all of them in one atomic statement — no read-modify-write
-- window on the write itself.
--
-- Optimistic concurrency: p_expected_updated_at must match the row's current
-- updated_at, checked in the UPDATE's WHERE clause so the compare-and-write is
-- one atomic operation (not a separate SELECT then UPDATE, which would leave
-- its own race between two concurrent callers). If a second device changed
-- this session since the caller loaded it, zero rows match, nothing is
-- written, and the caller is told to reload instead of blindly overwriting
-- the other device's edit — this is the fix for the K2 data-loss pattern
-- from the Abendbrett review, which the previous version of this function
-- only described in a comment without actually implementing.
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

  -- The write matched nothing — find out why, only to give a precise error.
  if exists (select 1 from public.sessions where id = p_session_id and crew_id = v_crew_id) then
    raise exception 'session was changed by another device' using errcode = 'RL001';
  else
    raise exception 'session not found in this crew' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function delete_session(p_code_hash text, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.sessions
  where id = p_session_id
    and crew_id = public.crew_id_for(p_code_hash);
  if not found then
    raise exception 'session not found in this crew' using errcode = 'P0002';
  end if;
end;
$$;

-- ----------------------------------------------------------- privileges ---
-- anon may call the API functions and nothing else. crew_id_for stays internal:
-- it is called by the other functions (which run as owner), never by clients.

revoke all on all functions in schema public from anon, authenticated;

grant execute on function
  create_crew(text, text),
  join_crew(text),
  list_members(text),
  add_member(text, text),
  list_sessions(text),
  add_session(text, uuid, date, int, int, numeric, numeric, numeric),
  update_session(text, uuid, timestamptz, date, int, int, numeric, numeric, numeric),
  delete_session(text, uuid)
to anon;
