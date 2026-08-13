import { useMemo, useState } from 'react'
import { computeLeaderboard, type Category } from '../lib/leaderboard'
import { memberColor } from '../lib/memberColor'
import type { Period } from '../lib/format'
import type { Member, Session } from '../lib/db.types'

const CATEGORIES: ReadonlyArray<{ key: Category; label: string }> = [
  { key: 'pace', label: 'Bestzeit /500m' },
  { key: 'distance', label: 'Gesamtdistanz' },
  { key: 'freq', label: 'Trainingsfrequenz' },
  { key: 'watts', label: 'Bestleistung' },
  { key: 'energy', label: 'Erruderte Energie' },
]

const PERIODS: ReadonlyArray<{ key: Period; label: string }> = [
  { key: 'all', label: 'Alle-Zeit' },
  { key: 'month', label: 'Dieser Monat' },
  { key: 'week', label: 'Diese Woche' },
]

const FREQ_WINDOWS = [7, 30] as const

interface LeaderboardProps {
  sessions: Session[]
  members: Member[]
}

export default function Leaderboard({ sessions, members }: LeaderboardProps) {
  const [category, setCategory] = useState<Category>('pace')
  const [period, setPeriod] = useState<Period>('all')
  const [freqWindow, setFreqWindow] = useState<number>(7)

  const rows = useMemo(
    () => computeLeaderboard({ sessions, members, category, period, freqWindow }),
    [sessions, members, category, period, freqWindow],
  )

  return (
    <>
      {/* Tabs are a single-select control, so they carry radio semantics rather
          than being unlabelled clickable divs. */}
      <div className="tabs" role="tablist" aria-label="Rangliste-Kategorie">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={c.key === category}
            className={`tab ${c.key === category ? 'active' : ''}`}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {category === 'freq' ? (
        <div className="tabs tabs-sub" role="tablist" aria-label="Zeitfenster">
          {FREQ_WINDOWS.map((n) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={freqWindow === n}
              className={`tab ${freqWindow === n ? 'active' : ''}`}
              onClick={() => setFreqWindow(n)}
            >
              {n} Tage
            </button>
          ))}
        </div>
      ) : (
        <div className="tabs tabs-sub" role="tablist" aria-label="Zeitraum">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={period === p.key}
              className={`tab ${period === p.key ? 'active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="board">
        {rows.length === 0 && (
          <div className="empty-hint">Noch keine Einträge in diesem Zeitraum.</div>
        )}
        {rows.map((row, i) => (
          <div key={row.member.id} className={`card rank-${i + 1}`}>
            <div className="rank mono" aria-label={`Platz ${i + 1}`}>
              {i + 1}
            </div>
            <div className="card-name">
              <div className="n" style={{ color: memberColor(row.member.id) }}>
                {row.member.display_name}
              </div>
              <div className="s">{row.unit}</div>
            </div>
            <div className="card-value">
              <div className="v mono">{row.display}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
