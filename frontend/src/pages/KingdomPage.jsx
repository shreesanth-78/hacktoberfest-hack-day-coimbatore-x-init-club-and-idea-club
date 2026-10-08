import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { kingdomById } from '../data/kingdoms.js';
import { LEVELS } from '../data/levels.js';
import { GREETINGS } from '../data/mockResponses.js';
import { useGame } from '../hooks/useGameState.jsx';
import { spline, usePathWalker } from '../hooks/usePathWalker.js';
import { Arches, Bush, Cloud, Column, Crystal, Flower, Gear, Mountain, Pine, Rock, SharedDefs, Ship, Tree, rng } from '../components/art.jsx';
import GameHUD from '../components/GameHUD.jsx';
import GuardianCharacter from '../components/GuardianCharacter.jsx';
import KingdomEntrance from '../components/KingdomEntrance.jsx';
import LevelNode from '../components/LevelNode.jsx';
import LevelProgression from '../components/LevelProgression.jsx';
import PlayerCharacter from '../components/PlayerCharacter.jsx';
import StonePath from '../components/StonePath.jsx';

const W = 1100, H = 700;
const NODES = [{ x: 270, y: 560 }, { x: 500, y: 612 }, { x: 740, y: 566 }, { x: 905, y: 410 }, { x: 640, y: 310 }, { x: 330, y: 215 }];
const GATE = { x: 110, y: 620 };
const CTRL = [GATE, { x: 190, y: 612 }, NODES[0], { x: 390, y: 600 }, NODES[1], { x: 625, y: 604 }, NODES[2], { x: 860, y: 510 }, NODES[3], { x: 800, y: 340 }, NODES[4], { x: 480, y: 255 }, NODES[5]];
const ROAD = spline(CTRL, 16);
const NODE_IDX = [2, 4, 6, 8, 10, 12].map((c) => ROAD.marks[c]);
const nearestIdx = (p) => ROAD.pts.reduce((b, q, i) => { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; return d < b[0] ? [d, i] : b; }, [Infinity, 0])[1];

