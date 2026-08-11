import { useCallback, useState } from 'react'
import { clearIdentity, loadIdentity, saveIdentity } from '../lib/localIdentity'
import type { CrewIdentity, Member } from '../lib/db.types'

export interface UseCrewIdentity {
  identity: CrewIdentity | null
  setIdentity: (next: CrewIdentity) => void
  clear: () => void
  switchMember: (member: Pick<Member, 'id' | 'display_name'>) => void
}

/**
 * Single source of truth for "which crew and member is this device".
 *
 * Loaded once from localStorage at startup; every change goes through here so
 * the in-memory value and the stored one cannot drift apart.
 */
export function useCrewIdentity(): UseCrewIdentity {
  const [identity, setIdentityState] = useState<CrewIdentity | null>(() => loadIdentity())

  const setIdentity = useCallback((next: CrewIdentity) => {
    saveIdentity(next)
    setIdentityState(next)
  }, [])

  const clear = useCallback(() => {
    clearIdentity()
    setIdentityState(null)
  }, [])

  // Keeps the crew and its credential, only swaps which member this device acts as.
  const switchMember = useCallback((member: Pick<Member, 'id' | 'display_name'>) => {
    setIdentityState((current) => {
      if (!current) return current
      const next: CrewIdentity = {
        ...current,
        memberId: member.id,
        displayName: member.display_name,
      }
      saveIdentity(next)
      return next
    })
  }, [])

  return { identity, setIdentity, clear, switchMember }
}
