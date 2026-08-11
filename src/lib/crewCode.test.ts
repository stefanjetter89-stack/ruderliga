import { describe, expect, it } from 'vitest'
import {
  formatCrewCode,
  generateCrewCode,
  hashCrewCode,
  isValidCrewCodeFormat,
  normalizeCrewCode,
} from './crewCode'

const AMBIGUOUS = ['0', '1', 'I', 'L', 'O', 'U']

describe('generateCrewCode', () => {
  it('produces the documented shape', () => {
    expect(generateCrewCode()).toMatch(/^[2-9A-Z]{5}-[2-9A-Z]{5}$/)
  })

  it('never emits characters that are easy to misread', () => {
    // 0/O, 1/I/L and U/V are the classic misreads when a code is copied by hand
    // or read aloud across the room.
    const sample = Array.from({ length: 200 }, () => generateCrewCode()).join('')
    for (const ch of AMBIGUOUS) {
      expect(sample).not.toContain(ch)
    }
  })

  it('draws from a large enough space that codes do not repeat in practice', () => {
    // ~49 bits: 2000 draws colliding would be an unmistakable signal that the
    // generator regressed to something like v1's 1350-code space.
    const codes = new Set(Array.from({ length: 2000 }, () => generateCrewCode()))
    expect(codes.size).toBe(2000)
  })

  it('distributes characters roughly evenly across the alphabet', () => {
    // Guards the rejection sampling: a naive `byte % 30` would over-represent
    // the first six characters by ~20%.
    const chars = Array.from({ length: 3000 }, () => generateCrewCode())
      .join('')
      .replace(/-/g, '')
    const counts = new Map<string, number>()
    for (const ch of chars) counts.set(ch, (counts.get(ch) ?? 0) + 1)

    expect(counts.size).toBe(30)
    const expected = chars.length / 30
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(expected * 0.75)
      expect(count).toBeLessThan(expected * 1.25)
    }
  })
})

describe('normalizeCrewCode', () => {
  it('is forgiving about case, dashes and spaces', () => {
    expect(normalizeCrewCode('4k7m9-p2xrt')).toBe('4K7M9P2XRT')
    expect(normalizeCrewCode('4K7M9P2XRT')).toBe('4K7M9P2XRT')
    expect(normalizeCrewCode(' 4K7M9 - P2XRT ')).toBe('4K7M9P2XRT')
  })

  it('drops characters outside the alphabet', () => {
    expect(normalizeCrewCode('4K7M9-P2XRT!!')).toBe('4K7M9P2XRT')
  })
})

describe('formatCrewCode', () => {
  it('round-trips a generated code through normalization', () => {
    const code = generateCrewCode()
    expect(formatCrewCode(normalizeCrewCode(code))).toBe(code)
  })
})

describe('isValidCrewCodeFormat', () => {
  it('accepts a full-length code however it was typed', () => {
    expect(isValidCrewCodeFormat('4K7M9-P2XRT')).toBe(true)
    expect(isValidCrewCodeFormat('4k7m9p2xrt')).toBe(true)
  })

  it('rejects anything that is not exactly ten alphabet characters', () => {
    expect(isValidCrewCodeFormat('4K7M9')).toBe(false)
    expect(isValidCrewCodeFormat('4K7M9-P2XRTX')).toBe(false)
    expect(isValidCrewCodeFormat('')).toBe(false)
    expect(isValidCrewCodeFormat('EICHE-42')).toBe(false) // the old v1 format
  })
})

describe('hashCrewCode', () => {
  it('returns lowercase hex SHA-256, matching the DB constraint', () => {
    return hashCrewCode('4K7M9-P2XRT').then((hash) => {
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })
  })

  it('is stable across equivalent spellings of the same code', async () => {
    const [a, b, c] = await Promise.all([
      hashCrewCode('4K7M9-P2XRT'),
      hashCrewCode('4k7m9p2xrt'),
      hashCrewCode('  4K7M9 - p2xrt  '),
    ])
    expect(a).toBe(b)
    expect(b).toBe(c)
  })

  it('separates different codes', async () => {
    const [a, b] = await Promise.all([hashCrewCode('4K7M9-P2XRT'), hashCrewCode('4K7M9-P2XRV')])
    expect(a).not.toBe(b)
  })
})
