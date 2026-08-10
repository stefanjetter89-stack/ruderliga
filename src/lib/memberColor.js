// Stable, deterministic color per member so avatars/leaderboard rows don't
// flicker between colors across renders or devices.
const PALETTE = ['#7fe3d7', '#e0a868', '#c7cdd1', '#e8b23d', '#3fcfc0', '#c9873f']

export function memberColor(memberId) {
  let hash = 0
  for (let i = 0; i < memberId.length; i++) {
    hash = (hash * 31 + memberId.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}
