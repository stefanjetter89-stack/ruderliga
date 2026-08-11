import { supabase } from './supabase'
import type { Crew, Member, NewSessionInput, Session, SessionEditInput } from './db.types'

// The app's entire data layer. Every call goes through a security-definer RPC
// and carries the crew's code hash as its credential — there is no direct table
// access, because the tables are closed to the anon role (see schema.sql).

/** Error carrying a message already suitable for display to the user. */
export class ApiError extends Error {
  readonly cause: unknown
  /**
   * Set when update_session rejected a write because the row changed since
   * the caller loaded it (see supabase/schema.sql). Distinguishes "someone
   * else edited this in the meantime" from an ordinary failure, so the UI can
   * discard the stale edit and reload instead of showing a generic error.
   */
  readonly isConflict: boolean

  constructor(message: string, cause?: unknown, isConflict = false) {
    super(message)
    this.name = 'ApiError'
    this.cause = cause
    this.isConflict = isConflict
  }
}

/**
 * Turns a Postgres/PostgREST error into German user-facing text.
 *
 * The technical detail is preserved in `cause` rather than shown: it is noise
 * to the user, and error strings from the database can echo back input.
 */
export function toApiError(
  error: { code?: string; message?: string } | null,
  fallback: string,
): ApiError {
  if (error?.code === '28000') {
    return new ApiError('Zugriff verweigert — der Crew-Code ist ungültig.', error)
  }
  if (error?.code === '23505') {
    return new ApiError('Dieser Name ist in der Crew bereits vergeben.', error)
  }
  if (error?.code === 'P0002') {
    return new ApiError('Der Eintrag existiert nicht mehr — vermutlich auf einem anderen Gerät gelöscht.', error)
  }
  if (error?.code === 'RL001') {
    return new ApiError(
      'Dieser Eintrag wurde gerade auf einem anderen Gerät geändert. Die aktuellen Werte wurden geladen — bitte einmal prüfen und ggf. erneut bearbeiten.',
      error,
      true,
    )
  }
  if (error?.code === '23514') {
    return new ApiError('Die Werte liegen außerhalb des zulässigen Bereichs.', error)
  }
  return new ApiError(fallback, error)
}

export async function createCrew(codeHash: string, name: string | null): Promise<Crew> {
  const { data, error } = await supabase
    .rpc('create_crew', { p_code_hash: codeHash, p_name: name })
    .single<Crew>()
  if (error || !data) throw toApiError(error, 'Die Crew konnte nicht erstellt werden.')
  return data
}

/** Resolves a code to its crew, or null when no crew has that code. */
export async function joinCrew(codeHash: string): Promise<Crew | null> {
  const { data, error } = await supabase
    .rpc('join_crew', { p_code_hash: codeHash })
    .maybeSingle<Crew>()
  if (error) throw toApiError(error, 'Der Beitritt ist fehlgeschlagen.')
  return data
}

export async function listMembers(codeHash: string): Promise<Member[]> {
  const { data, error } = await supabase.rpc('list_members', { p_code_hash: codeHash })
  if (error) throw toApiError(error, 'Die Mitglieder konnten nicht geladen werden.')
  return (data ?? []) as Member[]
}

export async function addMember(codeHash: string, displayName: string): Promise<Member> {
  const { data, error } = await supabase
    .rpc('add_member', { p_code_hash: codeHash, p_display_name: displayName })
    .single<Member>()
  if (error || !data) throw toApiError(error, 'Das Mitglied konnte nicht angelegt werden.')
  return data
}

export async function listSessions(codeHash: string): Promise<Session[]> {
  const { data, error } = await supabase.rpc('list_sessions', { p_code_hash: codeHash })
  if (error) throw toApiError(error, 'Die Trainingseinheiten konnten nicht geladen werden.')
  return (data ?? []) as Session[]
}

export async function addSession(
  codeHash: string,
  memberId: string,
  input: NewSessionInput,
): Promise<Session> {
  const { data, error } = await supabase
    .rpc('add_session', {
      p_code_hash: codeHash,
      p_member_id: memberId,
      p_session_date: input.session_date,
      p_duration_seconds: input.duration_seconds,
      p_distance_m: input.distance_m,
      p_avg_watts: input.avg_watts,
      p_avg_spm: input.avg_spm,
      p_pace_per_500m_seconds: input.pace_per_500m_seconds,
    })
    .single<Session>()
  if (error || !data) throw toApiError(error, 'Der Eintrag konnte nicht gespeichert werden.')
  return data
}

/**
 * Atomic, conflict-checked update: the RPC writes every editable column in
 * one statement, and only if `expectedUpdatedAt` still matches the row's
 * current `updated_at` — otherwise it rejects with a conflict error rather
 * than overwriting whatever the other device just changed (see
 * update_session in schema.sql).
 */
export async function updateSession(
  codeHash: string,
  sessionId: string,
  expectedUpdatedAt: string,
  input: SessionEditInput,
): Promise<Session> {
  const { data, error } = await supabase
    .rpc('update_session', {
      p_code_hash: codeHash,
      p_session_id: sessionId,
      p_expected_updated_at: expectedUpdatedAt,
      p_session_date: input.session_date,
      p_duration_seconds: input.duration_seconds,
      p_distance_m: input.distance_m,
      p_avg_watts: input.avg_watts,
      p_avg_spm: input.avg_spm,
      p_pace_per_500m_seconds: input.pace_per_500m_seconds,
    })
    .single<Session>()
  if (error || !data) throw toApiError(error, 'Die Änderung konnte nicht gespeichert werden.')
  return data
}

export async function deleteSession(codeHash: string, sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_session', {
    p_code_hash: codeHash,
    p_session_id: sessionId,
  })
  if (error) throw toApiError(error, 'Der Eintrag konnte nicht gelöscht werden.')
}
