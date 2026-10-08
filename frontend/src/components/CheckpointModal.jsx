import Modal, { Confetti } from './Modal.jsx';
import SecurityDebrief from './SecurityDebrief.jsx';

export default function CheckpointModal({ debrief, onContinue, onMap }) {
  return (
    <Modal label="Checkpoint established" tone="gold">
      <Confetti />
      <div className="checkpoint-seal">
        <svg viewBox="-60 -70 120 140" width="130" height="150" aria-hidden="true" className="seal-pop">
          <defs><radialGradient id="cpg"><stop offset="0" stopColor="#fff2b0" /><stop offset="1" stopColor="#e8c13f" /></radialGradient></defs>
          <circle r="62" fill="url(#glowGold)" className="pulse" />
          <path d="M0-58 L44-40 V-2 Q44 40 0 62 Q-44 40 -44-2 V-40Z" fill="url(#cpg)" stroke="#8a5a1a" strokeWidth="5" />
          <path d="M0-42 L30-30 V0 Q30 28 0 44 Q-30 28 -30 0 V-30Z" fill="#c9332f" stroke="#8a5a1a" strokeWidth="3" />
          <path d="M-14 0 l10 11 l20-24" fill="none" stroke="#fff3c4" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="banner-title">CHECKPOINT ESTABLISHED</h2>
      <div className="cp-levels">{[1, 2, 3].map((n) => <span key={n}>🏅 Level {n}</span>)}</div>
      <p className="saved">✔ Progress saved. If you fall in battle, you will return here.</p>
      <SecurityDebrief debrief={debrief} level={3} />
      <div className="modal-actions"><button className="stone-btn big" onClick={onContinue} autoFocus>Continue to Level 4 ›</button><button className="stone-btn" onClick={onMap}>Return to Kingdom</button></div>
    </Modal>
  );
}
