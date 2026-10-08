import Modal, { Confetti } from './Modal.jsx';
import SecurityDebrief from './SecurityDebrief.jsx';
import GuardianCharacter from './GuardianCharacter.jsx';
import { SharedDefs } from './art.jsx';

const Emblem = ({ kind, color }) => {
  const p = { fill: '#fff6dc' };
  return (
    <svg viewBox="-50 -50 100 100" width="120" height="120" className="seal-pop" aria-hidden="true">
      <circle r="46" fill="#e8c13f" stroke="#8a5a1a" strokeWidth="5" /><circle r="38" fill={color} stroke="#fff3c4" strokeWidth="2" strokeDasharray="3 3" />
      {kind === 'drop' && <path d="M0-24 Q22 0 14 14 Q0 28 -14 14 Q-22 0 0-24Z" {...p} />}
      {kind === 'leaf' && <path d="M-18 14 Q-22-18 18-22 Q22 14 -18 14Z M-18 14 L10-10" {...p} stroke={color} strokeWidth="2.5" />}
      {kind === 'anchor' && <g stroke="#fff6dc" strokeWidth="5" fill="none" strokeLinecap="round"><path d="M0-20V22M-12-8H12M-20 8Q-18 24 0 24Q18 24 20 8"/><circle cx="0" cy="-24" r="5" /></g>}
      {kind === 'scales' && <g stroke="#fff6dc" strokeWidth="4" fill="none" strokeLinecap="round"><path d="M0-24V22M-22-16H22M-22-16L-30 4H-14Z M22-16L14 4H30Z"/></g>}
      {kind === 'gear' && <g fill="#fff6dc">{Array.from({ length: 8 }).map((_, i) => <rect key={i} x="-4" y="-27" width="8" height="10" transform={`rotate(${i * 45})`} />)}<circle r="17" /><circle r="7" fill={color} /></g>}
    </svg>
  );
};

export default function VictoryModal({ kingdom, level, debrief, kingdomComplete, nextKingdom, onContinue, onMap }) {
  return (
    <Modal label={kingdomComplete ? 'Kingdom complete' : 'Victory'} tone={kingdomComplete ? 'purple' : ''}>
      <Confetti />
      {kingdomComplete ? (
        <div className="ceremony">
          <Emblem kind={kingdom.emblem} color={kingdom.colors.primary} />
          <h2 className="banner-title">KINGDOM CLAIMED!</h2>
          <p className="ceremony-sub">The seal of <b>{kingdom.name}</b> is yours.</p>
          <p>{nextKingdom ? <>The road to <b>{nextKingdom.name}</b> has opened.</> : 'All five kingdoms are sealed. You are the Master of the Heist!'}</p>
        </div>
      ) : (
        <>
          <h2 className="banner-title">VICTORY!</h2>
          <div className="victory-guard">
            <svg viewBox="-60 -150 120 170" width="96" height="130"><SharedDefs /><GuardianCharacter kind={kingdom.guardian.kind} level={level} mood="defeated" /></svg>
            <p>“Impressive, traveler. You may pass.” <i>— {kingdom.guardian.name}</i></p>
          </div>
        </>
      )}
      <SecurityDebrief debrief={debrief} level={level} />
      <div className="modal-actions">
        {kingdomComplete
          ? <button className="stone-btn big" onClick={onMap} autoFocus>Return to the World Map ›</button>
          : <button className="stone-btn big" onClick={onContinue} autoFocus>Continue to Level {level + 1} ›</button>}
        {!kingdomComplete && <button className="stone-btn" onClick={onMap}>Back to Kingdom</button>}
      </div>
    </Modal>
  );
}
