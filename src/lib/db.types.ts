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
  avg_watts: number | null
  avg_spm: number | null
  pace_per_500m_seconds: number | null
  created_at: string
  /** Bumped on every update_session write; used for the optimistic-concurrency check. */
  updated_at: string
}

/**
 * The fields both the add and edit forms collect — duration, distance, average
 * power and average stroke rate, plus the (overridable) computed pace. Add and
 * edit use the same shape because update_session now writes every editable
 * column in one statement rather than a partial subset.
 */
export interface SessionFormInput {
  session_date: string
  duration_seconds: number
  distance_m: number
  avg_watts: number | null
  avg_spm: number | null
  pace_per_500m_seconds: number | null
}

/** What the entry form produces, before crew/member are attached by the RPC. */
export type NewSessionInput = SessionFormInput

/** What the edit form produces; see update_session in schema.sql. */
export type SessionEditInput = SessionFormInput

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
