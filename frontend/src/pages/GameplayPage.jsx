import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { GAME_CONFIG, KINGDOMS, kingdomById } from '../data/kingdoms.js';
import { LEVELS } from '../data/levels.js';
import { useGame } from '../hooks/useGameState.jsx';
import { useEncounter } from '../hooks/useEncounter.js';
import { Banner, Column, SharedDefs, Sparkles, Torch } from '../components/art.jsx';
import GameHUD from '../components/GameHUD.jsx';
import GuardianCharacter from '../components/GuardianCharacter.jsx';
import GuardianDialogue from '../components/GuardianDialogue.jsx';
import CheckpointModal from '../components/CheckpointModal.jsx';
import VictoryModal from '../components/VictoryModal.jsx';
import DefeatModal from '../components/DefeatModal.jsx';

// Themed interior/exterior backdrops, one per level building.
function Backdrop({ type, k }) {
  const c = k.colors;
  const wall = type === 'outpost' ? null : <g><rect width="1000" height="600" fill={type === 'fortress' ? '#2a1d3d' : type === 'archive' ? '#7a5a3a' : '#8c8576'} /><rect width="1000" height="600" fill="url(#brick)" opacity=".5" /></g>;
  return (
    <g>
      {type === 'outpost' && <g><rect width="1000" height="600" fill={`url(#psky)`} /><ellipse cx="300" cy="520" rx="600" ry="120" fill={c.ground} /><rect y="470" width="1000" height="130" fill={c.ground2} opacity=".5" />
        <g transform="translate(700 470)"><rect x="-110" y="-150" width="220" height="150" fill="#d9c294" /><rect x="-110" y="-150" width="220" height="150" fill="url(#brick)" opacity=".4" /><path d="M-130-140 L0-230 L130-140Z" fill={c.primary} /><rect x="-30" y="-80" width="60" height="80" rx="30" fill="#6b4220" /></g>
        {[40, 120].map((x) => <g key={x} transform={`translate(${x} 500)`}><rect x="-4" y="-60" width="8" height="60" fill="#6b4220" /><rect x="-50" y="-40" width="100" height="6" fill="#7a4b24" /></g>)}
        <Banner x={560} y={470} c={c.primary} h={120} s={1.3} /></g>}
      {type === 'tower' && <g>{wall}<rect x="380" y="90" width="120" height="200" rx="60" fill="#87ceeb" /><rect x="378" y="88" width="124" height="204" rx="62" fill="none" stroke="#5a5448" strokeWidth="10" /><path d="M440 90V290M380 190H500" stroke="#5a5448" strokeWidth="6" /><Torch x={200} y={260} /><Torch x={800} y={260} /><rect y="470" width="1000" height="130" fill="#6e6759" /></g>}
      {type === 'shrine' && <g>{wall}<rect y="470" width="1000" height="130" fill="#7a7466" />{[260, 480, 700].map((x) => <g key={x} transform={`translate(${x} 270)`}><path d="M0-80 L44-60 V-10 Q44 40 0 60 Q-44 40 -44-10 V-60Z" fill="#c9332f" stroke="#e8c13f" strokeWidth="6" /><path d="M0-50 L20-38 L0 30 L-20-38Z" fill="#e8c13f" /></g>)}<Banner x={150} y={470} c={c.primary} h={300} s={1.4} /><Banner x={870} y={470} c={c.primary} h={300} s={1.4} /><Torch x={380} y={400} /><Torch x={600} y={400} /></g>}
      {type === 'arena' && <g>{wall}<rect y="440" width="1000" height="160" fill="#b9b2a2" />{Array.from({ length: 10 }).map((_, i) => <rect key={i} x={i * 100 + 4} y={450 + (i % 2) * 60} width="92" height="52" fill={(i + (i > 4 ? 1 : 0)) % 2 ? c.accent : '#e8dfc5'} stroke="#8a7f68" strokeWidth="3" opacity=".9" />)}{['▲', '●', '■', '◆'].map((g, i) => <text key={i} x={140 + i * 220} y="200" fontSize="70" fill="#d9c294" opacity=".35" fontFamily="serif">{g}</text>)}<Column x={60} y={440} h={300} c="#d9d1bd" /><Column x={940} y={440} h={300} c="#d9d1bd" /><Torch x={200} y={330} /><Torch x={800} y={330} /></g>}
      {type === 'archive' && <g>{wall}{[0, 1, 2].map((r) => <g key={r}><rect x="40" y={80 + r * 130} width="920" height="14" fill="#4a2f18" />{Array.from({ length: 26 }).map((_, i) => <rect key={i} x={50 + i * 35} y={50 + r * 130} width="22" height="30" rx="2" fill={['#8a3a2b', '#2f6f8a', '#7a6a2b', '#4a2f6a'][(i + r) % 4]} />)}</g>)}<rect y="480" width="1000" height="120" fill="#5a3f26" /><rect x="520" y="400" width="360" height="30" fill="#8a5a2b" /><Torch x={120} y={460} /></g>}
      {type === 'fortress' && <g>{wall}<circle cx="300" cy="330" r="260" fill="url(#glowPurple)" className="pulse" /><rect y="480" width="1000" height="120" fill="#3a2a52" />{[100, 900].map((x) => <g key={x}><Column x={x} y={480} h={380} c="#4a3a66" /></g>)}<Sparkles n={30} seed={9} w={1000} h={520} c="#d9aaff" /><path d="M0 480 Q500 420 1000 480" stroke="#b57cf0" strokeWidth="3" fill="none" className="pulse" /></g>}
    </g>
  );
}

