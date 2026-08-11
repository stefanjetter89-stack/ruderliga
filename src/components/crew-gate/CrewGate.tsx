import { useState } from 'react'
import CreateCrewStep from './CreateCrewStep'
import JoinCrewStep from './JoinCrewStep'
import NameStep from './NameStep'
import { isSupabaseConfigured } from '../../lib/supabase'
import type { CrewIdentity } from '../../lib/db.types'
import type { PendingCrew } from './types'

interface CrewGateProps {
  onComplete: (identity: CrewIdentity) => void
}

type Mode = 'choose' | 'create' | 'join'

export default function CrewGate({ onComplete }: CrewGateProps) {
  const [mode, setMode] = useState<Mode>('choose')
  const [pending, setPending] = useState<PendingCrew | null>(null)

  if (!isSupabaseConfigured) {
    return (
      <div className="wrap">
        <div className="gate-card">
          <h3>Supabase noch nicht konfiguriert</h3>
          <p className="gate-hint">
            Trage <code>VITE_SUPABASE_URL</code> und <code>VITE_SUPABASE_ANON_KEY</code> in{' '}
            <code>.env.local</code> ein und starte den Dev-Server neu.
          </p>
        </div>
      </div>
    )
  }

  if (pending) {
    return (
      <div className="wrap">
        <div className="gate-card">
          <NameStep
            crewId={pending.crew.id}
            crewName={pending.crew.name}
            crewCode={pending.code}
            codeHash={pending.codeHash}
            onComplete={onComplete}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="wrap">
      <div className="gate-card">
        <div className="gate-brand">
          <div className="brand-icon" aria-hidden="true">🚣</div>
          <h1>Ruderliga</h1>
        </div>
        {mode === 'choose' && (
          <>
            <p className="gate-hint">Trainings-Rangliste für eure Crew am Rudergerät.</p>
            <button type="button" className="submit-btn" onClick={() => setMode('create')}>
              Neue Crew erstellen
            </button>
            <button type="button" className="add-btn" onClick={() => setMode('join')}>
              Crew beitreten
            </button>
          </>
        )}
        {mode === 'create' && (
          <CreateCrewStep onCreated={setPending} onBack={() => setMode('choose')} />
        )}
        {mode === 'join' && <JoinCrewStep onJoined={setPending} onBack={() => setMode('choose')} />}
      </div>
    </div>
  )
}
