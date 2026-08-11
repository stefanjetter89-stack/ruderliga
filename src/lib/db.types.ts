// Row shapes as returned by the RPCs in supabase/schema.sql.
// Hand-maintained: the Supabase type generator needs the CLI, which this
// project does not use. Keep in sync with the schema by hand.

export interface Crew {
  id: string
  code_hash: string
  name: string | null
  created_at: string
}

export interface Member {
  id: string
  crew_id: string
  display_name: string
  created_at: string
}

export interface Session {
  id: string
  crew_id: string
  member_id: string
  session_date: string
  duration_seconds: number
  distance_m: number
  total_strokes: number | null
  avg_spm: number | null
  pace_per_500m_seconds: number | null
  resistance_level: number | null
  created_at: string
}

/** What the entry form produces, before crew/member are attached by the RPC. */
export interface NewSessionInput {
  session_date: string
  duration_seconds: number
  distance_m: number
  total_strokes: number | null
  avg_spm: number | null
  pace_per_500m_seconds: number | null
  resistance_level: number | null
}

/** The subset of columns the edit form owns; see update_session in schema.sql. */
export interface SessionEditInput {
  session_date: string
  duration_seconds: number
  distance_m: number
  pace_per_500m_seconds: number | null
}

/** Identity of this device: which crew, which member, and the crew credential. */
export interface CrewIdentity {
  crewId: string
  crewName: string | null
  /** Plaintext code, kept so it can be shown again in settings. */
  crewCode: string
  /** Capability passed to every RPC call. */
  codeHash: string
  memberId: string
  displayName: string
}
