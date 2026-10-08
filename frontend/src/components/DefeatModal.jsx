import Modal from './Modal.jsx';
export default function DefeatModal({ checkpointReached, restartLevel, frontier, onRetry, onMap }) {
  return (
    <Modal label="Defeat" tone="dark">
      <h2 className="banner-title defeat">DEFEATED</h2>
      <p>You have used all your strikes. The guards escort you from the gates.</p>
      <div className="defeat-cp parchment-inset">
        <b>Checkpoint:</b> {checkpointReached ? 'Established at Level 3 ✔' : 'Not yet reached'}
        <br />
        {frontier
          ? <>You will restart at <b>Level {restartLevel}</b>{checkpointReached ? ' (just past your checkpoint)' : ' (the beginning of the kingdom)'}.</>
          : <>This was a replay, so your progress is safe. You will try <b>Level {restartLevel}</b> again.</>}
      </div>
      <div className="modal-actions"><button className="stone-btn big" onClick={onRetry} autoFocus>Retry from Level {restartLevel} ›</button><button className="stone-btn" onClick={onMap}>Return to Map</button></div>
    </Modal>
  );
}
