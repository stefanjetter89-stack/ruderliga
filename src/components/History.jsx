import { paceOf } from '../lib/format'
import HistoryItem from './HistoryItem'

export default function History({ sessions, members, currentMemberId, onUpdate, onDelete }) {
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]))
  const bestByMember = {}
  for (const s of sessions) {
    const p = paceOf(s)
    if (!(s.member_id in bestByMember) || p < bestByMember[s.member_id]) {
      bestByMember[s.member_id] = p
    }
  }

  return (
    <>
      <div className="section-head">
        <h2>Verlauf</h2>
      </div>
      <div>
        {sessions.length === 0 && <div className="empty-hint">Noch keine Trainingseinheiten erfasst.</div>}
        {sessions.map((s) => (
          <HistoryItem
            key={s.id}
            session={s}
            member={memberById[s.member_id]}
            isPB={paceOf(s) === bestByMember[s.member_id]}
            canEdit={s.member_id === currentMemberId}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </>
  )
}
