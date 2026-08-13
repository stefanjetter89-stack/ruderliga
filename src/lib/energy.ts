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
// after a decade — the top tier sits inside that range on purpose, reachable
// a few times over rather than "done" after year one or still out of reach
// after ten.
//
// 11 tiers, each ~2.5x the last (10 Wh -> 100,000 Wh is a 10,000x span; 2.5^10
// covers almost exactly that). That spacing is deliberate: big enough that
// each tier feels like a genuine step up, small enough that reaching the next
// one doesn't take forever — a long stretch stuck restating the same unit in
// a slowly climbing count is the thing this whole system is meant to avoid.
const ENERGY_TIERS: readonly EnergyTier[] = [
  { wh: 10, emoji: '📻', singular: 'Handfunkgerät-Ladung', plural: 'Handfunkgerät-Ladungen' },
  { wh: 25, emoji: '🔦', singular: 'Handlampen-Ladung', plural: 'Handlampen-Ladungen' },
  { wh: 60, emoji: '📷', singular: 'Wärmebildkamera-Ladung', plural: 'Wärmebildkamera-Ladungen' },
  { wh: 150, emoji: '✂️', singular: 'Akku-Rettungsspreizer-Ladung', plural: 'Akku-Rettungsspreizer-Ladungen' },
  { wh: 400, emoji: '🪚', singular: 'Akku-Trennschleifer-Ladung', plural: 'Akku-Trennschleifer-Ladungen' },
  { wh: 1000, emoji: '💡', singular: 'Nachtschicht Lichtmast-Betrieb', plural: 'Nachtschichten Lichtmast-Betrieb' },
  { wh: 2500, emoji: '🔌', singular: 'Stunde Stromerzeuger-Einsatz', plural: 'Stunden Stromerzeuger-Einsatz' },
  { wh: 6300, emoji: '🚤', singular: 'Rettungsboot-Akku-Ladung', plural: 'Rettungsboot-Akku-Ladungen' },
  { wh: 15000, emoji: '🚒', singular: 'volle Löschfahrzeug-Bordbatterie', plural: 'volle Löschfahrzeug-Bordbatterien' },
  { wh: 40000, emoji: '🚑', singular: 'Tag Stromverbrauch einer Rettungswache', plural: 'Tage Stromverbrauch einer Rettungswache' },
  { wh: 100000, emoji: '🏠', singular: 'Tag Stromverbrauch eines Feuerwehrhauses', plural: 'Tage Stromverbrauch eines Feuerwehrhauses' },
]

/** Index of the largest tier `wh` has reached, or 0 if it hasn't reached the first one. */
function currentTierIndex(wh: number): number {
  let index = 0
  for (let i = 0; i < ENERGY_TIERS.length; i++) {
    if (wh >= (ENERGY_TIERS[i] as EnergyTier).wh) index = i
  }
  return index
}

/**
 * Picks the largest tier the total has reached at least once, so small
 * amounts get a relatable everyday-equipment comparison and large cumulative
 * totals graduate to something more fitting, rather than showing the same
 * small unit in an ever-growing count.
 */
export function energyEquivalent(wh: number): string {
  const tier = ENERGY_TIERS[currentTierIndex(wh)] as EnergyTier
  const count = Math.round(wh / tier.wh)
  const label = count === 1 ? tier.singular : tier.plural
  return `${tier.emoji} ≈ ${count} ${label}`
}

export interface EnergyProgress {
  /** 0-1 fraction of the way from the current tier's threshold to the next one's. 1 once the top tier is reached. */
  fraction: number
  /** Emoji + name of the tier being progressed toward; null once there is no tier left above the current total. */
  nextLabel: string | null
  /** Wh still needed to reach nextLabel's tier; 0 once maxed. */
  whRemaining: number
}

/**
 * Progress toward the *next* tier — distinct from energyEquivalent, which
 * only reports the current one. Scoped to the span between the current
 * tier's threshold and the next (like a game's XP bar resetting at each
 * level), not the total's raw fraction of the next threshold, which would
 * look nearly empty right after every level-up.
 */
export function energyProgress(wh: number): EnergyProgress {
  const clamped = Math.max(0, wh)
  // -1 means "hasn't reached even the first tier yet" — progress is then
  // measured from 0 toward that first tier instead of from a tier below it.
  let index = -1
  for (let i = 0; i < ENERGY_TIERS.length; i++) {
    if (clamped >= (ENERGY_TIERS[i] as EnergyTier).wh) index = i
  }
  const next = ENERGY_TIERS[index + 1]
  if (!next) {
    return { fraction: 1, nextLabel: null, whRemaining: 0 }
  }
  const rangeStart = index >= 0 ? (ENERGY_TIERS[index] as EnergyTier).wh : 0
  const fraction = Math.min(1, Math.max(0, (clamped - rangeStart) / (next.wh - rangeStart)))
  return {
    fraction,
    nextLabel: `${next.emoji} ${next.singular}`,
    whRemaining: Math.max(0, next.wh - clamped),
  }
}
