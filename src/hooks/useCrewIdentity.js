import { useCallback, useState } from 'react'
import { clearIdentity, loadIdentity, saveIdentity } from '../lib/localIdentity'

// Single source of truth for "which crew + member is this device". Loaded
// once from localStorage at startup; every change goes through setIdentity /
// clear so the two never drift apart.
export function useCrewIdentity() {
  const [identity, setIdentityState] = useState(() => loadIdentity())

  const setIdentity = useCallback((next) => {
    saveIdentity(next)
    setIdentityState(next)
  }, [])

  const clear = useCallback(() => {
    clearIdentity()
    setIdentityState(null)
  }, [])

  // Keeps the crew, only swaps which member this device acts as.
  const switchMember = useCallback(
    (member) => {
      if (!identity) return
      const next = { ...identity, memberId: member.id, displayName: member.display_name }
      saveIdentity(next)
      setIdentityState(next)
    },
    [identity],
  )

  return { identity, setIdentity, clear, switchMember }
}
