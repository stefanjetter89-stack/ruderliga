import { memberColor } from '../lib/memberColor'
import { APP_VERSION } from '../version'

export default function Header({ crewName, members, currentName, onOpenSettings }) {
  return (
    <header>
      <div className="brand">
        <div className="brand-icon">🚣</div>
        <div>
          <h1>Ruderliga</h1>
          <div className="ver">{APP_VERSION}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
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
            wechseln
          </button>
        </div>
      </div>
    </header>
  )
}
