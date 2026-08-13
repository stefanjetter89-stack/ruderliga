import { describe, expect, it } from 'vitest'
import { energyEquivalent, energyWh, fmtEnergy } from './energy'

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
    expect(energyEquivalent(15)).toBe('🔦 ≈ 1 Handlampen-Ladung')
    expect(energyEquivalent(45)).toBe('🔦 ≈ 3 Handlampen-Ladungen')
  })

  it('escalates to the largest tier the total has reached, not the smallest', () => {
    // 200 Wh has technically "earned" ~13 Handlampen-Ladungen, but it has
    // also cleared the 90 Wh Wärmebildkamera tier — the whole point is that
    // it shows the bigger, more fitting comparison instead.
    expect(energyEquivalent(200)).toBe('📷 ≈ 2 Wärmebildkamera-Ladungen')
    expect(energyEquivalent(90)).toBe('📷 ≈ 1 Wärmebildkamera-Ladung')
  })

  it('never jumps to a tier the total has not actually reached', () => {
    // 89 Wh is one short of the Wärmebildkamera tier (90), so it must still
    // report Handlampen-Ladungen, not round up to the next tier.
    expect(energyEquivalent(89)).toBe('🔦 ≈ 6 Handlampen-Ladungen')
  })

  it('reaches every tier at a realistic cumulative total', () => {
    expect(energyEquivalent(400)).toBe('✂️ ≈ 1 Akku-Rettungsspreizer-Ladung')
    expect(energyEquivalent(2500)).toBe('🔌 ≈ 1 Stunde Stromerzeuger-Einsatz')
    expect(energyEquivalent(15000)).toBe('🚒 ≈ 1 volle Löschfahrzeug-Bordbatterie')
    expect(energyEquivalent(90000)).toBe('🏠 ≈ 1 Tag Stromverbrauch eines Feuerwehrhauses')
  })

  it('stays on the top tier for very large totals rather than throwing', () => {
    expect(energyEquivalent(250000)).toBe('🏠 ≈ 3 Tage Stromverbrauch eines Feuerwehrhauses')
  })

  it('rounds rather than floors near a tier boundary', () => {
    expect(energyEquivalent(21)).toBe('🔦 ≈ 1 Handlampen-Ladung') // 1.4, rounds down
    expect(energyEquivalent(23)).toBe('🔦 ≈ 2 Handlampen-Ladungen') // 1.53, rounds up
  })
})
