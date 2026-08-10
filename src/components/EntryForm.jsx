import { useState } from 'react'
import { fmtPace, parseDuration, todayIso } from '../lib/format'

const emptyForm = {
  date: todayIso(),
  duration: '',
  distance: '',
  strokes: '',
  spm: '',
  resistance: '',
}

export default function EntryForm({ crewId, memberId, loadState, onAddSession, onToast }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [paceOverride, setPaceOverride] = useState('')
  const [busy, setBusy] = useState(false)

  const dur = parseDuration(form.duration)
  const dist = parseFloat(form.distance)
  const computedPace = dur && dist ? (dur / dist) * 500 : null

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggle() {
    setOpen((o) => !o)
    if (!open) {
      setForm({ ...emptyForm, date: todayIso() })
      setPaceOverride('')
    }
  }

  async function handleSubmit() {
    const duration_seconds = parseDuration(form.duration)
    const distance_m = parseFloat(form.distance)
    if (!form.date || !duration_seconds || !distance_m) {
      onToast('Bitte Datum, Dauer und Distanz ausfüllen')
      return
    }
    const pace_per_500m_seconds = paceOverride
      ? parseDuration(paceOverride)
      : computedPace

    setBusy(true)
    try {
      const { isPB } = await onAddSession({
        crew_id: crewId,
        member_id: memberId,
        session_date: form.date,
        duration_seconds,
        distance_m,
        total_strokes: form.strokes ? parseInt(form.strokes, 10) : null,
        avg_spm: form.spm ? parseFloat(form.spm) : null,
        pace_per_500m_seconds,
        resistance_level: form.resistance ? parseInt(form.resistance, 10) : null,
      })
      setOpen(false)
      setForm(emptyForm)
      setPaceOverride('')
      onToast(isPB ? '🏆 Neue Bestzeit!' : 'Eintrag gespeichert')
    } catch {
      onToast('Speichern fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button className="add-btn" onClick={toggle} disabled={loadState !== 'ready'}>
        {loadState !== 'ready' ? 'Lade Daten …' : '+ Training eintragen'}
      </button>

      <div className={`panel ${open ? 'open' : ''}`}>
        <h3>Neue Trainingseinheit</h3>
        <div className="field">
          <label>Datum</label>
          <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
        </div>
        <div className="grid2">
          <div className="field">
            <label>Dauer (mm:ss)</label>
            <input
              type="text"
              placeholder="z.B. 20:00"
              value={form.duration}
              onChange={(e) => update('duration', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Distanz (m)</label>
            <input
              type="number"
              placeholder="z.B. 4500"
              value={form.distance}
              onChange={(e) => update('distance', e.target.value)}
            />
          </div>
        </div>
        <div className="pace-preview">
          <span>Zeit/500m (auto-berechnet, überschreibbar)</span>
          <input
            className="pace-override mono"
            type="text"
            placeholder={computedPace ? fmtPace(computedPace) : '–:––'}
            value={paceOverride}
            onChange={(e) => setPaceOverride(e.target.value)}
          />
        </div>
        <div className="grid2">
          <div className="field">
            <label>Ruderschläge gesamt</label>
            <input
              type="number"
              placeholder="z.B. 820"
              value={form.strokes}
              onChange={(e) => update('strokes', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Schläge/Min (Ø)</label>
            <input
              type="number"
              placeholder="z.B. 24"
              value={form.spm}
              onChange={(e) => update('spm', e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label>Widerstandsstufe (1–15, optional)</label>
          <input
            type="number"
            min="1"
            max="15"
            placeholder="optional"
            value={form.resistance}
            onChange={(e) => update('resistance', e.target.value)}
          />
        </div>
        <button className="submit-btn" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Speichere …' : 'Eintrag speichern'}
        </button>
      </div>
    </>
  )
}
