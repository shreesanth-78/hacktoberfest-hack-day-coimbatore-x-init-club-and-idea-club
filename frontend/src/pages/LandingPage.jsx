import { Link } from 'react-router-dom';
import { KINGDOMS } from '../data/kingdoms.js';
import { useGame } from '../hooks/useGameState.jsx';
import { Cloud, Mountain, Pine, SharedDefs, Tree } from '../components/art.jsx';
import KingdomEntrance from '../components/KingdomEntrance.jsx';
import PlayerCharacter from '../components/PlayerCharacter.jsx';

export default function LandingPage() {
  const game = useGame();
  const started = Object.values(game.progress).some((p) => p.completed > 0);
  const k = KINGDOMS[0];
  return (
    <main className="landing">
      <svg className="landing-art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <SharedDefs />
        <defs><linearGradient id="lsky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8fd3ff" /><stop offset=".7" stopColor="#fbe7b0" /></linearGradient></defs>
        <rect width="1600" height="900" fill="url(#lsky)" />
        <circle cx="1250" cy="170" r="90" fill="url(#glowGold)" /><circle cx="1250" cy="170" r="44" fill="#fff2b0" />
        {[[200, 600, 2.2], [520, 640, 2.6], [900, 620, 2.4], [1300, 640, 2.8], [1560, 610, 2]].map(([x, y, s], i) => <Mountain key={i} x={x} y={y} s={s} />)}
        <Cloud x={300} y={150} s={2} /><Cloud x={800} y={110} s={2.4} d={5} /><Cloud x={1400} y={280} s={1.8} d={9} />
        <path d="M0 640 Q400 600 800 640 T1600 630 V900 H0Z" fill="#6fb455" /><path d="M0 720 Q500 680 1000 730 T1600 720 V900 H0Z" fill="#7fc15f" />
        <path d="M1020 900 Q900 800 980 740 Q1060 690 1020 640" stroke="#b79a6a" strokeWidth="46" fill="none" strokeLinecap="round" /><path d="M1020 900 Q900 800 980 740 Q1060 690 1020 640" stroke="#d8c08c" strokeWidth="30" fill="none" strokeDasharray="2 12" strokeLinecap="round" />
        {[80, 170, 260, 1330, 1440, 1540].map((x, i) => (i % 2 ? <Pine key={x} x={x} y={760 + (i % 3) * 30} s={2.2} /> : <Tree key={x} x={x} y={780 + (i % 3) * 25} s={2.3} tone={i} />))}
        <KingdomEntrance kingdom={k} x={1020} y={720} scale={2.7} withGuardian level={1} active />
        <PlayerCharacter x={850} y={850} facing={1} scale={2.6} walking={false} />
      </svg>
      <div className="landing-card parchment">
        <p className="eyebrow">An Open-Source AI Hackathon Adventure</p>
        <h1>PROMPT HEIST</h1>
        <p className="lede">Travel through five ancient kingdoms. Outwit the guardians at six gates in each. Learn how clever words can break clumsy defences — and how real systems should guard their secrets.</p>
        <div className="landing-actions">
          <Link className="stone-btn big" to="/world">{started ? 'Continue Journey ›' : 'Begin the Adventure ›'}</Link>
        </div>
        <ul className="landing-facts"><li>5 kingdoms</li><li>30 guarded levels</li><li>Checkpoint at Level 3</li><li>Adaptive boss at Level 6</li></ul>
        <small>Fictional game · mock guardians · ready for a FastAPI + Gemma/Ollama backend</small>
      </div>
    </main>
  );
}
