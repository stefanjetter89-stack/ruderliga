import { describe, expect, it } from 'vitest'
import {
  fmtPace,
  parseDuration,
  parseIsoDate,
  paceOf,
  todayIso,
  withinDays,
  withinPeriod,
} from './format'

describe('parseDuration', () => {
  it('parses mm:ss and m:ss', () => {
    expect(parseDuration('20:00')).toBe(1200)
    expect(parseDuration('5:30')).toBe(330)
    expect(parseDuration('120:00')).toBe(7200)
  })

  it('tolerates surrounding whitespace', () => {
    expect(parseDuration('  20:00 ')).toBe(1200)
  })

  it('rejects a seconds field of 60 or more instead of silently carrying it', () => {
    // "20:75" is a typo. Reading it as 21:15 would quietly corrupt a leaderboard entry.
    expect(parseDuration('20:75')).toBeNull()
    expect(parseDuration('20:60')).toBeNull()
  })

  it('rejects malformed input', () => {
    expect(parseDuration('')).toBeNull()
    expect(parseDuration('abc')).toBeNull()
    expect(parseDuration('20')).toBeNull()
    expect(parseDuration('20:0:0')).toBeNull()
    expect(parseDuration('-5:00')).toBeNull()
    expect(parseDuration('20:5')).toBeNull() // single-digit seconds are ambiguous
    expect(parseDuration(null)).toBeNull()
  })
})

describe('fmtPace', () => {
  it('formats seconds as m:ss', () => {
    expect(fmtPace(133)).toBe('2:13')
    expect(fmtPace(60)).toBe('1:00')
    expect(fmtPace(5)).toBe('0:05')
  })

  it('carries a rounded 60 into the next minute rather than printing :60', () => {
    expect(fmtPace(119.6)).toBe('2:00')
  })

  it('renders a placeholder for missing or non-finite values', () => {
    expect(fmtPace(null)).toBe('–:––')
    expect(fmtPace(Number.POSITIVE_INFINITY)).toBe('–:––')
    expect(fmtPace(Number.NaN)).toBe('–:––')
  })
})

describe('paceOf', () => {
  it('computes seconds per 500 m', () => {
    expect(paceOf({ duration_seconds: 1200, distance_m: 4500 })).toBeCloseTo(133.33, 2)
    expect(paceOf({ duration_seconds: 120, distance_m: 500 })).toBe(120)
  })
})

describe('parseIsoDate', () => {
  it('builds a local midnight, not a UTC one', () => {
    // new Date('2026-08-10') would be UTC midnight, i.e. the 9th at 22:00 in
    // German summer time — enough to shift every day-difference by one.
    const d = parseIsoDate('2026-08-10')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(7)
    expect(d.getDate()).toBe(10)
    expect(d.getHours()).toBe(0)
  })
})

describe('todayIso', () => {
  it('returns the local date in ISO form', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const now = new Date()
    expect(todayIso()).toBe(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate(),
      ).padStart(2, '0')}`,
    )
  })
})

describe('withinDays', () => {
  const now = new Date(2026, 7, 10) // Monday 10 Aug 2026

  it('includes dates inside the rolling window', () => {
    expect(withinDays('2026-08-10', 7, now)).toBe(true)
    expect(withinDays('2026-08-04', 7, now)).toBe(true)
  })

  it('excludes dates outside it', () => {
    expect(withinDays('2026-08-03', 7, now)).toBe(false)
    expect(withinDays('2026-07-01', 7, now)).toBe(false)
  })

  it('tolerates a device clock running one day ahead', () => {
    expect(withinDays('2026-08-11', 7, now)).toBe(true)
  })
})

describe('withinPeriod', () => {
  const wednesday = new Date(2026, 7, 12) // Wed 12 Aug 2026

  it('accepts everything for "all"', () => {
    expect(withinPeriod('2001-01-01', 'all', wednesday)).toBe(true)
  })

  it('scopes "month" to the current calendar month', () => {
    expect(withinPeriod('2026-08-01', 'month', wednesday)).toBe(true)
    expect(withinPeriod('2026-08-31', 'month', wednesday)).toBe(true)
    expect(withinPeriod('2026-07-31', 'month', wednesday)).toBe(false)
    expect(withinPeriod('2025-08-15', 'month', wednesday)).toBe(false)
  })

  it('scopes "week" to the calendar week starting Monday', () => {
    // The label says "Diese Woche", so Monday must be included and the Sunday
    // before it must not — a rolling 7-day window would wrongly include it.
    expect(withinPeriod('2026-08-10', 'week', wednesday)).toBe(true) // Monday
    expect(withinPeriod('2026-08-12', 'week', wednesday)).toBe(true)
    expect(withinPeriod('2026-08-09', 'week', wednesday)).toBe(false) // Sunday before
  })

  it('treats Sunday as belonging to the week that began on Monday', () => {
    const sunday = new Date(2026, 7, 16)
    expect(withinPeriod('2026-08-10', 'week', sunday)).toBe(true)
    expect(withinPeriod('2026-08-09', 'week', sunday)).toBe(false)
  })
})
