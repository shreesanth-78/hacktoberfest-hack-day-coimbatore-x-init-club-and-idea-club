import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KINGDOMS } from '../data/kingdoms.js';
import { useGame } from '../hooks/useGameState.jsx';
import { USE_MOCK } from '../services/api.js';
import { Cloud, Mountain, Pine, SharedDefs, Tree } from '../components/art.jsx';
import KingdomEntrance from '../components/KingdomEntrance.jsx';
import PlayerCharacter from '../components/PlayerCharacter.jsx';

export default function LandingPage() {
  const game = useGame();
  const nav = useNavigate();
  const started = Object.values(game.progress).some((p) => p.completed > 0);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const begin = async (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean || busy) return;
    setBusy(true); setErr('');
    try { await game.startGame(clean); nav('/world'); } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  const newGame = async () => {
    if (window.confirm('Start a new game? Your current run stays on the leaderboard.')) await game.resetAll();
  };
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
        {USE_MOCK && <p className="preview-note" role="note"><b>Preview:</b> the guardians on this page follow simple scripted rules in your browser. The real game uses Gemma 4 through a backend and is described in the project README.</p>}
        <p className="responsible-note" role="note"><b>Notice:</b> Prompt Heist is an educational AI-safety simulator. Every system, character and secret in it is fictional. Only test real systems you own or have explicit permission to test.</p>
        {game.hasGame && game.playerName ? (
          <div className="landing-actions">
            <p className="welcome-back">Welcome back, <b>{game.playerName}</b>.</p>
            <Link className="stone-btn big" to="/world">{started ? 'Continue Journey ›' : 'Begin the Adventure ›'}</Link>
            <Link className="stone-btn" to="/leaderboard">🏆 Leaderboard</Link>
            <button type="button" className="stone-btn" onClick={newGame}>New game</button>
          </div>
        ) : (
          <form className="landing-actions name-form" onSubmit={begin}>
            <label htmlFor="player-name">Your name, Phantom</label>
            <input id="player-name" type="text" value={name} maxLength={30} autoComplete="off" placeholder="Cipher Phantom"
              onChange={(e) => setName(e.target.value)} aria-describedby="name-error" />
            {err && <p id="name-error" className="form-error" role="alert">{err}</p>}
            <div className="landing-buttons">
              <button type="submit" className="stone-btn big" disabled={!name.trim() || busy}>{busy ? 'Entering…' : 'Begin the Adventure ›'}</button>
              <Link className="stone-btn" to="/leaderboard">🏆 Leaderboard</Link>
            </div>
          </form>
        )}
        <ul className="landing-facts"><li>5 kingdoms</li><li>30 guarded levels</li><li>Checkpoint at Level 3</li><li>Adaptive boss at Level 6</li></ul>
        <small>{USE_MOCK ? 'Fictional game · mock guardians (no backend connected)' : 'Fictional game · guardians powered by Gemma, running locally through Ollama'}</small>
      </div>
    </main>
  );
}
