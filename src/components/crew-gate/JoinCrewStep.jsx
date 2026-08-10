import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { hashCrewCode, isValidCrewCodeFormat } from '../../lib/crewCode'

export default function JoinCrewStep({ onJoined, onBack }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleJoin() {
    if (!isValidCrewCodeFormat(code)) {
      setError('Format sollte z.B. EICHE-42 sein.')
      return
    }
    setBusy(true)
    setError(null)
    const code_hash = await hashCrewCode(code)
    const { data, error: queryError } = await supabase
      .from('crews')
      .select('*')
      .eq('code_hash', code_hash)
      .maybeSingle()
    setBusy(false)
    if (queryError) {
      setError('Beitritt fehlgeschlagen. Bitte erneut versuchen.')
      return
    }
    if (!data) {
      setError('Crew-Code nicht gefunden. Bitte prüfen und erneut versuchen.')
      return
    }
    onJoined({ crewId: data.id, crewName: data.name })
  }

  return (
    <div>
      <h3>Crew beitreten</h3>
      <div className="field">
        <label>Crew-Code</label>
        <input
          type="text"
          placeholder="z.B. EICHE-42"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          autoFocus
        />
      </div>
      {error && <div className="gate-error">{error}</div>}
      <button className="submit-btn" onClick={handleJoin} disabled={busy}>
        {busy ? 'Prüfe …' : 'Beitreten'}
      </button>
      <button className="link-btn" onClick={onBack}>Zurück</button>
    </div>
  )
}
