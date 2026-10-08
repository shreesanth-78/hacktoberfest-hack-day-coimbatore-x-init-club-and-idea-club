import { GAME_CONFIG } from '../data/kingdoms.js';
import { LEVELS } from '../data/levels.js';

const Shield = ({ lost }) => (
  <svg viewBox="0 0 24 28" width="22" height="26" className={lost ? 'shield lost' : 'shield'} aria-hidden="true">
    <path d="M12 1 L22 5 V13 Q22 23 12 27 Q2 23 2 13 V5Z" fill={lost ? '#5b4a3a' : '#c9332f'} stroke={lost ? '#3a2e24' : '#e8c13f'} strokeWidth="2" />
    {lost ? <path d="M7 9 l10 10 M17 9 l-10 10" stroke="#2a1f17" strokeWidth="2.5" /> : <path d="M12 7 L16 10 L12 20 L8 10Z" fill="#e8c13f" />}
  </svg>
);

// Compact adventure-game HUD: parchment counters, shield strikes, seals.
export default function GameHUD({ kingdom, level, strikes = 0, maxStrikes = GAME_CONFIG.maxStrikes, attempts = 0, completed = 0, showEncounter = true }) {
  const L = LEVELS[level - 1];
  const cp = completed >= GAME_CONFIG.checkpointLevel;
  return (
    <div className="hud parchment" style={{ '--c': kingdom.colors.primary }}>
      <div className="hud-row"><span className="hud-label">Kingdom</span><b>{kingdom.name}</b></div>
      <div className="hud-row"><span className="hud-label">Level</span><b>{level} · {L.name}</b></div>
      <div className="hud-row"><span className="hud-label">Difficulty</span><b className={`diff d${level}`}>{L.difficulty}</b></div>
      {showEncounter && (
        <>
          <div className="hud-row"><span className="hud-label">Strikes</span><span className="shields" aria-label={`${strikes} of ${maxStrikes} strikes`}>{Array.from({ length: maxStrikes }).map((_, i) => <Shield key={i} lost={i < strikes} />)}</span></div>
          <div className="hud-row"><span className="hud-label">Attempts</span><b>{attempts}</b></div>
        </>
      )}
      <div className="hud-row"><span className="hud-label">Checkpoint</span><b className={cp ? 'ok' : ''}>{cp ? '✔ Established' : 'Not yet'}</b></div>
      <div className="hud-row"><span className="hud-label">Kingdom</span>
        <span className="pips">{Array.from({ length: 6 }).map((_, i) => <i key={i} className={`${i < completed ? 'on' : ''} ${i === 2 ? 'cp' : ''} ${i === 5 ? 'boss' : ''}`} />)}<small>{completed}/6</small></span>
      </div>
    </div>
  );
}
