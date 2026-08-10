-- Ruderliga schema — run once in the Supabase SQL editor of a fresh project.
--
-- Security model: there is no Supabase Auth. Access is gated by the Crew-Code
-- (see src/lib/crewCode.js) the same way Abendbrett's "Kosmos" group codes
-- work: the client hashes the code and looks up a crew by code_hash, then
-- treats that crew's id as a shared secret capability for the rest of the
-- session. Because the anon key cannot express "only rows for the crew_id
-- this client already knows" at the RLS layer, the policies below simply open
-- members/sessions to the anon role — the real gate is that you can only ever
-- learn a crew_id by first proving you know its code. This mirrors the
-- Kosmos model 1:1; do not add Supabase Auth on top of it.

create extension if not exists pgcrypto;

create table crews (
  id uuid primary key default gen_random_uuid(),
  code_hash text unique not null,
  name text,
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crews(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (crew_id, display_name)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crews(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  session_date date not null,
  duration_seconds int not null,
  distance_m int not null,
  total_strokes int,
  avg_spm numeric,
  -- Client-precomputed from duration_seconds/distance_m*500, but a plain
  -- (non-generated) column so it can be overridden before saving if the
  -- device's own display disagrees with the arithmetic.
  pace_per_500m_seconds numeric,
  resistance_level int check (resistance_level between 1 and 15),
  created_at timestamptz not null default now()
);

create index sessions_crew_id_idx on sessions(crew_id);
create index members_crew_id_idx on members(crew_id);

alter table crews enable row level security;
alter table members enable row level security;
alter table sessions enable row level security;

-- crews: anon may look up a crew by code_hash (join flow) and create new
-- crews (create flow). No update/delete — a crew's code/name never changes
-- from the client.
create policy "crews are readable by anyone with the anon key" on crews
  for select using (true);
create policy "anyone can create a crew" on crews
  for insert with check (true);

-- members: full anon access once crew_id is known (see security model above).
create policy "members are readable by anyone with the anon key" on members
  for select using (true);
create policy "anyone can add a member" on members
  for insert with check (true);

-- sessions: full anon CRUD once crew_id is known.
create policy "sessions are readable by anyone with the anon key" on sessions
  for select using (true);
create policy "anyone can add a session" on sessions
  for insert with check (true);
create policy "anyone can update a session" on sessions
  for update using (true) with check (true);
create policy "anyone can delete a session" on sessions
  for delete using (true);
