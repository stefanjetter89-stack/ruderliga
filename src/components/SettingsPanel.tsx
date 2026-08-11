import { useState } from 'react'
import Modal from './Modal'
import NameStep from './crew-gate/NameStep'
import { useTwoStepConfirm } from '../hooks/useTwoStepConfirm'
import type { CrewIdentity, Member } from '../lib/db.types'

interface SettingsPanelProps {
  identity: CrewIdentity
  members: Member[]
  onSwitchMember: (member: Pick<Member, 'id' | 'display_name'>) => void
  onLeaveCrew: () => void
  onClose: () => void
}

export default function SettingsPanel({
  identity,
  members,
  onSwitchMember,
  onLeaveCrew,
  onClose,
}: SettingsPanelProps) {
  const [mode, setMode] = useState<'menu' | 'addNew'>('menu')
  const [copied, setCopied] = useState(false)
  const { armed, handleClick: handleLeaveClick } = useTwoStepConfirm(onLeaveCrew)

  const others = members.filter((m) => m.id !== identity.memberId)

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(identity.crewCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked (insecure context or denied permission) — the code is
      // displayed in full right next to the button, so it stays copyable by hand.
    }
  }

  return (
    <Modal labelledBy="settings-heading" onClose={onClose}>
      {mode === 'menu' && (
        <>
          <h3 id="settings-heading">Einstellungen</h3>
          <p className="gate-hint">
            Angemeldet als <b>{identity.displayName}</b>
          </p>

          <div className="settings-section">
            <div className="settings-label">Crew-Code</div>
            <div className="crew-code-display crew-code-inline mono">{identity.crewCode}</div>
            <button type="button" className="link-btn" onClick={() => void copyCode()}>
              {copied ? 'Kopiert ✓' : 'Code kopieren'}
            </button>
            <p className="settings-note">
              Mit diesem Code tritt ein weiteres Gerät der Crew bei. Bewahre ihn auf — er lässt
              sich nicht wiederherstellen, wenn ihn kein Gerät mehr gespeichert hat.
            </p>
          </div>

          {others.length > 0 && (
            <div className="settings-section">
              <div className="settings-label">Als anderes Mitglied anmelden</div>
              {others.map((m) => (
                <button
                  key={m.id}
                  type="button"
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

          <div className="settings-section">
            <button
              type="button"
              className="link-btn settings-row"
              onClick={() => setMode('addNew')}
            >
              + Neues Mitglied hinzufügen
            </button>

            <button
              type="button"
              className={`link-btn danger settings-row ${armed ? 'armed' : ''}`}
              onClick={handleLeaveClick}
            >
              {armed ? 'Wirklich verlassen? Notiere vorher den Code!' : 'Crew verlassen'}
            </button>
          </div>

          <button type="button" className="submit-btn submit-btn-sm" onClick={onClose}>
            Schließen
          </button>
        </>
      )}

      {mode === 'addNew' && (
        <NameStep
          crewId={identity.crewId}
          crewName={identity.crewName}
          crewCode={identity.crewCode}
          codeHash={identity.codeHash}
          onComplete={(next) => {
            onSwitchMember({ id: next.memberId, display_name: next.displayName })
            onClose()
          }}
        />
      )}
    </Modal>
  )
}
