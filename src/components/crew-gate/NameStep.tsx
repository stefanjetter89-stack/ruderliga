import { useState } from 'react'
import * as api from '../../lib/api'
import { ApiError } from '../../lib/api'
import { useCrewMembers } from '../../hooks/useCrewMembers'
import { displayNameSchema, firstError } from '../../lib/validation'
import type { CrewIdentity, Member } from '../../lib/db.types'

interface NameStepProps {
  crewId: string
  crewName: string | null
  crewCode: string
  codeHash: string
  onComplete: (identity: CrewIdentity) => void
}

export default function NameStep({ crewId, crewName, crewCode, codeHash, onComplete }: NameStepProps) {
  const { members, loadState } = useCrewMembers(codeHash)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matchCandidate, setMatchCandidate] = useState<Member | null>(null)

  function complete(member: Pick<Member, 'id' | 'display_name'>) {
    onComplete({
      crewId,
      crewName,
      crewCode,
      codeHash,
      memberId: member.id,
      displayName: member.display_name,
    })
  }

  function handleSubmit() {
    const parsed = displayNameSchema.safeParse(name)
    if (!parsed.success) {
      setError(firstError(parsed.error))
      return
    }
    const normalized = parsed.data.toLowerCase()
    const existing = members.find((m) => m.display_name.trim().toLowerCase() === normalized)
    if (existing) {
      setMatchCandidate(existing)
      return
    }
    void createMember(parsed.data)
  }

  async function createMember(displayName: string) {
    setBusy(true)
    setError(null)
    try {
      complete(await api.addMember(codeHash, displayName))
    } catch (err) {
      // 23505 arrives here when someone claimed the name between our check and
      // the insert; api.ts already turns it into a readable message.
      setError(err instanceof ApiError ? err.message : 'Der Beitritt ist fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  if (matchCandidate) {
    return (
      <div>
        <h3 id="gate-heading">Bist du das?</h3>
        <p className="gate-hint">
          <b>{matchCandidate.display_name}</b> ist bereits Mitglied dieser Crew.
        </p>
        <button type="button" className="submit-btn" onClick={() => complete(matchCandidate)}>
          Ja, das bin ich
        </button>
        <button type="button" className="link-btn" onClick={() => setMatchCandidate(null)}>
          Nein, anderer Name
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
    >
      <h3 id="gate-heading">Wie heißt du?</h3>
      <div className="field">
        <label htmlFor="display-name">Dein Name</label>
        <input
          id="display-name"
          type="text"
          maxLength={40}
          placeholder="z.B. Stefan"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      {error && <div className="gate-error" role="alert">{error}</div>}
      <button type="submit" className="submit-btn" disabled={busy || loadState === 'loading'}>
        {busy ? 'Speichere …' : 'Weiter'}
      </button>
    </form>
  )
}