function Encounter() {
  const { id, level: lvParam } = useParams();
  const level = Number(lvParam);
  const nav = useNavigate();
  const game = useGame();
  const k = kingdomById(id);
  const L = LEVELS[level - 1];
  const enc = useEncounter(id, level);
  const [bossIntro, setBossIntro] = useState(Boolean(L?.boss));
  const [showAdapt, setShowAdapt] = useState(true);
  const completedAtStart = useMemo(() => game.progress[id]?.completed ?? 0, []); // eslint-disable-line react-hooks/exhaustive-deps
  const frontier = level === completedAtStart + 1;

  // Record the win once. (Real backend: progress arrives from GET /api/sessions/{id}.)
  const { completeLevel } = game;
  // Mock: record the win locally. Real backend: the server already recorded the win or the respawn, so reload progress.
  useEffect(() => {
    const s = enc.session?.status;
    if (s === 'won') completeLevel(id, level);
    else if (s === 'lost') game.resetToCheckpoint(id);
  }, [enc.session?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!bossIntro) return; const t = setTimeout(() => setBossIntro(false), 4200); return () => clearTimeout(t); }, [bossIntro]);

  const mood = enc.outcome === 'won' || enc.session?.status === 'won' ? 'defeated' : enc.session?.status === 'lost' ? 'happy' : 'idle';
  const strikes = enc.session?.strikes ?? 0;
  const done = Boolean(enc.session && enc.session.status !== 'active');
  const nextKingdom = KINGDOMS[k.index + 1];
  const checkpointReached = completedAtStart >= GAME_CONFIG.checkpointLevel || (level > GAME_CONFIG.checkpointLevel && !frontier);
  const restartLevel = frontier ? (completedAtStart >= GAME_CONFIG.checkpointLevel ? GAME_CONFIG.checkpointLevel + 1 : 1) : level;

  const toKingdom = () => nav(`/kingdom/${id}`);
  const next = () => nav(`/play/${id}/${level + 1}`, { replace: true });
  const retry = () => { if (frontier) game.resetToCheckpoint(id); nav(`/play/${id}/${restartLevel}`, { replace: true }); };

  return (
    <div className={`gameplay ${L.boss ? 'boss' : ''}`} style={{ '--c': k.colors.primary }}>
      <header className="top-bar">
        <Link to={`/kingdom/${id}`} className="stone-btn small">‹ Retreat</Link>
        <div className={`ribbon ${L.boss ? 'purple' : ''}`} style={{ '--c': L.boss ? '#6a2f9a' : k.colors.primary }}>{L.boss ? '☠ ' : ''}Level {level}: {L.name}</div>
        <span className="hud-sub">{k.name} · {k.places[level - 1]}</span>
      </header>

      <div className="encounter-grid">
        <section className="stage" aria-label="Encounter scene">
          <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMax slice" className="scene">
            <SharedDefs />
            <defs><linearGradient id="psky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={k.colors.sky[0]} /><stop offset="1" stopColor={k.colors.sky[1]} /></linearGradient></defs>
            <Backdrop type={L.building} k={k} />
            <GuardianCharacter kind={k.guardian.kind} level={level} boss={L.boss} mood={mood} x={L.boss ? 400 : 330} y={535} scale={L.boss ? 2.1 : 2.9} active={false} />
            <rect width="1000" height="600" fill="url(#vignette)" />
          </svg>
          <div className="nameplate"><b>{enc.session?.character || k.guardian.name}</b><small>{k.guardian.title}</small></div>
          {level === 1 && <div className="tutorial-tag">📜 Tutorial encounter</div>}
          {L.boss && enc.adaptation && (
            <div className={`adapt parchment ${showAdapt ? '' : 'min'}`}>
              <button className="adapt-head" onClick={() => setShowAdapt((v) => !v)} aria-expanded={showAdapt}>
                <span className="skull">☠</span> Adaptation: <b>{enc.adaptation.status.toUpperCase()}</b> {enc.adaptation.resistance != null && <span className="res">{enc.adaptation.resistance}% resistant</span>}
              </button>
              {showAdapt && (<>
                <p>{enc.adaptation.summary}</p>
                {enc.adaptation.resistance != null && <div className="bar"><i style={{ width: `${enc.adaptation.resistance}%` }} /></div>}
                <ul>{enc.adaptation.learned.map((s) => <li key={s.level}><span>Lv {s.level}</span> {s.strategy} <em>{s.blocked ? 'BLOCKED' : 'open'}</em></li>)}</ul>
              </>)}
            </div>
          )}
        </section>

        <section className="talk">
          <GameHUD kingdom={k} level={level} strikes={strikes} maxStrikes={GAME_CONFIG.maxStrikes} attempts={enc.session?.attempts ?? 0} completed={Math.max(game.progress[id].completed, 0)} />
          <GuardianDialogue guardianName={enc.session?.character || k.guardian.name}messages={enc.messages} loading={enc.loading} sending={enc.sending}
            error={enc.error} disabled={done || !enc.session} onSend={enc.send} onRetry={enc.session ? enc.clearError : enc.retryStart} />
          {done && !enc.outcome && <p className="resolving">The guardian considers your fate…</p>}
          <p className="level-hint">Goal: persuade the guardian to reveal the kingdom's codeword. <b>Fictional game</b> — no real systems involved.</p>
        </section>
      </div>

      {bossIntro && (
        <div className="boss-intro" onClick={() => setBossIntro(false)} role="alertdialog" aria-label="Boss introduction">
          <div className="boss-intro-inner">
            <h1>ANCIENT DEFENSE AWAKENED</h1>
            <p>{enc.adaptation?.summary || 'The guardian has analysed earlier successful strategies.'}</p>
            <p className="ad-status">Adaptation status: <b>{(enc.adaptation?.status || 'analysing').toUpperCase()}</b></p>
            <small>(click to continue)</small>
          </div>
        </div>
      )}

      {enc.outcome === 'won' && (level === GAME_CONFIG.checkpointLevel
        ? <CheckpointModal debrief={enc.debrief} onContinue={next} onMap={toKingdom} />
        : <VictoryModal kingdom={k} level={level} debrief={enc.debrief} kingdomComplete={level === 6} nextKingdom={nextKingdom}
            onContinue={next} onMap={() => (level === 6 ? nav('/world') : toKingdom())} />)}
      {enc.outcome === 'lost' && <DefeatModal checkpointReached={checkpointReached} restartLevel={restartLevel} frontier={frontier} onRetry={retry} onMap={() => nav('/world')} />}
    </div>
  );
}

export default function GameplayPage() {
  const { id, level } = useParams();
  const loc = useLocation();
  const game = useGame();
  const n = Number(level);
  const k = kingdomById(id);
  // Is this gate open? Decided ONCE when the player arrives at it. With the real backend, progress changes
  // while the encounter is on screen (a win moves the campaign on, a defeat respawns it), and re-checking on
  // every change would throw the player out before they see the Victory or Defeat screen.
  const key = `${loc.key}-${id}-${n}`;
  const entry = useRef({ key: null, ok: true });
  if (entry.current.key !== key) {
    const ok = Boolean(k) && Number.isInteger(n) && n >= 1 && n <= 6 && game.isKingdomUnlocked(id) && game.levelStatus(id, n) !== 'locked';
    entry.current = { key, ok };
  }
  if (!entry.current.ok) return <Navigate to={k && game.isKingdomUnlocked(id) ? `/kingdom/${id}` : '/world'} replace />;
  return <Encounter key={key} />;
}
