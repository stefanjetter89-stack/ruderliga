import { useCallback, useEffect, useState } from 'react'
import * as api from '../lib/api'
import { ApiError } from '../lib/api'
import type { Member } from '../lib/db.types'
import { useRefreshOnFocus } from './useRefreshOnFocus'

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export interface UseCrewMembers {
  members: Member[]
  loadState: LoadState
  error: string | null
  refresh: () => Promise<void>
  /** Adds the member to local state without a refetch round-trip. */
  addLocal: (member: Member) => void
}

export function useCrewMembers(codeHash: string | null): UseCrewMembers {
  const [members, setMembers] = useState<Member[]>([])
  const [loadState, setLoadState] = useState<LoadState>(codeHash ? 'loading' : 'idle')
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!codeHash) {
      setMembers([])
      setLoadState('idle')
      return
    }
    setLoadState('loading')
    try {
      setMembers(await api.listMembers(codeHash))
      setError(null)
      setLoadState('ready')
    } catch (err) {
      // v1 swallowed this, leaving an empty list that looked like "no members".
      setError(err instanceof ApiError ? err.message : 'Die Mitglieder konnten nicht geladen werden.')
      setLoadState('error')
    }
  }, [codeHash])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Must refresh alongside the sessions: a member who joined from the other
  // device owns sessions that arrive with the next session refresh, and without
  // their row those entries render with no name and drop out of the ranking.
  useRefreshOnFocus(() => void refresh())

  const addLocal = useCallback((member: Member) => {
    setMembers((prev) => (prev.some((m) => m.id === member.id) ? prev : [...prev, member]))
  }, [])

  return { members, loadState, error, refresh, addLocal }
}
