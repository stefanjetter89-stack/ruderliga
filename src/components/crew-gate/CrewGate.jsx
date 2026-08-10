import { useState } from 'react'
import CreateCrewStep from './CreateCrewStep'
import JoinCrewStep from './JoinCrewStep'
import NameStep from './NameStep'
import { isSupabaseConfigured } from '../../lib/supabase'

export default function CrewGate({ onComplete }) {
  const [mode, setMode] = useState('choose') // choose | create | join
  const [resolvedCrew, setResolvedCrew] = useState(null) // {crewId, crewName}

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

  if (resolvedCrew) {
    return (
      <div className="wrap">
        <div className="gate-card">
          <NameStep
            crewId={resolvedCrew.crewId}
            crewName={resolvedCrew.crewName}
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
          <div className="brand-icon">🚣</div>
          <h1>Ruderliga</h1>
        </div>
        {mode === 'choose' && (
          <>
            <p className="gate-hint">Trainings-Rangliste für eure Crew am Rudergerät.</p>
            <button className="submit-btn" onClick={() => setMode('create')}>
              Neue Crew erstellen
            </button>
            <button className="add-btn" onClick={() => setMode('join')}>
              Crew beitreten
            </button>
          </>
        )}
        {mode === 'create' && (
          <CreateCrewStep onCreated={setResolvedCrew} onBack={() => setMode('choose')} />
        )}
        {mode === 'join' && (
          <JoinCrewStep onJoined={setResolvedCrew} onBack={() => setMode('choose')} />
        )}
      </div>
    </div>
  )
}
