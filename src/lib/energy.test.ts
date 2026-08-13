import { describe, expect, it } from 'vitest'
import { energyWh, fmtEnergy, phoneCharges } from './energy'

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

describe('phoneCharges', () => {
  it('rounds to the nearest whole charge at 12 Wh each', () => {
    expect(phoneCharges(12)).toBe(1)
    expect(phoneCharges(600)).toBe(50)
    expect(phoneCharges(0)).toBe(0)
  })

  it('rounds rather than floors near the boundary', () => {
    expect(phoneCharges(17)).toBe(1) // 1.42 charges
    expect(phoneCharges(18)).toBe(2) // 1.5 charges, rounds up
  })
})
