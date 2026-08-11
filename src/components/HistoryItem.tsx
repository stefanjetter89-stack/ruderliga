import { useState } from 'react'
import { fmtDate, fmtDuration, fmtPace, paceOf, parseDuration } from '../lib/format'
import { memberColor } from '../lib/memberColor'
import { useTwoStepConfirm } from '../hooks/useTwoStepConfirm'
import { firstError, sessionSchema } from '../lib/validation'
import type { Member, Session, SessionEditInput } from '../lib/db.types'

interface HistoryItemProps {
  session: Session
  member: Member | undefined
  isPB: boolean
  canEdit: boolean
  onUpdate: (sessionId: string, input: SessionEditInput) => Promise<Session>
  onDelete: (sessionId: string) => Promise<void>
}

export default function HistoryItem({
  session,
  member,
  isPB,
  canEdit,
  onUpdate,
  onDelete,
}: HistoryItemProps) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => ({
    date: session.session_date,
    duration: fmtDuration(session.duration_seconds),
    distance: String(session.distance_m),
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { armed, handleClick: handleDeleteClick } = useTwoStepConfirm(() => {
    void onDelete(session.id)
  })

  async function saveEdit() {
    setError(null)
    const durationSeconds = parseDuration(form.duration)
    const distanceMeters = Number.parseInt(form.distance, 10)

    // Validated against the same schema as new entries, minus the fields this
    // form does not own; update_session leaves those columns untouched.
    const parsed = sessionSchema
      .pick({
        session_date: true,
        duration_seconds: true,
        distance_m: true,
        pace_per_500m_seconds: true,
      })
      .safeParse({
        session_date: form.date,
        duration_seconds: durationSeconds ?? Number.NaN,
        distance_m: distanceMeters,
        pace_per_500m_seconds:
          durationSeconds && distanceMeters > 0 ? (durationSeconds / distanceMeters) * 500 : null,
      })

    if (!parsed.success) {
      setError(firstError(parsed.error))
      return
    }

    setBusy(true)
    try {
      await onUpdate(session.id, parsed.data)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <form
        className="activity-item activity-editing"
        onSubmit={(e) => {
          e.preventDefault()
          void saveEdit()
        }}
      >
        <div className="edit-grid">
          <input
            type="date"
            aria-label="Datum"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
          <input
            type="text"
            inputMode="numeric"
            aria-label="Dauer in mm:ss"
            placeholder="mm:ss"
            value={form.duration}
            onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
          />
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            aria-label="Distanz in Metern"
            placeholder="Distanz (m)"
            value={form.distance}
            onChange={(e) => setForm((f) => ({ ...f, distance: e.target.value }))}
          />
        </div>
        {error && <div className="gate-error" role="alert">{error}</div>}
        <div className="edit-actions">
          <button type="button" className="link-btn" onClick={() => setEditing(false)}>
            Abbrechen
          </button>
          <button type="submit" className="submit-btn submit-btn-sm" disabled={busy}>
            {busy ? 'Speichere …' : 'Speichern'}
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="activity-item">
      <div
        className="act-dot"
        style={{ background: memberColor(session.member_id) }}
        aria-hidden="true"
      />
      <div className="act-body">
        <div className="t">
          <b>{member ? member.display_name : '–'}</b> — {(session.distance_m / 1000).toFixed(1)}km in{' '}
          {fmtDuration(session.duration_seconds)} · {fmtPace(paceOf(session))}/500m
        </div>
        <div className="d">{fmtDate(session.session_date)}</div>
      </div>
      {isPB && (
        <div className="act-pb" title="Persönliche Bestzeit">
          PB
        </div>
      )}
      {canEdit && (
        <div className="act-actions">
          <button type="button" className="link-btn" onClick={() => setEditing(true)}>
            Bearbeiten
          </button>
          <button
            type="button"
            className={`link-btn danger ${armed ? 'armed' : ''}`}
            onClick={handleDeleteClick}
          >
            {armed ? 'Wirklich?' : 'Löschen'}
          </button>
        </div>
      )}
    </div>
  )
}
