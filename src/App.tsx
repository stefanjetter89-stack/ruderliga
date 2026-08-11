import { useState } from 'react'
import CrewGate from './components/crew-gate/CrewGate'
import Header from './components/Header'
import HeroDisplay from './components/HeroDisplay'
import Leaderboard from './components/Leaderboard'
import EntryForm from './components/EntryForm'
import History from './components/History'
import Toast from './components/Toast'
import ErrorBanner from './components/ErrorBanner'
import SettingsPanel from './components/SettingsPanel'
import { useCrewIdentity } from './hooks/useCrewIdentity'
import { useCrewMembers } from './hooks/useCrewMembers'
import { useSessions } from './hooks/useSessions'
import { useToast } from './hooks/useToast'
import type { CrewIdentity, Member } from './lib/db.types'
import './App.css'

export default function App() {
  const { identity, setIdentity, clear, switchMember } = useCrewIdentity()

  if (!identity) return <CrewGate onComplete={setIdentity} />

  return (
    <MainApp
      // Remounts the whole tree when the crew changes, so no hook keeps state
      // belonging to the previous crew.
      key={identity.crewId}
      identity={identity}
      onSwitchMember={switchMember}
      onLeaveCrew={clear}
    />
  )
}

interface MainAppProps {
  identity: CrewIdentity
  onSwitchMember: (member: Pick<Member, 'id' | 'display_name'>) => void
  onLeaveCrew: () => void
}

function MainApp({ identity, onSwitchMember, onLeaveCrew }: MainAppProps) {
  const members = useCrewMembers(identity.codeHash)
  const sessions = useSessions(identity.codeHash)
  const { toastMessage, showToast } = useToast()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const loadError = sessions.error ?? members.error

  return (
    <div className="wrap">
      <Header
        crewName={identity.crewName}
        members={members.members}
        currentName={identity.displayName}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {loadError && (
        <ErrorBanner
          message={loadError}
          onRetry={() => {
            void sessions.refresh()
            void members.refresh()
          }}
        />
      )}

      <HeroDisplay sessions={sessions.sessions} members={members.members} />

      <Leaderboard sessions={sessions.sessions} members={members.members} />

      <EntryForm
        memberId={identity.memberId}
        loadState={sessions.loadState}
        onAddSession={sessions.addSession}
        onToast={showToast}
      />

      <History
        sessions={sessions.sessions}
        members={members.members}
        currentMemberId={identity.memberId}
        onUpdate={sessions.updateSession}
        onDelete={async (id) => {
          try {
            await sessions.deleteSession(id)
            showToast('Eintrag gelöscht')
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Löschen fehlgeschlagen')
          }
        }}
      />

      <div className="note">Ruderliga · Domyos Woodrower Trainings-Rangliste</div>

      <Toast message={toastMessage} />

      {settingsOpen && (
        <SettingsPanel
          identity={identity}
          members={members.members}
          onSwitchMember={onSwitchMember}
          onLeaveCrew={onLeaveCrew}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
