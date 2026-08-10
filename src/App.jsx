import { useState } from 'react'
import CrewGate from './components/crew-gate/CrewGate'
import Header from './components/Header'
import HeroDisplay from './components/HeroDisplay'
import Leaderboard from './components/Leaderboard'
import EntryForm from './components/EntryForm'
import History from './components/History'
import Toast from './components/Toast'
import SettingsPanel from './components/SettingsPanel'
import { useCrewIdentity } from './hooks/useCrewIdentity'
import { useCrewMembers } from './hooks/useCrewMembers'
import { useSessions } from './hooks/useSessions'
import { useToast } from './hooks/useToast'
import './App.css'

export default function App() {
  const { identity, setIdentity, clear, switchMember } = useCrewIdentity()

  if (!identity) {
    return <CrewGate onComplete={setIdentity} />
  }

  return (
    <MainApp identity={identity} onSwitchMember={switchMember} onLeaveCrew={clear} />
  )
}

function MainApp({ identity, onSwitchMember, onLeaveCrew }) {
  const { members } = useCrewMembers(identity.crewId)
  const { sessions, loadState, addSession, updateSession, deleteSession } = useSessions(identity.crewId)
  const { toastMessage, showToast } = useToast()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="wrap">
      <Header
        crewName={identity.crewName}
        members={members}
        currentName={identity.displayName}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <HeroDisplay sessions={sessions} members={members} />

      <Leaderboard sessions={sessions} members={members} />

      <EntryForm
        crewId={identity.crewId}
        memberId={identity.memberId}
        loadState={loadState}
        onAddSession={addSession}
        onToast={showToast}
      />

      <History
        sessions={sessions}
        members={members}
        currentMemberId={identity.memberId}
        onUpdate={updateSession}
        onDelete={async (id) => {
          try {
            await deleteSession(id)
            showToast('Eintrag gelöscht')
          } catch {
            showToast('Löschen fehlgeschlagen')
          }
        }}
      />

      <div className="note">Ruderliga · Domyos Woodrower Trainings-Rangliste</div>

      <Toast message={toastMessage} />

      {settingsOpen && (
        <SettingsPanel
          identity={identity}
          members={members}
          onSwitchMember={onSwitchMember}
          onLeaveCrew={onLeaveCrew}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
