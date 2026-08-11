import type { Session } from './db.types'

// Formatting/parsing for durations, pace and dates.
//
// Date handling note: `new Date('2026-08-10')` is parsed as UTC midnight, which
// in German timezones is the previous evening in local terms and makes
// day-difference maths off by one near midnight. Every date-only string here
// therefore goes through parseIsoDate, which builds a *local* midnight instead.

export function parseIsoDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

/**
 * Guards distance_m <= 0 explicitly rather than relying on the Zod schema and
 * DB constraint (both require >= 1) to keep this correct as a standalone
 * function — a 0 m row would otherwise divide to Infinity and sort to rank 1
 * on the leaderboard instead of being excluded.
 */
export function paceOf(session: Pick<Session, 'duration_seconds' | 'distance_m'>): number {
  if (session.distance_m <= 0) return Number.NaN
  return (session.duration_seconds / session.distance_m) * 500
}

export function fmtPace(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '–:––'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  // Rounding 59.6 s gives 60 — carry it into the minute instead of showing "2:60".
  if (s === 60) return `${m + 1}:00`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function fmtDuration(seconds: number): string {
  return fmtPace(seconds)
}

/**
 * Parses "mm:ss" (or "m:ss") into seconds; null when malformed.
 *
 * Rejects a seconds field of 60 or more: "20:75" is a typo, and silently
 * reading it as 21:15 would quietly corrupt a leaderboard entry.
 */
export function parseDuration(str: string | null | undefined): number | null {
  if (!str) return null
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(str.trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function fmtDate(dateStr: string): string {
  return parseIsoDate(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

export function fmtDateLong(dateStr: string): string {
  return parseIsoDate(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function todayIso(): string {
  const now = new Date()
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(
    local.getDate(),
  ).padStart(2, '0')}`
}

/** Rolling window: is the date within the last `n` days from today? */
export function withinDays(dateStr: string, n: number, now: Date = new Date()): boolean {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = (today.getTime() - parseIsoDate(dateStr).getTime()) / 86400000
  // Future dates (a device clock running ahead) still count as "recent".
  return diffDays < n && diffDays >= -1
}

/** Monday-based start of the calendar week containing `now`, per German convention. */
function startOfWeek(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayOfWeek = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - dayOfWeek)
  return d
}

export type Period = 'all' | 'month' | 'week'

/**
 * Calendar-based filter for the leaderboard.
 *
 * "Diese Woche" and "Dieser Monat" mean the current calendar week/month, not a
 * rolling window — the rolling one is the separate Trainingsfrequenz view.
 */
export function withinPeriod(dateStr: string, period: Period, now: Date = new Date()): boolean {
  if (period === 'all') return true
  const d = parseIsoDate(dateStr)
  if (period === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }
  return d.getTime() >= startOfWeek(now).getTime()
}
