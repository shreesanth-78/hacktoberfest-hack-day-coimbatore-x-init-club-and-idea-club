// Ancient-scroll educational debrief shown after every cleared level.
export default function SecurityDebrief({ debrief, level }) {
  if (!debrief) return null;
  return (
    <section className="scroll-debrief" aria-label="Security debrief">
      <div className="scroll-rod" />
      <div className="scroll-body">
        <h3>📜 Security Debrief — Level {level}</h3>
        <dl>
          <dt>Strategy that worked</dt><dd>{debrief.strategy}</dd>
          <dt>Why the guard accepted it</dt><dd>{debrief.why}</dd>
          <dt>Vulnerability demonstrated</dt><dd>{debrief.vulnerability}</dd>
          <dt>Defensive lesson for real AI systems</dt><dd className="lesson">{debrief.lesson}</dd>
        </dl>
        <p className="fiction-note">This is a fictional game with made-up secrets. Only test real systems you own or have explicit permission to test.</p>
      </div>
      <div className="scroll-rod" />
    </section>
  );
}
