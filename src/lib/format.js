// Shared formatting/parsing helpers for durations, pace and dates.
// Ported from ruderliga-mockup.html so the production app matches the reference 1:1.

export function paceOf(session) {
  return (session.duration_seconds / session.distance_m) * 500
}

export function fmtPace(seconds) {
  if (seconds == null || !isFinite(seconds)) return '–:––'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function fmtDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// Accepts "mm:ss" or "m:ss", returns total seconds or null if invalid.
export function parseDuration(str) {
  if (!str) return null
  const parts = str.trim().split(':').map(Number)
  if (parts.length === 2 && parts.every((p) => Number.isFinite(p) && p >= 0)) {
    return parts[0] * 60 + parts[1]
  }
  return null
}

export function fmtDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

export function fmtDateLong(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function withinDays(dateStr, n) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 86400000
  return diff <= n && diff >= -1
}

// period: 'all' | 'month' | 'week'
export function withinPeriod(dateStr, period) {
  if (period === 'all') return true
  const now = new Date()
  const d = new Date(dateStr)
  if (period === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }
  if (period === 'week') {
    return withinDays(dateStr, 7)
  }
  return true
}
