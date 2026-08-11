import { useState } from 'react'
import * as api from '../../lib/api'
import { ApiError } from '../../lib/api'
import { generateCrewCode, hashCrewCode } from '../../lib/crewCode'
import { crewNameSchema, firstError } from '../../lib/validation'
import type { PendingCrew } from './types'

interface CreateCrewStepProps {
  onCreated: (pending: PendingCrew) => void
  onBack: () => void
}

export default function CreateCrewStep({ onCreated, onBack }: CreateCrewStepProps) {
  const [crewName, setCrewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<PendingCrew | null>(null)

  async function handleCreate() {
    const parsed = crewNameSchema.safeParse(crewName)
    if (!parsed.success) {
      setError(firstError(parsed.error))
      return
    }

    setBusy(true)
    setError(null)
    try {
      const code = generateCrewCode()
      const codeHash = await hashCrewCode(code)
      const crew = await api.createCrew(codeHash, parsed.data || null)
      setCreated({ crew, code, codeHash })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Die Crew konnte nicht erstellt werden.')
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    return (
      <div>
        <h3 id="gate-heading">Crew erstellt 🎉</h3>
        <p className="gate-hint">
          Das ist euer Crew-Code — teile ihn mit der zweiten Person, damit sie beitreten kann.
          Er wird auf diesem Gerät gespeichert und ist jederzeit unter Einstellungen einsehbar.
        </p>
        <div className="crew-code-display mono">{created.code}</div>
        <button type="button" className="submit-btn" onClick={() => onCreated(created)}>
          Weiter zur Namenswahl
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void handleCreate()
      }}
    >
      <h3 id="gate-heading">Neue Crew erstellen</h3>
      <div className="field">
        <label htmlFor="crew-name">Crew-Name (optional)</label>
        <input
          id="crew-name"
          type="text"
          maxLength={60}
          placeholder="z.B. Wohnzimmer-Crew"
          value={crewName}
          onChange={(e) => setCrewName(e.target.value)}
        />
      </div>
      {error && <div className="gate-error" role="alert">{error}</div>}
      <button type="submit" className="submit-btn" disabled={busy}>
        {busy ? 'Erstelle …' : 'Crew erstellen'}
      </button>
      <button type="button" className="link-btn" onClick={onBack}>
        Zurück
      </button>
    </form>
  )
}
