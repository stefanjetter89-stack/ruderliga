import { useMemo } from 'react'
import HistoryItem from './HistoryItem'
import { paceOf } from '../lib/format'
import { personalBests } from '../lib/leaderboard'
import type { Member, Session, SessionEditInput } from '../lib/db.types'

interface HistoryProps {
  sessions: Session[]
  members: Member[]
  currentMemberId: string
  onUpdate: (sessionId: string, expectedUpdatedAt: string, input: SessionEditInput) => Promise<Session>
  onDelete: (sessionId: string) => Promise<void>
  onToast: (message: string) => void
}

export default function History({
  sessions,
  members,
  currentMemberId,
  onUpdate,
  onDelete,
  onToast,
}: HistoryProps) {
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const bests = useMemo(() => personalBests(sessions), [sessions])

  return (
    <>
      <div className="section-head">
        <h2>Verlauf</h2>
      </div>
      <div>
        {sessions.length === 0 && (
          <div className="empty-hint">Noch keine Trainingseinheiten erfasst.</div>
        )}
        {sessions.map((s) => (
          <HistoryItem
            key={s.id}
            session={s}
            member={memberById.get(s.member_id)}
            isPB={bests.get(s.member_id) === paceOf(s)}
            canEdit={s.member_id === currentMemberId}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onToast={onToast}
          />
        ))}
      </div>
    </>
  )
}
