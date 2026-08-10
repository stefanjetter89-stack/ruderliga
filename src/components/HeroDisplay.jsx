import { paceOf, fmtPace, fmtDate } from '../lib/format'

export default function HeroDisplay({ sessions, members }) {
  const best = sessions.reduce((best, s) => (!best || paceOf(s) < paceOf(best) ? s : best), null)
  const holder = best ? members.find((m) => m.id === best.member_id) : null

  return (
    <div className="hero">
      <div className="hero-inner">
        <div className="hero-label">
          <span className="dot" />
          BESTZEIT / 500M — CREW-REKORD
        </div>
        <div className="hero-time mono">
          {best ? fmtPace(paceOf(best)) : '–:––'}
          <span>min</span>
        </div>
        <div className="hero-meta">
          <div className="hero-holder">
            Gehalten von <b>{holder ? holder.display_name : '–'}</b>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="n mono">{best ? fmtDate(best.session_date) : '–'}</div>
              <div className="l">Datum</div>
            </div>
            <div className="hero-stat">
              <div className="n mono">{best ? (best.distance_m / 1000).toFixed(1) + 'km' : '–'}</div>
              <div className="l">Distanz</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
