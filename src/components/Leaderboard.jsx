import { useMemo, useState } from 'react'
import { paceOf, fmtPace, withinDays, withinPeriod } from '../lib/format'
import { memberColor } from '../lib/memberColor'

const CATEGORIES = [
  { key: 'pace', label: 'Bestzeit /500m' },
  { key: 'distance', label: 'Gesamtdistanz' },
  { key: 'freq', label: 'Trainingsfrequenz' },
]

const PERIODS = [
  { key: 'all', label: 'Alle-Zeit' },
  { key: 'month', label: 'Dieser Monat' },
  { key: 'week', label: 'Diese Woche' },
]

export default function Leaderboard({ sessions, members }) {
  const [activeCat, setActiveCat] = useState('pace')
  const [period, setPeriod] = useState('all')
  const [freqWindow, setFreqWindow] = useState(7)

  const rows = useMemo(() => {
    if (activeCat === 'freq') {
      return members
        .map((m) => {
          const count = sessions.filter(
            (s) => s.member_id === m.id && withinDays(s.session_date, freqWindow),
          ).length
          return { member: m, value: count, display: `${count}x`, unit: `letzte ${freqWindow} Tage` }
        })
        .sort((a, b) => b.value - a.value)
    }

    const scoped = sessions.filter((s) => withinPeriod(s.session_date, period))

    if (activeCat === 'pace') {
      return members
        .map((m) => {
          const own = scoped.filter((s) => s.member_id === m.id)
          if (!own.length) return null
          const best = Math.min(...own.map(paceOf))
          return { member: m, value: best, display: fmtPace(best), unit: 'min/500m' }
        })
        .filter(Boolean)
        .sort((a, b) => a.value - b.value)
    }

    // distance
    return members
      .map((m) => {
        const own = scoped.filter((s) => s.member_id === m.id)
        const sum = own.reduce((a, s) => a + s.distance_m, 0)
        return { member: m, value: sum, display: `${(sum / 1000).toFixed(1)} km`, unit: `${own.length} Sessions` }
      })
      .sort((a, b) => b.value - a.value)
  }, [activeCat, sessions, members, period, freqWindow])

  return (
    <>
      <div className="tabs">
        {CATEGORIES.map((c) => (
          <div
            key={c.key}
            className={`tab ${c.key === activeCat ? 'active' : ''}`}
            onClick={() => setActiveCat(c.key)}
          >
            {c.label}
          </div>
        ))}
      </div>

      {activeCat === 'freq' ? (
        <div className="tabs tabs-sub">
          {[7, 30].map((n) => (
            <div
              key={n}
              className={`tab ${freqWindow === n ? 'active' : ''}`}
              onClick={() => setFreqWindow(n)}
            >
              {n} Tage
            </div>
          ))}
        </div>
      ) : (
        <div className="tabs tabs-sub">
          {PERIODS.map((p) => (
            <div
              key={p.key}
              className={`tab ${period === p.key ? 'active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </div>
          ))}
        </div>
      )}

      <div className="board">
        {rows.length === 0 && <div className="empty-hint">Noch keine Einträge in diesem Zeitraum.</div>}
        {rows.map((r, i) => (
          <div key={r.member.id} className={`card rank-${i + 1}`}>
            <div className="rank">{i + 1}</div>
            <div className="card-name">
              <div className="n" style={{ color: memberColor(r.member.id) }}>
                {r.member.display_name}
              </div>
              <div className="s">{r.unit}</div>
            </div>
            <div className="card-value">
              <div className="v mono">{r.display}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
