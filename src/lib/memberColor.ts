// Stable, deterministic colour per member so avatars and leaderboard rows keep
// the same colour across renders and devices.
//
// With more members than palette entries two people share a colour; the palette
// is ordered so the first collisions are between visually distant hues.
const PALETTE = [
  '#7fe3d7', // aqua
  '#e0a868', // oak
  '#c7cdd1', // silver
  '#e8b23d', // gold
  '#3fcfc0', // deep aqua
  '#c9873f', // deep oak
  '#9db8f0', // cool blue
  '#d99ac4', // rose
] as const

export function memberColor(memberId: string): string {
  // FNV-1a, so ids differing only in their last characters still spread out.
  let hash = 2166136261
  for (let i = 0; i < memberId.length; i++) {
    hash ^= memberId.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return PALETTE[Math.abs(hash) % PALETTE.length] as string
}