function Backdrop({ k }) {
  const c = k.colors;
  const items = useMemo(() => {
    const r = rng(k.index * 31 + 5), out = [];
    const near = (x, y) => ROAD.pts.some((p, i) => i % 2 === 0 && (p.x - x) ** 2 + (p.y - y) ** 2 < 70 * 70) || NODES.some((n) => (n.x - x) ** 2 + (n.y - y) ** 2 < 110 * 110) || (x < 230 && y > 520);
    for (let i = 0; i < 90; i++) {
      const x = 20 + r() * (W - 40), y = 160 + r() * 520;
      if (near(x, y)) continue;
      if (k.id === 'trade' && x > 780 && y > 560) continue;
      const t = r();
      out.push(k.id === 'scrap' ? { t: t < 0.6 ? 'rock' : 'gear', x, y, s: 0.8 + r() * 0.9 } : { t: t < 0.4 ? 'tree' : t < 0.6 ? 'pine' : t < 0.8 ? 'bush' : t < 0.92 ? 'flower' : 'rock', x, y, s: 0.8 + r() * 0.5 });
    }
    return out.sort((a, b) => a.y - b.y);
  }, [k]);
  return (
    <g>
      <defs><linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={c.sky[0]} /><stop offset="1" stopColor={c.sky[1]} /></linearGradient></defs>
      <rect width={W} height={H} fill="url(#sky)" />
      <Cloud x={200} y={60} s={1.4} /><Cloud x={620} y={40} s={1.8} d={5} /><Cloud x={940} y={90} s={1.2} d={9} />
      {[[100, 150], [260, 130], [430, 160], [600, 120], [780, 150], [980, 125]].map(([x, y], i) => <Mountain key={i} x={x} y={y} s={0.9 + (i % 3) * 0.2} c={k.id === 'scrap' ? '#c68b4e' : k.id === 'risk' ? '#8c7fa6' : '#8a9aa8'} c2={k.id === 'scrap' ? '#a6702f' : '#667587'} snow={k.id !== 'scrap'} />)}
      <rect y="150" width={W} height={H - 150} fill={k.id === 'scrap' ? '#e0c488' : c.ground} />
      <path d={`M0 150 Q ${W / 2} 120 ${W} 150 V190 Q ${W / 2} 160 0 190Z`} fill={c.ground2} opacity=".6" />
      {[[300, 460, 220, 70], [800, 600, 240, 70], [650, 220, 200, 50]].map(([x, y, rx, ry], i) => <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill={c.ground2} opacity=".45" />)}
      {k.id === 'civic' && <g><path d="M0 200 Q400 170 760 190 T1100 230" stroke="#2f7fb8" strokeWidth="40" fill="none" /><path d="M0 200 Q400 170 760 190 T1100 230" stroke="#52b0ea" strokeWidth="28" fill="none" /><Arches x={80} y={205} n={9} h={40} /></g>}
      {k.id === 'bio' && <g>{[0, 1, 2, 3, 4, 5].map((i) => <Column key={i} x={120 + i * 170} y={200} h={50} />)}<Crystal x={950} y={560} s={1.6} /><Crystal x={80} y={420} s={1.3} c="#8ff5e0" /><Crystal x={1020} y={300} s={1.1} /></g>}
      {k.id === 'trade' && <g><path d="M780 560 Q900 520 1100 540 V700 H760Z" fill="#3f9bd8" /><path d="M820 600 Q930 570 1100 590 V700 H800Z" fill="#59b3ea" /><Ship x={940} y={640} s={1.1} /><Ship x={1040} y={600} s={0.8} sail="#ffe9b0" /><rect x="720" y="565" width="160" height="10" fill="#8a5a2b" /></g>}
      {k.id === 'risk' && <g>{[170, 520, 860].map((x) => <g key={x} transform={`translate(${x} 230)`}><rect x="-14" y="-70" width="28" height="70" fill="#d9d3e3" /><circle cx="0" cy="-82" r="13" fill="#d9d3e3" /><rect x="-20" y="-4" width="40" height="8" fill="#b9b2cc" /></g>)}<rect x="0" y="195" width={W} height="14" fill="#cfc9d8" opacity=".7" /></g>}
      {k.id === 'scrap' && <g>{[[120, 260, 20], [980, 260, 26], [1040, 470, 16], [90, 440, 14]].map(([x, y, r], i) => <Gear key={i} x={x} y={y} r={r} c="#8a6a4a" />)}<path d="M0 640 Q200 600 400 650 T800 630 T1100 650" stroke="#c9a566" strokeWidth="3" fill="none" /></g>}
      {items.map((o, i) => o.t === 'tree' ? <Tree key={i} {...o} /> : o.t === 'pine' ? <Pine key={i} {...o} /> : o.t === 'bush' ? <Bush key={i} {...o} /> : o.t === 'flower' ? <Flower key={i} {...o} /> : o.t === 'gear' ? <Gear key={i} x={o.x} y={o.y} r={9 * o.s} c="#8a6a4a" spin={false} /> : <Rock key={i} {...o} c={k.id === 'scrap' ? '#b79868' : '#8d8f94'} />)}
    </g>
  );
}

