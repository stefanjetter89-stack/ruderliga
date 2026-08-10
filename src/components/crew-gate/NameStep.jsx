import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCrewMembers } from '../../hooks/useCrewMembers'

export default function NameStep({ crewId, crewName, onComplete }) {
  const { members, loading } = useCrewMembers(crewId)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [matchCandidate, setMatchCandidate] = useState(null)

  function findExisting(value) {
    const normalized = value.trim().toLowerCase()
    return members.find((m) => m.display_name.trim().toLowerCase() === normalized)
  }

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Bitte einen Namen eingeben.')
      return
    }
    const existing = findExisting(trimmed)
    if (existing) {
      setMatchCandidate(existing)
      return
    }
    createMember(trimmed)
  }

  async function createMember(displayName) {
    setBusy(true)
    setError(null)
    const { data, error: insertError } = await supabase
      .from('members')
      .insert({ crew_id: crewId, display_name: displayName })
      .select()
      .single()
    setBusy(false)
    if (insertError) {
      if (insertError.code === '23505') {
        // Someone else took this name between our check and the insert.
        setError('Dieser Name wurde gerade eben vergeben. Bitte einen anderen wählen.')
        return
      }
      setError('Konnte nicht beitreten. Bitte erneut versuchen.')
      return
    }
    onComplete({ crewId, crewName, memberId: data.id, displayName: data.display_name })
  }

  if (matchCandidate) {
    return (
      <div>
        <h3>Bist du das?</h3>
        <p className="gate-hint">
          <b>{matchCandidate.display_name}</b> ist bereits Mitglied dieser Crew.
        </p>
        <button
          className="submit-btn"
          onClick={() =>
            onComplete({
              crewId,
              crewName,
              memberId: matchCandidate.id,
              displayName: matchCandidate.display_name,
            })
          }
        >
          Ja, das bin ich
        </button>
        <button className="link-btn" onClick={() => setMatchCandidate(null)}>
          Nein, anderer Name
        </button>
      </div>
    )
  }

  return (
    <div>
      <h3>Wie heißt du?</h3>
      <div className="field">
        <label>Dein Name</label>
        <input
          type="text"
          placeholder="z.B. Stefan"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
      </div>
      {error && <div className="gate-error">{error}</div>}
      <button className="submit-btn" onClick={handleSubmit} disabled={busy || loading}>
        {busy ? 'Speichere …' : 'Weiter'}
      </button>
    </div>
  )
}
