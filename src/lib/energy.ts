import type { Session } from './db.types'

// Energy is derived, not captured: Energy (Wh) = Power (W) × Time (h). Unlike
// a raw average-watts figure, it accounts for duration, so a short hard
// sprint no longer beats a long steady row just because its instantaneous
// power was higher — and it's cumulative like distance, so it can be summed
// across a whole training history.

export function energyWh(session: Pick<Session, 'avg_watts' | 'duration_seconds'>): number | null {
  if (session.avg_watts == null) return null
  return session.avg_watts * (session.duration_seconds / 3600)
}

export function fmtEnergy(wh: number): string {
  if (wh >= 1000) return `${(wh / 1000).toFixed(1)} kWh`
  return `${Math.round(wh)} Wh`
}

// Typical smartphone battery capacity is roughly 11-18 Wh depending on the
// device; 12 Wh is a conservative round number so the comparison undersells
// rather than oversells the effort.
const PHONE_CHARGE_WH = 12

export function phoneCharges(wh: number): number {
  return Math.round(wh / PHONE_CHARGE_WH)
}
