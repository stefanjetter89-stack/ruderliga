import { useState } from 'react'
import NameStep from './crew-gate/NameStep'
import { useTwoStepConfirm } from '../hooks/useTwoStepConfirm'

export default function SettingsPanel({ identity, members, onSwitchMember, onLeaveCrew, onClose }) {
  const [mode, setMode] = useState('menu') // menu | addNew
  const { armed, handleClick: handleLeaveClick, cancel: cancelLeave } = useTwoStepConfirm(onLeaveCrew)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {mode === 'menu' && (
          <>
            <h3>Einstellungen</h3>
            <p className="gate-hint">
              Angemeldet als <b>{identity.displayName}</b>
            </p>

            {members.filter((m) => m.id !== identity.memberId).length > 0 && (
              <div className="settings-section">
                <div className="settings-label">Als anderes Mitglied anmelden</div>
                {members
                  .filter((m) => m.id !== identity.memberId)
                  .map((m) => (
                    <button
                      key={m.id}
                      className="link-btn settings-row"
                      onClick={() => {
                        onSwitchMember(m)
                        onClose()
                      }}
                    >
                      {m.display_name}
                    </button>
                  ))}
              </div>
            )}

            <button className="link-btn settings-row" onClick={() => setMode('addNew')}>
              + Neues Mitglied hinzufügen
            </button>

            <button
              className={`link-btn danger settings-row ${armed ? 'armed' : ''}`}
              onClick={handleLeaveClick}
              onMouseLeave={cancelLeave}
            >
              {armed ? 'Wirklich Crew verlassen?' : 'Crew verlassen'}
            </button>

            <button className="submit-btn submit-btn-sm" onClick={onClose}>
              Schließen
            </button>
          </>
        )}

        {mode === 'addNew' && (
          <NameStep
            crewId={identity.crewId}
            crewName={identity.crewName}
            onComplete={(next) => {
              onSwitchMember({ id: next.memberId, display_name: next.displayName })
              onClose()
            }}
          />
        )}
      </div>
    </div>
  )
}
