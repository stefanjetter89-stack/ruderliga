// Crew-Code generation and hashing — the app's only credential.
//
// The code is the entire security boundary: supabase/schema.sql closes the REST
// surface completely and resolves every request through the code's hash, so an
// attacker who guesses a code gets that crew and one who doesn't gets nothing.
// That makes the size of the code space the thing that matters.
//
// v1 generated one of 15 words plus a two-digit number: 1350 possible codes,
// ~10 bits, every hash precomputable in milliseconds. This version draws 10
// characters from a 30-character alphabet via the platform CSPRNG, giving
// 30^10 ≈ 5.9e14 codes (~49 bits) — infeasible to enumerate over the network
// and far past the point where a rainbow table is worth building.

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ' // no 0/1/I/L/O/U — unambiguous when read aloud or typed
const CODE_LENGTH = 10
const GROUP_SIZE = 5

// A fixed pepper, not a per-row salt: the client must derive the same hash from
// the code alone to look the crew up by equality, so it cannot be secret — it
// ships in the bundle. It costs an attacker nothing to extract; the entropy
// above is what actually protects the code. Kept because it makes a generic
// SHA-256 rainbow table useless, which is cheap insurance.
const PEPPER = 'ruderliga-crew-code-v1'

/**
 * Draws `count` alphabet indices from the CSPRNG without modulo bias.
 *
 * 256 is not a multiple of 30, so a plain `byte % 30` would favour the first
 * six letters. Bytes at or above the largest multiple of 30 below 256 (240) are
 * rejected and redrawn instead.
 */
function randomIndices(count: number): number[] {
  const limit = 256 - (256 % ALPHABET.length) // 240
  const out: number[] = []
  const buf = new Uint8Array(count * 2) // over-allocate; ~6% of draws are rejected

  while (out.length < count) {
    crypto.getRandomValues(buf)
    for (const byte of buf) {
      if (byte < limit) {
        out.push(byte % ALPHABET.length)
        if (out.length === count) break
      }
    }
  }
  return out
}

/** Generates a fresh crew code, e.g. `4K7M9-P2XRT`. */
export function generateCrewCode(): string {
  const chars = randomIndices(CODE_LENGTH).map((i) => ALPHABET[i] as string)
  const groups: string[] = []
  for (let i = 0; i < chars.length; i += GROUP_SIZE) {
    groups.push(chars.slice(i, i + GROUP_SIZE).join(''))
  }
  return groups.join('-')
}

/**
 * Reduces user input to its canonical form: uppercase, with everything outside
 * the alphabet dropped. This makes typing forgiving — dashes, spaces and case
 * are all optional — while keeping the hash input exact.
 */
export function normalizeCrewCode(input: string): string {
  const upper = input.toUpperCase()
  let out = ''
  for (const ch of upper) {
    if (ALPHABET.includes(ch)) out += ch
  }
  return out
}

/** Formats a normalized code back into display form (`4K7M9-P2XRT`). */
export function formatCrewCode(normalized: string): string {
  const groups: string[] = []
  for (let i = 0; i < normalized.length; i += GROUP_SIZE) {
    groups.push(normalized.slice(i, i + GROUP_SIZE))
  }
  return groups.join('-')
}

export function isValidCrewCodeFormat(input: string): boolean {
  return normalizeCrewCode(input).length === CODE_LENGTH
}

/** SHA-256 of the normalized code plus pepper, as lowercase hex. */
export async function hashCrewCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(normalizeCrewCode(code) + PEPPER)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
