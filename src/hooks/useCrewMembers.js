import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useCrewMembers(crewId) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(Boolean(crewId))

  const refresh = useCallback(async () => {
    if (!crewId) {
      setMembers([])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('crew_id', crewId)
      .order('created_at', { ascending: true })
    if (!error) setMembers(data)
    setLoading(false)
  }, [crewId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { members, loading, refresh }
}
