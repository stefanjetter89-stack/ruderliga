// Crew-Code hashing & generation — same pattern as the "Kosmos" group-code system
// in Abendbrett, renamed for this project. The code itself is never sent to or
// stored in Supabase, only its hash — so a database leak doesn't expose codes
// that people may reuse elsewhere. This is a fixed pepper, not a per-row secret
// salt: the client needs to derive the exact same hash from the code alone (with
// no prior knowledge of a row-specific salt) so it can look the row up by
// equality. It raises the bar above a raw unsalted hash, but — being shipped in
// client JS — it is not a true secret. Real protection comes from the code space
// being large and unguessable (see generateCrewCode), matching the Kosmos model.
const PEPPER = 'ruderliga-crew-code-v1'

export async function hashCrewCode(code) {
  const normalized = code.trim().toUpperCase()
  const data = new TextEncoder().encode(normalized + PEPPER)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const WORDS = [
  'EICHE', 'WASSER', 'RUDER', 'KIEL', 'ANKER', 'WELLE', 'STROEMUNG',
  'DUENUNG', 'HOLZ', 'BUCHT', 'FLUSS', 'GISCHT', 'SCHLAG', 'RIEMEN', 'DOCK',
]

export function generateCrewCode() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)]
  const number = Math.floor(10 + Math.random() * 90)
  return `${word}-${number}`
}

export function isValidCrewCodeFormat(code) {
  return /^[A-ZÄÖÜ]+-\d{2}$/.test(code.trim().toUpperCase())
}
