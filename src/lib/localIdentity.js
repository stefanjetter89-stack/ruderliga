// Persists which crew + member this device belongs to, so the entry form never
// needs a "who is this" field — identity is set once at crew-join time and only
// changed explicitly via settings (see SettingsPanel).
const KEY = 'ruderliga.identity'

export function loadIdentity() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.crewId || !parsed.memberId || !parsed.displayName) return null
    return parsed
  } catch {
    return null
  }
}

export function saveIdentity(identity) {
  localStorage.setItem(KEY, JSON.stringify(identity))
}

export function clearIdentity() {
  localStorage.removeItem(KEY)
}
