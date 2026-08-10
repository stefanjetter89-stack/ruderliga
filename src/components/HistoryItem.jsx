import { useState } from 'react'
import { fmtDate, fmtDuration, fmtPace, paceOf, parseDuration } from '../lib/format'
import { memberColor } from '../lib/memberColor'
import { useTwoStepConfirm } from '../hooks/useTwoStepConfirm'

export default function HistoryItem({ session, member, isPB, canEdit, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => ({
    date: session.session_date,
    duration: fmtDuration(session.duration_seconds),
    distance: String(session.distance_m),
  }))
  const [busy, setBusy] = useState(false)
  const { armed, handleClick: handleDeleteClick, cancel: cancelDelete } = useTwoStepConfirm(
    () => onDelete(session.id),
  )

  async function saveEdit() {
    const duration_seconds = parseDuration(form.duration)
    const distance_m = parseFloat(form.distance)
    if (!form.date || !duration_seconds || !distance_m) return
    setBusy(true)
    try {
      await onUpdate(session.id, {
        session_date: form.date,
        duration_seconds,
        distance_m,
        pace_per_500m_seconds: (duration_seconds / distance_m) * 500,
      })
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="activity-item activity-editing">
        <div className="edit-grid">
          <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          <input
            type="text"
            placeholder="mm:ss"
            value={form.duration}
            onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
          />
          <input
            type="number"
            placeholder="Distanz (m)"
            value={form.distance}
            onChange={(e) => setForm((f) => ({ ...f, distance: e.target.value }))}
          />
        </div>
        <div className="edit-actions">
          <button className="link-btn" onClick={() => setEditing(false)}>Abbrechen</button>
          <button className="submit-btn submit-btn-sm" onClick={saveEdit} disabled={busy}>
            {busy ? 'Speichere …' : 'Speichern'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="activity-item">
      <div className="act-dot" style={{ background: memberColor(session.member_id) }} />
      <div className="act-body">
        <div className="t">
          <b>{member ? member.display_name : '–'}</b> — {(session.distance_m / 1000).toFixed(1)}km in{' '}
          {fmtDuration(session.duration_seconds)} · {fmtPace(paceOf(session))}/500m
        </div>
        <div className="d">{fmtDate(session.session_date)}</div>
      </div>
      {isPB && <div className="act-pb">PB</div>}
      {canEdit && (
        <div className="act-actions">
          <button type="button" className="link-btn" onClick={() => setEditing(true)}>
            Bearbeiten
          </button>
          <button
            type="button"
            className={`link-btn danger ${armed ? 'armed' : ''}`}
            onClick={handleDeleteClick}
            onMouseLeave={cancelDelete}
          >
            {armed ? 'Wirklich?' : 'Löschen'}
          </button>
        </div>
      )}
    </div>
  )
}
