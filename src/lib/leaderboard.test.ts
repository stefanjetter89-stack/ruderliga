import { describe, expect, it } from 'vitest'
import { computeLeaderboard, crewRecord, personalBests } from './leaderboard'
import type { Member, Session } from './db.types'

const NOW = new Date(2026, 7, 12) // Wed 12 Aug 2026

function member(id: string, name: string): Member {
  return { id, crew_id: 'crew', display_name: name, created_at: '2026-01-01T00:00:00Z' }
}

let sessionCounter = 0
function session(
  memberId: string,
  date: string,
  duration: number,
  distance: number,
  watts: number | null = null,
): Session {
  sessionCounter += 1
  return {
    id: `s${sessionCounter}`,
    crew_id: 'crew',
    member_id: memberId,
    session_date: date,
    duration_seconds: duration,
    distance_m: distance,
    avg_watts: watts,
    avg_spm: null,
    pace_per_500m_seconds: null,
    created_at: `2026-01-01T00:00:0${sessionCounter % 10}Z`,
    updated_at: `2026-01-01T00:00:0${sessionCounter % 10}Z`,
  }
}

const stefan = member('m1', 'Stefan')
const julia = member('m2', 'Julia')
const members = [stefan, julia]

describe('computeLeaderboard — pace', () => {
  it('ranks the fastest 500 m split first', () => {
    const sessions = [
      session('m1', '2026-08-10', 1200, 4500), // 133.3 s/500m
      session('m2', '2026-08-10', 1200, 5000), // 120.0 s/500m — faster
    ]
    const rows = computeLeaderboard({
      sessions,
      members,
      category: 'pace',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows.map((r) => r.member.display_name)).toEqual(['Julia', 'Stefan'])
    expect(rows[0]?.display).toBe('2:00')
  })

  it('uses each member’s single best session, not their average', () => {
    const sessions = [
      session('m1', '2026-08-10', 1200, 5000), // 120 s — the best
      session('m1', '2026-08-11', 2400, 4000), // 300 s — should not drag it down
    ]
    const rows = computeLeaderboard({
      sessions,
      members: [stefan],
      category: 'pace',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows[0]?.value).toBe(120)
  })

  it('omits members with no session in the period rather than ranking them last', () => {
    const sessions = [session('m1', '2026-08-10', 1200, 5000)]
    const rows = computeLeaderboard({
      sessions,
      members,
      category: 'pace',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.member.display_name).toBe('Stefan')
  })

  it('honours the period filter', () => {
    const sessions = [
      session('m1', '2026-07-15', 1000, 5000), // last month, faster
      session('m1', '2026-08-11', 1200, 5000), // this month
    ]
    const allTime = computeLeaderboard({
      sessions,
      members: [stefan],
      category: 'pace',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    const thisMonth = computeLeaderboard({
      sessions,
      members: [stefan],
      category: 'pace',
      period: 'month',
      freqWindow: 7,
      now: NOW,
    })
    expect(allTime[0]?.value).toBe(100)
    expect(thisMonth[0]?.value).toBe(120)
  })
})

describe('computeLeaderboard — distance', () => {
  it('sums distance descending and counts sessions', () => {
    const sessions = [
      session('m1', '2026-08-10', 1200, 4000),
      session('m1', '2026-08-11', 1200, 4000),
      session('m2', '2026-08-11', 1200, 5000),
    ]
    const rows = computeLeaderboard({
      sessions,
      members,
      category: 'distance',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows[0]?.member.display_name).toBe('Stefan')
    expect(rows[0]?.display).toBe('8.0 km')
    expect(rows[0]?.unit).toBe('2 Sessions')
    expect(rows[1]?.unit).toBe('1 Session')
  })

  it('keeps members with no sessions at zero instead of dropping them', () => {
    const rows = computeLeaderboard({
      sessions: [session('m1', '2026-08-10', 1200, 4000)],
      members,
      category: 'distance',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows).toHaveLength(2)
    expect(rows[1]?.display).toBe('0.0 km')
  })
})

describe('computeLeaderboard — watts', () => {
  it('ranks the highest single-session average power first', () => {
    const sessions = [
      session('m1', '2026-08-10', 1200, 4500, 150),
      session('m2', '2026-08-10', 1200, 5000, 180), // higher — wins
    ]
    const rows = computeLeaderboard({
      sessions,
      members,
      category: 'watts',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows.map((r) => r.member.display_name)).toEqual(['Julia', 'Stefan'])
    expect(rows[0]?.display).toBe('180 W')
  })

  it('uses each member’s best session, not an average of averages', () => {
    const sessions = [
      session('m1', '2026-08-10', 1200, 5000, 120), // lower
      session('m1', '2026-08-11', 1200, 5000, 190), // the best
    ]
    const rows = computeLeaderboard({
      sessions,
      members: [stefan],
      category: 'watts',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows[0]?.value).toBe(190)
  })

  it('excludes sessions with no recorded power instead of treating them as 0 W', () => {
    const rows = computeLeaderboard({
      sessions: [session('m1', '2026-08-10', 1200, 5000, null)],
      members: [stefan],
      category: 'watts',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows).toHaveLength(0)
  })

  it('omits a member entirely if none of their sessions recorded power', () => {
    const sessions = [
      session('m1', '2026-08-10', 1200, 5000, 150),
      session('m2', '2026-08-10', 1200, 5000, null),
    ]
    const rows = computeLeaderboard({
      sessions,
      members,
      category: 'watts',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.member.display_name).toBe('Stefan')
  })

  it('honours the period filter like pace and distance do', () => {
    const sessions = [
      session('m1', '2026-07-15', 1200, 5000, 200), // last month, higher
      session('m1', '2026-08-11', 1200, 5000, 150), // this month
    ]
    const thisMonth = computeLeaderboard({
      sessions,
      members: [stefan],
      category: 'watts',
      period: 'month',
      freqWindow: 7,
      now: NOW,
    })
    expect(thisMonth[0]?.value).toBe(150)
  })
})

describe('computeLeaderboard — energy', () => {
  it('sums power × time across sessions, unlike a single best value', () => {
    const sessions = [
      // 150 W for 20 min = 50 Wh
      session('m1', '2026-08-10', 1200, 5000, 150),
      // 150 W for 30 min = 75 Wh — same power, more Wh because it's longer
      session('m1', '2026-08-11', 1800, 5000, 150),
    ]
    const rows = computeLeaderboard({
      sessions,
      members: [stefan],
      category: 'energy',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows[0]?.value).toBeCloseTo(125, 5)
    expect(rows[0]?.display).toBe('125 Wh')
  })

  it('ranks a longer, lower-power session above a shorter, higher-power one when it produced more total energy', () => {
    // This is the exact case Bestleistung gets "wrong": the sprint has the
    // higher average watts but the steady row did more total work.
    const sprint = session('m1', '2026-08-10', 300, 1500, 300) // 5 min @ 300W = 25 Wh
    const steady = session('m2', '2026-08-10', 2400, 8000, 120) // 40 min @ 120W = 80 Wh
    const rows = computeLeaderboard({
      sessions: [sprint, steady],
      members,
      category: 'energy',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows.map((r) => r.member.display_name)).toEqual(['Julia', 'Stefan'])
  })

  it('includes every member at 0 Wh rather than omitting those without recorded power', () => {
    const rows = computeLeaderboard({
      sessions: [session('m1', '2026-08-10', 1200, 5000, null)],
      members,
      category: 'energy',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.member.display_name === 'Julia')?.display).toBe('0 Wh')
  })

  it('shows the tiered energy-equivalent unit, correctly pluralized', () => {
    // The tier logic itself is unit-tested exhaustively in energy.test.ts —
    // this just checks the leaderboard actually wires the cumulative sum
    // into it, not a specific session's value.
    const singular = computeLeaderboard({
      sessions: [session('m1', '2026-08-10', 3600, 5000, 25)], // 1h @ 25W = 25 Wh = 1 Handlampen-Ladung
      members: [stefan],
      category: 'energy',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(singular[0]?.unit).toBe('🔦 ≈ 1 Handlampen-Ladung')

    const plural = computeLeaderboard({
      sessions: [session('m1', '2026-08-10', 1200, 5000, 150)], // 20 min @ 150W = 50 Wh ≈ 2 Handlampen-Ladungen
      members: [stefan],
      category: 'energy',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(plural[0]?.unit).toBe('🔦 ≈ 2 Handlampen-Ladungen')
  })

  it('formats totals of 1000 Wh and above as kWh', () => {
    // 20 sessions × 60 Wh = 1200 Wh
    const sessions = Array.from({ length: 20 }, () => session('m1', '2026-08-10', 1200, 5000, 180))
    const rows = computeLeaderboard({
      sessions,
      members: [stefan],
      category: 'energy',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows[0]?.display).toBe('1.2 kWh')
  })

  it('honours the period filter like the other cumulative categories', () => {
    const sessions = [
      session('m1', '2026-07-15', 1200, 5000, 150), // last month
      session('m1', '2026-08-11', 1200, 5000, 150), // this month
    ]
    const thisMonth = computeLeaderboard({
      sessions,
      members: [stefan],
      category: 'energy',
      period: 'month',
      freqWindow: 7,
      now: NOW,
    })
    expect(thisMonth[0]?.value).toBeCloseTo(50, 5)
  })

  it('attaches progress-toward-next-tier information to each row', () => {
    // 30 min @ 100W = 50 Wh — inside the Handfunkgerät(10)->Handlampen(25)
    // ->Wärmebildkamera(60) run, currently in the Handlampen span.
    const rows = computeLeaderboard({
      sessions: [session('m1', '2026-08-10', 1800, 5000, 100)],
      members: [stefan],
      category: 'energy',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows[0]?.progress?.nextLabel).toBe('📷 Wärmebildkamera-Ladung')
    expect(rows[0]?.progress?.fraction).toBeGreaterThan(0)
    expect(rows[0]?.progress?.fraction).toBeLessThan(1)
  })
})

describe('computeLeaderboard — progress is energy-only', () => {
  it('leaves progress unset for every other category', () => {
    const sessions = [session('m1', '2026-08-10', 1200, 4500, 150)]
    for (const category of ['pace', 'distance', 'watts', 'freq'] as const) {
      const rows = computeLeaderboard({
        sessions,
        members: [stefan],
        category,
        period: 'all',
        freqWindow: 7,
        now: NOW,
      })
      expect(rows[0]?.progress).toBeUndefined()
    }
  })
})

describe('computeLeaderboard — frequency', () => {
  it('counts sessions inside the rolling window', () => {
    const sessions = [
      session('m1', '2026-08-11', 1200, 4000),
      session('m1', '2026-08-10', 1200, 4000),
      session('m1', '2026-07-01', 1200, 4000), // outside 7 days
      session('m2', '2026-08-12', 1200, 4000),
    ]
    const rows = computeLeaderboard({
      sessions,
      members,
      category: 'freq',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows[0]?.display).toBe('2x')
    expect(rows[0]?.member.display_name).toBe('Stefan')
    expect(rows[1]?.display).toBe('1x')
  })

  it('ignores the period filter, since the window is its own scope', () => {
    const sessions = [session('m1', '2026-07-31', 1200, 4000)] // last month, within 30 days
    const rows = computeLeaderboard({
      sessions,
      members: [stefan],
      category: 'freq',
      period: 'month',
      freqWindow: 30,
      now: NOW,
    })
    expect(rows[0]?.display).toBe('1x')
  })
})

describe('tie-breaking', () => {
  it('orders equal scores by name so the board does not jump between renders', () => {
    const sessions = [
      session('m1', '2026-08-10', 1200, 5000),
      session('m2', '2026-08-10', 1200, 5000),
    ]
    const rows = computeLeaderboard({
      sessions,
      members,
      category: 'pace',
      period: 'all',
      freqWindow: 7,
      now: NOW,
    })
    expect(rows.map((r) => r.member.display_name)).toEqual(['Julia', 'Stefan'])
  })
})

describe('crewRecord', () => {
  it('finds the fastest session across the whole crew', () => {
    const fastest = session('m2', '2026-08-10', 1200, 5000)
    const record = crewRecord([session('m1', '2026-08-10', 1200, 4000), fastest])
    expect(record?.id).toBe(fastest.id)
  })

  it('returns null for an empty crew', () => {
    expect(crewRecord([])).toBeNull()
  })
})

describe('personalBests', () => {
  it('reports the fastest pace per member', () => {
    const bests = personalBests([
      session('m1', '2026-08-10', 1200, 4000), // 150
      session('m1', '2026-08-11', 1200, 5000), // 120
      session('m2', '2026-08-11', 1200, 4000), // 150
    ])
    expect(bests.get('m1')).toBe(120)
    expect(bests.get('m2')).toBe(150)
    expect(bests.has('m3')).toBe(false)
  })
})
