import type { Member, Session } from './db.types'
import { fmtPace, paceOf, withinDays, withinPeriod, type Period } from './format'
import { energyEquivalent, energyProgress, energyWh, fmtEnergy } from './energy'

// Ranking logic, kept as pure functions so it can be tested without React.
//
// Only metrics that are fair between two different people are here — no
// calories, no heart rate: both depend on body weight and fitness level and
// would rank the lighter person higher for the same effort.

export type Category = 'pace' | 'distance' | 'freq' | 'watts' | 'energy'

export interface LeaderboardRow {
  member: Member
  /** Sort key; unit depends on category. */
  value: number
  /** Preformatted main figure. */
  display: string
  /** Secondary line under the name. */
  unit: string
  /** Only set for the energy category: progress toward the next tier. */
  progress?: {
    fraction: number
    nextLabel: string | null
  }
}

export interface LeaderboardOptions {
  sessions: Session[]
  members: Member[]
  category: Category
  period: Period
  /** Rolling window in days, used by the `freq` category only. */
  freqWindow: number
  /** Injectable for tests. */
  now?: Date
}

export function computeLeaderboard({
  sessions,
  members,
  category,
  period,
  freqWindow,
  now = new Date(),
}: LeaderboardOptions): LeaderboardRow[] {
  if (category === 'freq') {
    // Frequency is explicitly a rolling window, so it ignores the period filter.
    return members
      .map((member) => {
        const count = sessions.filter(
          (s) => s.member_id === member.id && withinDays(s.session_date, freqWindow, now),
        ).length
        return {
          member,
          value: count,
          display: `${count}x`,
          unit: `letzte ${freqWindow} Tage`,
        }
      })
      .sort((a, b) => b.value - a.value || a.member.display_name.localeCompare(b.member.display_name))
  }

  const scoped = sessions.filter((s) => withinPeriod(s.session_date, period, now))

  if (category === 'pace') {
    return members
      .map((member) => {
        const own = scoped.filter((s) => s.member_id === member.id)
        if (own.length === 0) return null
        const best = Math.min(...own.map(paceOf))
        return { member, value: best, display: fmtPace(best), unit: 'min/500m' }
      })
      .filter((row): row is LeaderboardRow => row !== null)
      // Ascending: faster is better.
      .sort((a, b) => a.value - b.value || a.member.display_name.localeCompare(b.member.display_name))
  }

  if (category === 'watts') {
    return members
      .map((member) => {
        // Sessions where power wasn't recorded don't count as a 0 W result.
        const own = scoped.filter((s) => s.member_id === member.id && s.avg_watts != null)
        if (own.length === 0) return null
        const best = Math.max(...own.map((s) => s.avg_watts as number))
        return { member, value: best, display: `${Math.round(best)} W`, unit: 'beste Einheit' }
      })
      .filter((row): row is LeaderboardRow => row !== null)
      // Descending: more power is better.
      .sort((a, b) => b.value - a.value || a.member.display_name.localeCompare(b.member.display_name))
  }

  if (category === 'energy') {
    return members
      .map((member) => {
        const own = scoped.filter((s) => s.member_id === member.id)
        // Sessions without a recorded watt value contribute 0, same as
        // distance includes every member (even at 0) rather than omitting
        // anyone who hasn't logged power yet.
        const sum = own.reduce((total, s) => total + (energyWh(s) ?? 0), 0)
        const progress = energyProgress(sum)
        return {
          member,
          value: sum,
          display: fmtEnergy(sum),
          unit: energyEquivalent(sum),
          progress: { fraction: progress.fraction, nextLabel: progress.nextLabel },
        }
      })
      .sort((a, b) => b.value - a.value || a.member.display_name.localeCompare(b.member.display_name))
  }

  return members
    .map((member) => {
      const own = scoped.filter((s) => s.member_id === member.id)
      const sum = own.reduce((total, s) => total + s.distance_m, 0)
      return {
        member,
        value: sum,
        display: `${(sum / 1000).toFixed(1)} km`,
        unit: `${own.length} ${own.length === 1 ? 'Session' : 'Sessions'}`,
      }
    })
    .sort((a, b) => b.value - a.value || a.member.display_name.localeCompare(b.member.display_name))
}

/** The crew's overall fastest session, for the hero display. */
export function crewRecord(sessions: Session[]): Session | null {
  return sessions.reduce<Session | null>(
    (best, s) => (best === null || paceOf(s) < paceOf(best) ? s : best),
    null,
  )
}

/** Fastest pace per member, used to mark personal bests in the history list. */
export function personalBests(sessions: Session[]): Map<string, number> {
  const best = new Map<string, number>()
  for (const s of sessions) {
    const pace = paceOf(s)
    const current = best.get(s.member_id)
    if (current === undefined || pace < current) best.set(s.member_id, pace)
  }
  return best
}
