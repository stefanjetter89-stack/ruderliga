import { useState } from 'react'
import { fmtPace, parseDuration, todayIso } from '../lib/format'
import { firstError, sessionSchema } from '../lib/validation'
import type { NewSessionInput } from '../lib/db.types'
import type { LoadState } from '../hooks/useCrewMembers'

interface EntryFormProps {
  memberId: string
  loadState: LoadState
  onAddSession: (memberId: string, input: NewSessionInput) => Promise<{ isPB: boolean }>
  onToast: (message: string) => void
}

interface FormState {
  date: string
  duration: string
  distance: string
  watts: string
  spm: string
}

function emptyForm(): FormState {
  return { date: todayIso(), duration: '', distance: '', watts: '', spm: '' }
}

/** Parses an optional numeric field: blank means "not recorded", not zero. */
function optionalNumber(raw: string): number | null {
  if (raw.trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : Number.NaN
}

export default function EntryForm({ memberId, loadState, onAddSession, onToast }: EntryFormProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [paceOverride, setPaceOverride] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const durationSeconds = parseDuration(form.duration)
  const distanceMeters = Number.parseInt(form.distance, 10)
  const computedPace =
    durationSeconds && Number.isFinite(distanceMeters) && distanceMeters > 0
      ? (durationSeconds / distanceMeters) * 500
      : null

  function update<K extends keyof FormState>(field: K, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) {
      setForm(emptyForm())
      setPaceOverride('')
      setError(null)
    }
  }

  async function handleSubmit() {
    setError(null)

    // An override that does not parse must not fall back silently to the
    // computed value — the user typed it deliberately and would never see that
    // their correction was dropped.
    let pace = computedPace
    if (paceOverride.trim() !== '') {
      const parsed = parseDuration(paceOverride)
      if (parsed === null) {
        setError('Die Zeit pro 500 m muss als mm:ss angegeben werden.')
        return
      }
      pace = parsed
    }

    const candidate = {
      session_date: form.date,
      duration_seconds: durationSeconds ?? Number.NaN,
      distance_m: distanceMeters,
      avg_watts: optionalNumber(form.watts),
      avg_spm: optionalNumber(form.spm),
      pace_per_500m_seconds: pace,
    }

    const parsed = sessionSchema.safeParse(candidate)
    if (!parsed.success) {
      setError(firstError(parsed.error))
      return
    }

    setBusy(true)
    try {
      const { isPB } = await onAddSession(memberId, parsed.data)
      setOpen(false)
      setForm(emptyForm())
      setPaceOverride('')
      onToast(isPB ? '🏆 Neue Bestzeit!' : 'Eintrag gespeichert')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  const disabled = loadState !== 'ready'

  return (
    <>
      <button
        type="button"
        className="add-btn"
        onClick={toggle}
        disabled={disabled}
        aria-expanded={open}
      >
        {disabled ? 'Daten werden geladen …' : '+ Training eintragen'}
      </button>

      {open && (
        <form
          className="panel open"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
        >
          <h3>Neue Trainingseinheit</h3>

          <div className="field">
            <label htmlFor="f-date">Datum</label>
            <input
              id="f-date"
              type="date"
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
            />
          </div>

          <div className="grid2">
            <div className="field">
              <label htmlFor="f-duration">Dauer (mm:ss)</label>
              <input
                id="f-duration"
                type="text"
                inputMode="numeric"
                placeholder="z.B. 20:00"
                value={form.duration}
                onChange={(e) => update('duration', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="f-distance">Distanz (m)</label>
              <input
                id="f-distance"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="z.B. 4500"
                value={form.distance}
                onChange={(e) => update('distance', e.target.value)}
              />
            </div>
          </div>

          <div className="pace-preview">
            <label htmlFor="f-pace">Zeit/500m (auto-berechnet, überschreibbar)</label>
            <input
              id="f-pace"
              className="pace-override mono"
              type="text"
              inputMode="numeric"
              placeholder={computedPace ? fmtPace(computedPace) : '–:––'}
              value={paceOverride}
              onChange={(e) => setPaceOverride(e.target.value)}
            />
          </div>

          <div className="grid2">
            <div className="field">
              <label htmlFor="f-watts">Leistung Ø (Watt)</label>
              <input
                id="f-watts"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="z.B. 145"
                value={form.watts}
                onChange={(e) => update('watts', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="f-spm">Schläge/Min (Ø)</label>
              <input
                id="f-spm"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="z.B. 24"
                value={form.spm}
                onChange={(e) => update('spm', e.target.value)}
              />
            </div>
          </div>

          {error && <div className="gate-error" role="alert">{error}</div>}

          <button type="submit" className="submit-btn" disabled={busy}>
            {busy ? 'Speichere …' : 'Eintrag speichern'}
          </button>
        </form>
      )}
    </>
  )
}
