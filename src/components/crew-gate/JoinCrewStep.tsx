import { useState } from 'react'
import * as api from '../../lib/api'
import { ApiError } from '../../lib/api'
import { formatCrewCode, hashCrewCode, isValidCrewCodeFormat, normalizeCrewCode } from '../../lib/crewCode'
import type { PendingCrew } from './types'

interface JoinCrewStepProps {
  onJoined: (pending: PendingCrew) => void
  onBack: () => void
}

export default function JoinCrewStep({ onJoined, onBack }: JoinCrewStepProps) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    if (!isValidCrewCodeFormat(code)) {
      setError('Ein Crew-Code besteht aus 10 Zeichen, z.B. 4K7M9-P2XRT.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const codeHash = await hashCrewCode(code)
      const crew = await api.joinCrew(codeHash)
      if (!crew) {
        setError('Crew-Code nicht gefunden. Bitte prüfen und erneut versuchen.')
        return
      }
      onJoined({ crew, code: formatCrewCode(normalizeCrewCode(code)), codeHash })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Der Beitritt ist fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void handleJoin()
      }}
    >
      <h3 id="gate-heading">Crew beitreten</h3>
      <div className="field">
        <label htmlFor="crew-code">Crew-Code</label>
        <input
          id="crew-code"
          className="mono"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="z.B. 4K7M9-P2XRT"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
        />
      </div>
      {error && <div className="gate-error" role="alert">{error}</div>}
      <button type="submit" className="submit-btn" disabled={busy}>
        {busy ? 'Prüfe …' : 'Beitreten'}
      </button>
      <button type="button" className="link-btn" onClick={onBack}>
        Zurück
      </button>
    </form>
  )
}