export default function KingdomPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const game = useGame();
  const k = kingdomById(id);
  const walker = usePathWalker(GATE, 200);
  const [sel, setSel] = useState(null);
  const [arrivedAt, setArrivedAt] = useState(null);
  const [toast, setToast] = useState('');
  const [shakeLv, setShakeLv] = useState(null);
  const token = useRef(0);

  const completed = k ? game.progress[k.id].completed : 0;
  const unlocked = k ? game.isKingdomUnlocked(k.id) : false;
  const statusOf = useCallback((n) => game.levelStatus(id, n), [game, id]);

  const goTo = useCallback(async (n) => {
    const my = ++token.current;
    setSel(n); setArrivedAt(null);
    const target = NODE_IDX[n - 1];
    const from = nearestIdx(walker.pos);
    const seg = from < target ? ROAD.pts.slice(from + 1, target + 1) : ROAD.pts.slice(target, from).reverse();
    const ok = await walker.walk(seg);
    if (ok && token.current === my) setArrivedAt(n);
  }, [walker]);

  const onSelect = useCallback((n) => {
    if (statusOf(n) === 'locked') {
      setToast(`Level ${n} is locked. Complete Level ${n - 1} first.`); setShakeLv(n);
      setTimeout(() => setShakeLv(null), 600); setTimeout(() => setToast(''), 2600);
      return;
    }
    goTo(n);
  }, [statusOf, goTo]);

  // On arrival the adventurer walks from the gate to the current level automatically.
  useEffect(() => {
    if (!k || !unlocked) return;
    const n = Math.min(6, completed + 1);
    const t = setTimeout(() => goTo(n), 350);
    return () => { clearTimeout(t); token.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!k) return <Navigate to="/world" replace />;
  if (!unlocked) return <Navigate to="/world" replace />;

  const L = sel ? LEVELS[sel - 1] : null;
  const allDone = completed >= 6;
  const begin = () => { if (sel && statusOf(sel) !== 'locked') nav(`/play/${k.id}/${sel}`); };

  return (
    <div className="kingdom-page" style={{ '--c': k.colors.primary, '--c-dark': k.colors.dark }}>
      <header className="top-bar">
        <Link to="/world" className="stone-btn small">‹ World Map</Link>
        <div className="ribbon" style={{ '--c': k.colors.primary }}>{k.name}</div>
        <span className="hud-sub">{k.domain}</span>
      </header>
      <div className="kingdom-layout">
        <div className="scene-wrap">
          <svg className="scene" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${k.name}: six levels along a stone road`}>
            <SharedDefs />
            <Backdrop k={k} />
            <StonePath pts={ROAD.pts} litUntil={sel ? NODE_IDX[Math.min(5, completed)] : 0} />
            <KingdomEntrance kingdom={k} x={GATE.x - 10} y={GATE.y - 20} scale={0.95} level={1} active={walker.walking === false && !arrivedAt} />
            {LEVELS.map((lv, i) => {
              const st = statusOf(lv.n);
              return (
                <g key={lv.n}>
                  <g opacity={st === 'locked' ? 0.45 : 1}><GuardianCharacter kind={k.guardian.kind} level={lv.n} boss={lv.boss} mood={st === 'completed' ? 'happy' : 'idle'} x={NODES[i].x + (lv.boss ? 70 : 54)} y={NODES[i].y + 6} scale={0.5} active={arrivedAt === lv.n} /></g>
                  <LevelNode level={lv.n} x={NODES[i].x} y={NODES[i].y} status={st} kingdom={k} selected={sel === lv.n} onSelect={onSelect} shake={shakeLv === lv.n} />
                </g>
              );
            })}
            <PlayerCharacter x={walker.pos.x} y={walker.pos.y} facing={walker.facing} walking={walker.walking} celebrating={allDone && !walker.walking && sel === 6} scale={1.5} />
            <rect width={W} height={H} fill="url(#vignette)" pointerEvents="none" />
          </svg>
          {toast && <div className="toast" role="alert">{toast}</div>}
        </div>
        <aside className="side-col">
          <GameHUD kingdom={k} level={Math.min(6, completed + 1)} completed={completed} showEncounter={false} />
          {L && (
            <section className="parchment encounter-card" aria-live="polite">
              <div className="ribbon small" style={{ '--c': L.boss ? '#6a2f9a' : k.colors.primary }}>Level {L.n}: {L.name}</div>
              <div className="guard-line">
                <svg viewBox="-60 -150 120 165" width="70" height="96"><SharedDefs /><GuardianCharacter kind={k.guardian.kind} level={L.n} boss={L.boss} scale={L.boss ? 0.8 : 1} /></svg>
                <blockquote><cite>{k.guardian.name}</cite>{arrivedAt === L.n ? `“${GREETINGS[L.n](k.guardian.name).split('.')[0].toUpperCase()}.”` : walker.walking ? 'Your messenger approaches…' : '…'}</blockquote>
              </div>
              <p className="brief">{L.brief}</p>
              {L.n === 1 && <p className="tutorial">📜 First encounter — a tutorial. Talk to the guard and learn the way of the heist.</p>}
              <button className="stone-btn big" disabled={arrivedAt !== L.n || statusOf(L.n) === 'locked'} onClick={begin}>
                {arrivedAt !== L.n ? 'Travelling…' : statusOf(L.n) === 'completed' ? 'Revisit Challenge ›' : L.boss ? 'Face the Boss ›' : 'Begin Challenge ›'}
              </button>
            </section>
          )}
          <LevelProgression kingdom={k} statusOf={statusOf} selected={sel} onSelect={onSelect} />
        </aside>
      </div>
    </div>
  );
}
