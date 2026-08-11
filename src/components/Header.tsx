import { memberColor } from '../lib/memberColor'
import type { Member } from '../lib/db.types'

interface HeaderProps {
  crewName: string | null
  members: Member[]
  currentName: string
  onOpenSettings: () => void
}

export default function Header({ crewName, members, currentName, onOpenSettings }: HeaderProps) {
  return (
    <header>
      <div className="brand">
        <div className="brand-icon" aria-hidden="true">🚣</div>
        <div>
          <h1>Ruderliga</h1>
          <div className="ver">v{__APP_VERSION__}</div>
        </div>
      </div>
      <div className="header-right">
        <div className="crew-badge">
          Crew <b>{crewName || 'Ohne Namen'}</b>
          <div className="avatars">
            {members.map((m) => (
              <div
                key={m.id}
                className="avatar"
                style={{ background: memberColor(m.id) }}
                title={m.display_name}
              >
                {m.display_name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
        <div className="identity-badge">
          Angemeldet als <b>{currentName}</b> ·{' '}
          <button type="button" className="switch-link" onClick={onOpenSettings}>
            Einstellungen
          </button>
        </div>
      </div>
    </header>
  )
}
