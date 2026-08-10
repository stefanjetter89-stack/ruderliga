import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { generateCrewCode, hashCrewCode } from '../../lib/crewCode'

export default function CreateCrewStep({ onCreated, onBack }) {
  const [crewName, setCrewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [createdCode, setCreatedCode] = useState(null)
  const [createdCrewId, setCreatedCrewId] = useState(null)

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      let lastError = null
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCrewCode()
        const code_hash = await hashCrewCode(code)
        const { data, error: insertError } = await supabase
          .from('crews')
          .insert({ code_hash, name: crewName.trim() || null })
          .select()
          .single()
        if (!insertError) {
          setCreatedCode(code)
          setCreatedCrewId(data.id)
          setBusy(false)
          return
        }
        lastError = insertError
        // 23505 = unique_violation on code_hash — extremely unlikely, retry with a new code.
        if (insertError.code !== '23505') break
      }
      throw lastError
    } catch (err) {
      setError('Crew konnte nicht erstellt werden. Bitte erneut versuchen.')
      setBusy(false)
    }
  }

  if (createdCode) {
    return (
      <div>
        <h3>Crew erstellt 🎉</h3>
        <p className="gate-hint">
          Das ist euer Crew-Code. Teile ihn mit der zweiten Person, damit sie beitreten kann —
          er wird nirgends im Klartext gespeichert, also notiere ihn dir jetzt.
        </p>
        <div className="crew-code-display mono">{createdCode}</div>
        <button className="submit-btn" onClick={() => onCreated({ crewId: createdCrewId, crewName: crewName.trim() || null })}>
          Weiter zur Namenswahl
        </button>
      </div>
    )
  }

  return (
    <div>
      <h3>Neue Crew erstellen</h3>
      <div className="field">
        <label>Crew-Name (optional)</label>
        <input
          type="text"
          placeholder="z.B. Wohnzimmer-Crew"
          value={crewName}
          onChange={(e) => setCrewName(e.target.value)}
        />
      </div>
      {error && <div className="gate-error">{error}</div>}
      <button className="submit-btn" onClick={handleCreate} disabled={busy}>
        {busy ? 'Erstelle …' : 'Crew erstellen'}
      </button>
      <button className="link-btn" onClick={onBack}>Zurück</button>
    </div>
  )
}
