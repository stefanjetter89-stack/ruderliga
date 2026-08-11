import { describe, expect, it } from 'vitest'
import { computeLeaderboard, crewRecord, personalBests } from './leaderboard'
import type { Member, Session } from './db.types'

const NOW = new Date(2026, 7, 12) // Wed 12 Aug 2026

function member(id: string, name: string): Member {
  return { id, crew_id: 'crew', display_name: name, created_at: '2026-01-01T00:00:00Z' }
}

let sessionCounter = 0
function session(memberId: string, date: string, duration: number, distance: number): Session {
  sessionCounter += 1
  return {
    id: `s${sessionCounter}`,
    crew_id: 'crew',
    member_id: memberId,
    session_date: date,
    duration_seconds: duration,
    distance_m: distance,
    total_strokes: null,
    avg_spm: null,
    pace_per_500m_seconds: null,
    resistance_level: null,
    created_at: `2026-01-01T00:00:0${sessionCounter % 10}Z`,
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
