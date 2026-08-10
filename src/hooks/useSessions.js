import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { paceOf } from '../lib/format'

// loadState gates every write behind a confirmed load (K1 from the Abendbrett
// review: never let a write race ahead of an incomplete/stale local picture
// of the crew's data — the "+ Training eintragen" flow disables itself until
// this is 'ready').
export function useSessions(crewId) {
  const [sessions, setSessions] = useState([])
  const [loadState, setLoadState] = useState('idle') // idle | loading | ready | error

  const refresh = useCallback(async () => {
    if (!crewId) return
    setLoadState('loading')
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('crew_id', crewId)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) {
      setLoadState('error')
      return
    }
    setSessions(data)
    setLoadState('ready')
  }, [crewId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const bestPaceFor = useCallback(
    (memberId, excludeSessionId) => {
      const own = sessions.filter((s) => s.member_id === memberId && s.id !== excludeSessionId)
      if (!own.length) return null
      return Math.min(...own.map(paceOf))
    },
    [sessions],
  )

  const addSession = useCallback(
    async (payload) => {
      const prevBest = bestPaceFor(payload.member_id)
      const { data, error } = await supabase.from('sessions').insert(payload).select().single()
      if (error) throw error
      setSessions((prev) => [data, ...prev])
      const isPB = prevBest == null || paceOf(data) < prevBest
      return { session: data, isPB }
    },
    [bestPaceFor],
  )

  // K2 from the Abendbrett review: never blind-overwrite a row from a
  // possibly-stale in-memory copy. Re-fetch the current row right before
  // writing and merge only the changed fields onto it, so a concurrent edit
  // to a different field (from the other device) survives.
  const updateSession = useCallback(async (id, patch) => {
    const { data: fresh, error: fetchError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchError) throw fetchError
    const merged = { ...fresh, ...patch }
    const { data, error } = await supabase
      .from('sessions')
      .update(merged)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setSessions((prev) => prev.map((s) => (s.id === id ? data : s)))
    return data
  }, [])

  const deleteSession = useCallback(async (id) => {
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (error) throw error
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  return { sessions, loadState, refresh, addSession, updateSession, deleteSession, bestPaceFor }
}
