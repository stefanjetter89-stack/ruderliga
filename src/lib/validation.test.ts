import { describe, expect, it } from 'vitest'
import { crewNameSchema, displayNameSchema, sessionSchema } from './validation'
import { todayIso } from './format'

function validSession(overrides: Record<string, unknown> = {}) {
  return {
    session_date: todayIso(),
    duration_seconds: 1200,
    distance_m: 4500,
    total_strokes: 820,
    avg_spm: 24,
    pace_per_500m_seconds: 133.33,
    resistance_level: 8,
    ...overrides,
  }
}

describe('sessionSchema', () => {
  it('accepts a realistic entry', () => {
    expect(sessionSchema.safeParse(validSession()).success).toBe(true)
  })

  it('accepts a minimal entry with the optional fields left blank', () => {
    const result = sessionSchema.safeParse(
      validSession({
        total_strokes: null,
        avg_spm: null,
        pace_per_500m_seconds: null,
        resistance_level: null,
      }),
    )
    expect(result.success).toBe(true)
  })

  it('rejects a zero or negative distance', () => {
    // distance 0 makes pace Infinity, which would sort to rank 1 on the board.
    expect(sessionSchema.safeParse(validSession({ distance_m: 0 })).success).toBe(false)
    expect(sessionSchema.safeParse(validSession({ distance_m: -100 })).success).toBe(false)
  })

  it('rejects a non-integer distance, which the int column would refuse anyway', () => {
    expect(sessionSchema.safeParse(validSession({ distance_m: 4500.7 })).success).toBe(false)
  })

  it('rejects a zero duration', () => {
    expect(sessionSchema.safeParse(validSession({ duration_seconds: 0 })).success).toBe(false)
  })

  it('rejects implausible magnitudes', () => {
    expect(sessionSchema.safeParse(validSession({ duration_seconds: 90000 })).success).toBe(false)
    expect(sessionSchema.safeParse(validSession({ distance_m: 500000 })).success).toBe(false)
    expect(sessionSchema.safeParse(validSession({ avg_spm: 500 })).success).toBe(false)
    expect(sessionSchema.safeParse(validSession({ total_strokes: 999999 })).success).toBe(false)
  })

  it('rejects NaN, which is what a blank required field parses to', () => {
    expect(sessionSchema.safeParse(validSession({ duration_seconds: Number.NaN })).success).toBe(false)
    expect(sessionSchema.safeParse(validSession({ distance_m: Number.NaN })).success).toBe(false)
  })

  it('rejects a resistance level outside 1–15', () => {
    expect(sessionSchema.safeParse(validSession({ resistance_level: 0 })).success).toBe(false)
    expect(sessionSchema.safeParse(validSession({ resistance_level: 16 })).success).toBe(false)
    expect(sessionSchema.safeParse(validSession({ resistance_level: 15 })).success).toBe(true)
  })

  it('rejects dates far in the future or before the sport existed on this device', () => {
    expect(sessionSchema.safeParse(validSession({ session_date: '3000-01-01' })).success).toBe(false)
    expect(sessionSchema.safeParse(validSession({ session_date: '1990-01-01' })).success).toBe(false)
  })

  it('rejects a malformed date string', () => {
    expect(sessionSchema.safeParse(validSession({ session_date: '10.08.2026' })).success).toBe(false)
    expect(sessionSchema.safeParse(validSession({ session_date: '' })).success).toBe(false)
  })

  it('reports a German message for the first problem', () => {
    const result = sessionSchema.safeParse(validSession({ distance_m: 0 }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/größer als null/)
    }
  })
})

describe('displayNameSchema', () => {
  it('trims and accepts a normal name', () => {
    const result = displayNameSchema.safeParse('  Stefan  ')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('Stefan')
  })

  it('rejects blank and over-long names', () => {
    expect(displayNameSchema.safeParse('').success).toBe(false)
    expect(displayNameSchema.safeParse('   ').success).toBe(false)
    expect(displayNameSchema.safeParse('x'.repeat(41)).success).toBe(false)
    expect(displayNameSchema.safeParse('x'.repeat(40)).success).toBe(true)
  })
})

describe('crewNameSchema', () => {
  it('allows an empty name but caps the length', () => {
    expect(crewNameSchema.safeParse('').success).toBe(true)
    expect(crewNameSchema.safeParse('x'.repeat(61)).success).toBe(false)
  })
})
