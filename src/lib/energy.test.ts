import { describe, expect, it } from 'vitest'
import { energyEquivalent, energyProgress, energyWh, fmtEnergy } from './energy'

describe('energyWh', () => {
  it('computes power × time in hours', () => {
    // 150 W for 20 min (1200 s = 1/3 h) = 50 Wh
    expect(energyWh({ avg_watts: 150, duration_seconds: 1200 })).toBeCloseTo(50, 5)
  })

  it('returns null when no power was recorded, not 0', () => {
    // 0 Wh would silently count as "rowed nothing", which is wrong — it
    // means the field was left blank, not that no energy was produced.
    expect(energyWh({ avg_watts: null, duration_seconds: 1200 })).toBeNull()
  })

  it('is 0 only when the recorded power itself is 0', () => {
    expect(energyWh({ avg_watts: 0, duration_seconds: 1200 })).toBe(0)
  })
})

describe('fmtEnergy', () => {
  it('shows whole watt-hours below 1000', () => {
    expect(fmtEnergy(50)).toBe('50 Wh')
    expect(fmtEnergy(999)).toBe('999 Wh')
    expect(fmtEnergy(50.4)).toBe('50 Wh')
    expect(fmtEnergy(50.6)).toBe('51 Wh')
  })

  it('switches to kWh with one decimal at 1000 and above', () => {
    expect(fmtEnergy(1000)).toBe('1.0 kWh')
    expect(fmtEnergy(1234)).toBe('1.2 kWh')
    expect(fmtEnergy(15000)).toBe('15.0 kWh')
  })
})

describe('energyEquivalent', () => {
  it('uses the smallest tier for small totals', () => {
    expect(energyEquivalent(10)).toBe('📻 ≈ 1 Handfunkgerät-Ladung')
    expect(energyEquivalent(20)).toBe('📻 ≈ 2 Handfunkgerät-Ladungen')
  })

  it('escalates to the largest tier the total has reached, not the smallest', () => {
    // 120 Wh has technically "earned" 12 Handfunkgerät-Ladungen, but it has
    // also cleared the 60 Wh Wärmebildkamera tier — the whole point is that
    // it shows the bigger, more fitting comparison instead.
    expect(energyEquivalent(120)).toBe('📷 ≈ 2 Wärmebildkamera-Ladungen')
    expect(energyEquivalent(60)).toBe('📷 ≈ 1 Wärmebildkamera-Ladung')
  })

  it('never jumps to a tier the total has not actually reached', () => {
    // 59 Wh is one short of the Wärmebildkamera tier (60), so it must still
    // report Handlampen-Ladungen, not round up to the next tier.
    expect(energyEquivalent(59)).toBe('🔦 ≈ 2 Handlampen-Ladungen')
  })

  it('reaches every tier at a realistic cumulative total', () => {
    expect(energyEquivalent(150)).toBe('✂️ ≈ 1 Akku-Rettungsspreizer-Ladung')
    expect(energyEquivalent(400)).toBe('🪚 ≈ 1 Akku-Trennschleifer-Ladung')
    expect(energyEquivalent(1000)).toBe('💡 ≈ 1 Nachtschicht Lichtmast-Betrieb')
    expect(energyEquivalent(2500)).toBe('🔌 ≈ 1 Stunde Stromerzeuger-Einsatz')
    expect(energyEquivalent(6300)).toBe('🚤 ≈ 1 Rettungsboot-Akku-Ladung')
    expect(energyEquivalent(15000)).toBe('🚒 ≈ 1 volle Löschfahrzeug-Bordbatterie')
    expect(energyEquivalent(40000)).toBe('🚑 ≈ 1 Tag Stromverbrauch einer Rettungswache')
    expect(energyEquivalent(100000)).toBe('🏠 ≈ 1 Tag Stromverbrauch eines Feuerwehrhauses')
  })

  it('stays on the top tier for very large totals rather than throwing', () => {
    expect(energyEquivalent(280000)).toBe('🏠 ≈ 3 Tage Stromverbrauch eines Feuerwehrhauses')
  })

  it('rounds rather than floors near a tier boundary', () => {
    expect(energyEquivalent(14)).toBe('📻 ≈ 1 Handfunkgerät-Ladung') // 1.4, rounds down
    expect(energyEquivalent(15)).toBe('📻 ≈ 2 Handfunkgerät-Ladungen') // 1.5, rounds up
  })
})

describe('energyProgress', () => {
  it('measures progress from 0 toward the first tier when nothing was earned yet', () => {
    const p = energyProgress(0)
    expect(p.fraction).toBe(0)
    expect(p.nextLabel).toBe('📻 Handfunkgerät-Ladung')
    expect(p.whRemaining).toBe(10)

    const halfway = energyProgress(5)
    expect(halfway.fraction).toBeCloseTo(0.5, 5)
  })

  it('scopes progress to the span between the current and next tier, not the raw total', () => {
    // 90 Wh is 60 Wh into the 60->150 Wh span toward Akku-Rettungsspreizer,
    // i.e. 30/90 of the way — not 90/150, which would ignore that the
    // Wärmebildkamera tier was already banked.
    const p = energyProgress(90)
    expect(p.nextLabel).toBe('✂️ Akku-Rettungsspreizer-Ladung')
    expect(p.fraction).toBeCloseTo(30 / 90, 5)
    expect(p.whRemaining).toBe(60)
  })

  it('resets to 0% right after crossing a tier threshold', () => {
    const p = energyProgress(150) // exactly the Akku-Rettungsspreizer threshold
    expect(p.nextLabel).toBe('🪚 Akku-Trennschleifer-Ladung')
    expect(p.fraction).toBe(0)
  })

  it('is maxed with no next tier once the total clears the top tier', () => {
    const atTop = energyProgress(100000)
    expect(atTop.fraction).toBe(1)
    expect(atTop.nextLabel).toBeNull()
    expect(atTop.whRemaining).toBe(0)

    const wayPast = energyProgress(500000)
    expect(wayPast.fraction).toBe(1)
    expect(wayPast.nextLabel).toBeNull()
  })
})
