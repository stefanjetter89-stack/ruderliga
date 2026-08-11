import { describe, expect, it } from 'vitest'
import { ApiError, toApiError } from './api'

// toApiError is the single place that decides what a Postgres/PostgREST error
// becomes on screen, and specifically whether it's a *conflict* — the branch
// that replaces the K2 silent-overwrite behaviour with a rejected write plus
// an explanation. This is the part of that fix that's a pure function and
// can be tested without a live database; the RPC's atomic WHERE-clause check
// itself is exercised in supabase/schema.sql and verified against the real
// database (see the review notes), not here.

describe('toApiError', () => {
  it('flags RL001 (stale optimistic-concurrency check) as a conflict', () => {
    const err = toApiError({ code: 'RL001' }, 'fallback')
    expect(err.isConflict).toBe(true)
    expect(err.message).toMatch(/anderen Gerät geändert/)
  })

  it('does not flag ordinary errors as conflicts', () => {
    expect(toApiError({ code: '28000' }, 'fallback').isConflict).toBe(false)
    expect(toApiError({ code: '23505' }, 'fallback').isConflict).toBe(false)
    expect(toApiError({ code: 'P0002' }, 'fallback').isConflict).toBe(false)
    expect(toApiError({ code: '23514' }, 'fallback').isConflict).toBe(false)
    expect(toApiError(null, 'fallback').isConflict).toBe(false)
  })

  it('maps known Postgres error codes to distinct German messages', () => {
    expect(toApiError({ code: '28000' }, 'x').message).toMatch(/Crew-Code ist ungültig/)
    expect(toApiError({ code: '23505' }, 'x').message).toMatch(/bereits vergeben/)
    expect(toApiError({ code: 'P0002' }, 'x').message).toMatch(/existiert nicht mehr/)
    expect(toApiError({ code: '23514' }, 'x').message).toMatch(/außerhalb des zulässigen Bereichs/)
  })

  it('falls back to the provided message for unrecognized errors', () => {
    expect(toApiError({ code: '99999' }, 'Fallback-Text').message).toBe('Fallback-Text')
    expect(toApiError(null, 'Fallback-Text').message).toBe('Fallback-Text')
  })

  it('preserves the original error as cause without leaking it into the message', () => {
    const original = { code: 'RL001', message: 'update or delete on table "sessions" violates ...' }
    const err = toApiError(original, 'x')
    expect(err.cause).toBe(original)
    expect(err.message).not.toContain('violates')
  })
})

describe('ApiError', () => {
  it('defaults isConflict to false when constructed directly', () => {
    expect(new ApiError('irgendein Fehler').isConflict).toBe(false)
  })
})
