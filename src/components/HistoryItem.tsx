import { useState } from 'react'
import { fmtDate, fmtDuration, fmtPace, paceOf, parseDuration } from '../lib/format'
import { memberColor } from '../lib/memberColor'
import { useTwoStepConfirm } from '../hooks/useTwoStepConfirm'
import { firstError, sessionSchema } from '../lib/validation'
import { ApiError } from '../lib/api'
import type { Member, Session, SessionEditInput } from '../lib/db.types'

interface HistoryItemProps {
  session: Session
  member: Member | undefined
  isPB: boolean
  canEdit: boolean
  onUpdate: (sessionId: string, expectedUpdatedAt: string, input: SessionEditInput) => Promise<Session>
  onDelete: (sessionId: string) => Promise<void>
  onToast: (message: string) => void
}

export default function HistoryItem({
  session,
  member,
  isPB,
  canEdit,
  onUpdate,
  onDelete,
  onToast,
}: HistoryItemProps) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => ({
    date: session.session_date,
    duration: fmtDuration(session.duration_seconds),
    distance: String(session.distance_m),
    watts: session.avg_watts != null ? String(session.avg_watts) : '',
    spm: session.avg_spm != null ? String(session.avg_spm) : '',
    // Frozen at the moment editing starts — the optimistic-concurrency check
    // must compare against what this form was actually built from, not
    // whatever the session prop happens to be by the time it submits (a
    // background refresh could otherwise silently move this forward and
    // defeat the check).
    updatedAt: session.updated_at,
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { armed, handleClick: handleDeleteClick } = useTwoStepConfirm(() => {
    void onDelete(session.id)
  })

  /** Blank means "not recorded", not zero. */
  function optionalNumber(raw: string): number | null {
    if (raw.trim() === '') return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : Number.NaN
  }

  async function saveEdit() {
    setError(null)
    const durationSeconds = parseDuration(form.duration)
    const distanceMeters = Number.parseInt(form.distance, 10)

    // Same schema as new entries — update_session now writes every editable
    // column in one statement, so edit and add share the exact same shape.
    const parsed = sessionSchema.safeParse({
      session_date: form.date,
      duration_seconds: durationSeconds ?? Number.NaN,
      distance_m: distanceMeters,
      avg_watts: optionalNumber(form.watts),
      avg_spm: optionalNumber(form.spm),
      pace_per_500m_seconds:
        durationSeconds && distanceMeters > 0 ? (durationSeconds / distanceMeters) * 500 : null,
    })

    if (!parsed.success) {
      setError(firstError(parsed.error))
      return
    }

    setBusy(true)
    try {
      await onUpdate(session.id, form.updatedAt, parsed.data)
      setEditing(false)
    } catch (err) {
      if (err instanceof ApiError && err.isConflict) {
        // The other device's change already won and was pulled into local
        // state by useSessions; continuing to edit this stale form would
        // just invite overwriting it again. Drop back to the (now current)
        // display view and say what happened, instead of a silent retry.
        setEditing(false)
        onToast(err.message)
        return
      }
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
          {/* No inputMode="numeric": that keypad has no colon on iOS/Android,
              which would make "mm:ss" impossible to type. */}
          <input
            type="text"
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
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            aria-label="Leistung in Watt"
            placeholder="Watt"
            value={form.watts}
            onChange={(e) => setForm((f) => ({ ...f, watts: e.target.value }))}
          />
          <input
            type="number"
            inputMode="numeric"
            min={0}
            aria-label="Schläge pro Minute"
            placeholder="SPM"
            value={form.spm}
            onChange={(e) => setForm((f) => ({ ...f, spm: e.target.value }))}
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
