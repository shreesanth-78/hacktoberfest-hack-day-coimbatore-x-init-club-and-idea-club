import { LEVELS } from '../data/levels.js';

// Accessible list view of the six-level ladder (mirrors the map markers).
export default function LevelProgression({ kingdom, statusOf, selected, onSelect }) {
  return (
    <ol className="level-list">
      {LEVELS.map((L) => {
        const st = statusOf(L.n);
        return (
          <li key={L.n}>
            <button className={`level-row ${st} ${selected === L.n ? 'on' : ''}`} onClick={() => onSelect(L.n)} aria-disabled={st === 'locked'}>
              <span className={`lv-num ${L.boss ? 'boss' : ''}`}>{L.n}</span>
              <span className="lv-name"><b>{kingdom.places[L.n - 1]}</b><small>{L.name} · {L.difficulty}</small></span>
              <span className="lv-state" aria-label={st}>{st === 'completed' ? '🏅' : st === 'locked' ? '🔒' : '⚔️'}</span>
              {L.checkpoint && <span className="lv-tag">Checkpoint</span>}
              {L.boss && <span className="lv-tag boss">Boss</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
