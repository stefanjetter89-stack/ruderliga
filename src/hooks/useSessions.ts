import { useCallback, useEffect, useState } from 'react'
import * as api from '../lib/api'
import { ApiError } from '../lib/api'
import { paceOf } from '../lib/format'
import { personalBests } from '../lib/leaderboard'
import type { NewSessionInput, Session, SessionEditInput } from '../lib/db.types'
import type { LoadState } from './useCrewMembers'
import { useRefreshOnFocus } from './useRefreshOnFocus'

export interface UseSessions {
  sessions: Session[]
  loadState: LoadState
  error: string | null
  refresh: () => Promise<void>
  addSession: (memberId: string, input: NewSessionInput) => Promise<{ session: Session; isPB: boolean }>
  updateSession: (sessionId: string, expectedUpdatedAt: string, input: SessionEditInput) => Promise<Session>
  deleteSession: (sessionId: string) => Promise<void>
}

/**
 * The crew's sessions plus the mutations on them.
 *
 * `loadState` gates writes behind a confirmed load (K1 from the Abendbrett
 * review): the entry form stays disabled until this reaches 'ready', so a write
 * can never race ahead of an incomplete picture of the crew's data.
 */
export function useSessions(codeHash: string | null): UseSessions {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadState, setLoadState] = useState<LoadState>(codeHash ? 'loading' : 'idle')
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!codeHash) {
      setSessions([])
      setLoadState('idle')
      return
    }
    setLoadState('loading')
    try {
      setSessions(await api.listSessions(codeHash))
      setError(null)
      setLoadState('ready')
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Die Trainingseinheiten konnten nicht geladen werden.',
      )
      setLoadState('error')
    }
  }, [codeHash])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Picks up entries the other crew member added while this tab sat in the background.
  useRefreshOnFocus(() => void refresh())

  const addSession = useCallback(
    async (memberId: string, input: NewSessionInput) => {
      if (!codeHash) throw new ApiError('Keine Crew aktiv.')
      // Captured before the insert so the new row cannot beat its own record.
      const previousBest = personalBests(sessions).get(memberId)
      const session = await api.addSession(codeHash, memberId, input)
      setSessions((prev) => sortSessions([session, ...prev]))
      return { session, isPB: previousBest === undefined || paceOf(session) < previousBest }
    },
    [codeHash, sessions],
  )

  const updateSession = useCallback(
    async (sessionId: string, expectedUpdatedAt: string, input: SessionEditInput) => {
      if (!codeHash) throw new ApiError('Keine Crew aktiv.')
      try {
        // Atomic, conflict-checked server-side update — see api.updateSession.
        const updated = await api.updateSession(codeHash, sessionId, expectedUpdatedAt, input)
        setSessions((prev) => sortSessions(prev.map((s) => (s.id === sessionId ? updated : s))))
        return updated
      } catch (err) {
        // On a conflict, pull the row the other device actually wrote so the
        // UI reflects reality instead of the stale copy the edit form had —
        // this is what replaces the silent-overwrite behaviour (K2 fix).
        if (err instanceof ApiError && err.isConflict) await refresh()
        throw err
      }
    },
    [codeHash, refresh],
  )

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!codeHash) throw new ApiError('Keine Crew aktiv.')
      await api.deleteSession(codeHash, sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    },
    [codeHash],
  )

  return { sessions, loadState, error, refresh, addSession, updateSession, deleteSession }
}

/** Mirrors the server ordering so local edits keep the list stable. */
function sortSessions(list: Session[]): Session[] {
  return [...list].sort(
    (a, b) =>
      b.session_date.localeCompare(a.session_date) || b.created_at.localeCompare(a.created_at),
  )
}
