import type { CrewIdentity } from './db.types'

// Persists which crew + member this device belongs to, so the entry form never
// needs a "who is this" field — identity is set once at crew-join time and only
// changed explicitly via settings.
//
// The plaintext crew code is stored alongside deliberately: it is this device's
// credential (like a saved password), and keeping it is what lets settings show
// the code again later. Without that, a code shown once at creation and never
// again would leave the crew permanently unreachable if nobody wrote it down.

const KEY = 'ruderliga.identity'

function isCrewIdentity(value: unknown): value is CrewIdentity {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.crewId === 'string' &&
    typeof v.crewCode === 'string' &&
    typeof v.codeHash === 'string' &&
    typeof v.memberId === 'string' &&
    typeof v.displayName === 'string' &&
    (typeof v.crewName === 'string' || v.crewName === null)
  )
}

export function loadIdentity(): CrewIdentity | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    // Rejects v1 records too, which had no crewCode/codeHash and would send
    // `undefined` as the credential on every call.
    return isCrewIdentity(parsed) ? parsed : null
  } catch {
    // Private-mode localStorage or corrupted JSON: treat as "not signed in".
    return null
  }
}

export function saveIdentity(identity: CrewIdentity): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(identity))
  } catch {
    // Storage unavailable (Safari private mode): the session still works, it
    // just will not survive a reload. Not worth interrupting the user for.
  }
}

export function clearIdentity(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to do — see saveIdentity.
  }
}
