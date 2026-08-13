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

interface EnergyTier {
  wh: number
  emoji: string
  singular: string
  plural: string
}

// Ballpark figures for the fun factor, not technical specs — Feuerwehr gear,
// chosen so the comparison escalates as the total grows instead of just
// restating the same unit in ever-bigger multiples.
//
// Sized against a 10-year horizon: at a realistic 3-5 sessions/week around
// 30-40 min each (~120-150 W), that's roughly 9-26 kWh/year, so ~100-250 kWh
// after a decade. The top tier sits inside that range on purpose — reachable
// a few times over, not "done" after year one and not still out of reach
// after ten.
const ENERGY_TIERS: readonly EnergyTier[] = [
  { wh: 15, emoji: '🔦', singular: 'Handlampen-Ladung', plural: 'Handlampen-Ladungen' },
  { wh: 90, emoji: '📷', singular: 'Wärmebildkamera-Ladung', plural: 'Wärmebildkamera-Ladungen' },
  { wh: 400, emoji: '✂️', singular: 'Akku-Rettungsspreizer-Ladung', plural: 'Akku-Rettungsspreizer-Ladungen' },
  { wh: 2500, emoji: '🔌', singular: 'Stunde Stromerzeuger-Einsatz', plural: 'Stunden Stromerzeuger-Einsatz' },
  { wh: 15000, emoji: '🚒', singular: 'volle Löschfahrzeug-Bordbatterie', plural: 'volle Löschfahrzeug-Bordbatterien' },
  { wh: 90000, emoji: '🏠', singular: 'Tag Stromverbrauch eines Feuerwehrhauses', plural: 'Tage Stromverbrauch eines Feuerwehrhauses' },
]

/**
 * Picks the largest tier the total has reached at least once, so small
 * amounts get a relatable everyday-equipment comparison and large cumulative
 * totals graduate to something more fitting, rather than showing the same
 * small unit in an ever-growing count.
 */
export function energyEquivalent(wh: number): string {
  let tier = ENERGY_TIERS[0] as EnergyTier
  for (const candidate of ENERGY_TIERS) {
    if (wh >= candidate.wh) tier = candidate
  }
  const count = Math.round(wh / tier.wh)
  const label = count === 1 ? tier.singular : tier.plural
  return `${tier.emoji} ≈ ${count} ${label}`
}
