import type { Crew } from '../../lib/db.types'

/** A crew resolved by the gate, before a member has been chosen for it. */
export interface PendingCrew {
  crew: Crew
  /** Plaintext code, carried through so it can be persisted with the identity. */
  code: string
  codeHash: string
}
