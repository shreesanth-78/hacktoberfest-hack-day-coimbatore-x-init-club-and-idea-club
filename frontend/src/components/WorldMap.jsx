import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KINGDOMS } from '../data/kingdoms.js';
import { useGame } from '../hooks/useGameState.jsx';
import { spline, usePathWalker } from '../hooks/usePathWalker.js';
import { Bush, Cloud, Flower, Hut, Mountain, Pine, Rock, SharedDefs, Tower, Tree, rng } from './art.jsx';
import KingdomRegion from './KingdomRegion.jsx';
import PlayerCharacter from './PlayerCharacter.jsx';
import StonePath from './StonePath.jsx';
import GuardianCharacter from './GuardianCharacter.jsx';
import { GREETINGS } from '../data/mockResponses.js';

const W = 1600, H = 1000, ASPECT = W / H;
// Control points of the winding road; `g` tags the gate (stop) of each kingdom.
const CTRL = [
  { x: 110, y: 900 }, { x: 210, y: 885 }, { x: 300, y: 812, g: 0 },
  { x: 150, y: 730 }, { x: 140, y: 600 }, { x: 225, y: 470 }, { x: 330, y: 405 }, { x: 430, y: 362, g: 1 },
  { x: 545, y: 440 }, { x: 660, y: 535 }, { x: 760, y: 640 }, { x: 830, y: 690 }, { x: 900, y: 702, g: 2 },
  { x: 1010, y: 640 }, { x: 1070, y: 520 }, { x: 1115, y: 430 }, { x: 1170, y: 352, g: 3 },
  { x: 1250, y: 430 }, { x: 1275, y: 540 }, { x: 1270, y: 660 }, { x: 1320, y: 760 }, { x: 1400, y: 802, g: 4 },
];
const RIVER = 'M560 -10 C600 160 610 300 650 470 C690 640 700 760 750 900';
const ROAD = spline(CTRL, 16);
const STOPS = [ROAD.marks[0], ...CTRL.map((c, i) => (c.g !== undefined ? ROAD.marks[i] : null)).filter((v) => v !== null)];

const nearestIdx = (p) => ROAD.pts.reduce((best, q, i) => { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; return d < best[0] ? [d, i] : best; }, [Infinity, 0])[1];

function Terrain() {
  const scenery = useMemo(() => {
    const r = rng(7);
    const items = [];
    const nearRoad = (x, y) => ROAD.pts.some((p, i) => i % 3 === 0 && (p.x - x) ** 2 + (p.y - y) ** 2 < 52 * 52);
    const nearKingdom = (x, y) => KINGDOMS.some((k) => ((x - k.mapCenter.x) / 190) ** 2 + ((y - k.mapCenter.y - 20) / 140) ** 2 < 1);
    const inSea = (x, y) => ((x - 900) / 340) ** 2 + ((y - 950) / 190) ** 2 < 1;
    const inRiver = (x, y) => x > 540 + (y / 1000) * 190 - 35 && x < 600 + (y / 1000) * 190 + 40 && y < 900;
    const desert = (x, y) => ((x - 1430) / 260) ** 2 + ((y - 760) / 280) ** 2 < 1;
    for (let i = 0; i < 260; i++) {
      const x = 20 + r() * 1560, y = 30 + r() * 950, t = r();
      if (nearRoad(x, y) || nearKingdom(x, y) || inSea(x, y)) continue;
      if (desert(x, y)) { if (t < 0.5) items.push({ k: 'rock', x, y, s: 0.7 + r() * 0.8, c: '#b79868' }); continue; }
      if (inRiver(x, y)) continue;
      items.push(t < 0.45 ? { k: 'tree', x, y, s: 0.8 + r() * 0.6, tone: Math.floor(r() * 3) } : t < 0.65 ? { k: 'pine', x, y, s: 0.8 + r() * 0.6 } : t < 0.8 ? { k: 'bush', x, y, s: 0.8 + r() * 0.5 } : t < 0.92 ? { k: 'flower', x, y, c: ['#f4d03f', '#ff9ad0', '#fff', '#ff7b5c'][Math.floor(r() * 4)] } : { k: 'rock', x, y, s: 0.7 + r() * 0.6 });
    }
    return items.sort((a, b) => a.y - b.y);
  }, []);
  return (
    <g>
      <rect width={W} height={H} fill="#7fc15f" />
      <rect width={W} height={H} fill="url(#grassPatch)" opacity=".5" />
      {[[420, 560, 240, 120], [1000, 200, 280, 120], [200, 200, 160, 100], [1100, 880, 160, 70]].map(([x, y, rx, ry], i) => <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="#6aae52" opacity=".55" />)}
      {/* desert */}
      <ellipse cx="1430" cy="770" rx="270" ry="290" fill="#e3c88f" /><ellipse cx="1430" cy="770" rx="270" ry="290" fill="none" stroke="#c9a566" strokeWidth="6" strokeDasharray="14 10" opacity=".7" />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${1250 + i * 60} ${540 + i * 70} q40 -18 90 0 t90 0`} stroke="#c9a566" strokeWidth="3" fill="none" opacity=".6" />)}
      {/* sea */}
      <path d="M520 1000 C560 880 700 820 880 836 C1040 848 1150 900 1220 1000Z" fill="#3f9bd8" />
      <path d="M545 1000 C590 905 720 850 880 862 C1030 872 1130 920 1190 1000Z" fill="#59b3ea" />
      <g className="waves" opacity=".6" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round">
        {[[650, 950], [780, 900], [900, 940], [1020, 905], [1100, 965], [720, 985]].map(([x, y], i) => <path key={i} d={`M${x} ${y} q12 -8 24 0 t24 0`} style={{ animationDelay: `${i * 0.4}s` }} />)}
      </g>
      {/* river */}
      <path d={RIVER} stroke="#2f7fb8" strokeWidth="58" fill="none" strokeLinecap="round" /><path d={RIVER} stroke="#52b0ea" strokeWidth="44" fill="none" strokeLinecap="round" />
      <path d={RIVER} stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="10 26" opacity=".55" className="river-flow" />
      {/* waterfall + cave */}
      <g transform="translate(560 40)"><rect x="-22" y="-20" width="44" height="52" fill="#9aa0ad" /><rect x="-14" y="-20" width="28" height="58" fill="#bfe6ff" className="water" /><path d="M-14 38 q14 10 28 0" stroke="#fff" strokeWidth="4" fill="none" /></g>
      <g transform="translate(70 330)"><path d="M-34 0 Q-34-44 0-44 Q34-44 34 0Z" fill="#6d7280" /><path d="M-16 0 Q-16-26 0-26 Q16-26 16 0Z" fill="#14121a" /></g>
      {/* mountain ranges */}
      {[[700, 130, 1.1], [800, 90, 1.5], [920, 140, 1.2], [1020, 90, 1], [640, 190, 0.8], [980, 320, 1.1], [1030, 300, 0.8], [1320, 120, 1.4], [1450, 150, 1.2], [1530, 90, 1.1], [60, 460, 1.2], [70, 580, 1], [40, 250, 1.1], [560, 770, 0.9], [1190, 640, 0.9]].map(([x, y, s], i) => <Mountain key={i} x={x} y={y} s={s} />)}
      {/* sandstone cliffs */}
      {[[1230, 850, 1], [1560, 640, 1.3], [1520, 900, 1.2], [1290, 590, 0.9]].map(([x, y, s], i) => <Mountain key={`c${i}`} x={x} y={y} s={s} snow={false} c="#c68b4e" c2="#a6702f" />)}
      {scenery.map((o, i) => o.k === 'tree' ? <Tree key={i} {...o} /> : o.k === 'pine' ? <Pine key={i} {...o} /> : o.k === 'bush' ? <Bush key={i} {...o} /> : o.k === 'flower' ? <Flower key={i} {...o} /> : <Rock key={i} {...o} />)}
      {/* villages, towers and ruins */}
      {[[560, 190], [150, 540], [1010, 790], [740, 330]].map(([x, y], i) => <g key={i}><Hut x={x} y={y} s={0.8} /><Hut x={x + 34} y={y + 8} s={0.65} roof="#c8921c" /><Hut x={x - 30} y={y + 10} s={0.6} roof="#8a3f2b" /></g>)}
      <Tower x={690} y={380} h={50} w={20} roof="#7a4b24" /><Tower x={1010} y={230} h={56} w={22} roof="#7b3fa8" /><Tower x={240} y={560} h={44} w={18} roof="#2b7fc4" />
      <g transform="translate(1220 170)">{[-36, -14, 10, 32].map((x, i) => <rect key={i} x={x} y={-30 + i * 4} width="12" height={30 - i * 4} fill="#cfc9b8" />)}<rect x="-44" y="0" width="90" height="8" fill="#b9b2a2" /></g>
      <Cloud x={300} y={120} s={1.2} /><Cloud x={900} y={220} s={1.6} d={4} /><Cloud x={1300} y={60} s={1.3} d={8} /><Cloud x={120} y={800} s={1.1} d={2} />
    </g>
  );
}

export default function WorldMap({ devTools }) {
  const nav = useNavigate();
  const game = useGame();
  const viewRef = useRef(null);
  const [vp, setVp] = useState({ w: 1000, h: 600 });
  const startStop = Number(sessionStorage.getItem('ph-stop') ?? 0);
  const startPos = ROAD.pts[STOPS[startStop]];
  const walker = usePathWalker(startPos, 190);
  const [stop, setStop] = useState(startStop);
  const [selected, setSelected] = useState(null);
  const [arrived, setArrived] = useState(null);
  const [shake, setShake] = useState(null);
  const selRef = useRef(null);
  const [focus, setFocus] = useState({ x: startPos.x, y: startPos.y, s: 1 });

  useEffect(() => {
    const el = viewRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setVp({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setVp({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const stageW = Math.max(vp.w, vp.h * ASPECT), stageH = stageW / ASPECT;
  const cam = useMemo(() => {
    const s = focus.s, k = (stageW / W) * s;
    const tx = Math.min(0, Math.max(vp.w - W * k, vp.w / 2 - focus.x * k));
    const ty = Math.min(0, Math.max(vp.h - H * k, vp.h / 2 - focus.y * k));
    return { tx, ty, k };
  }, [focus, vp, stageW]);

  const select = useCallback(async (id) => {
    const kd = KINGDOMS.find((k) => k.id === id);
    selRef.current = id;
    setSelected(id); setArrived(null);
    setFocus({ x: kd.mapCenter.x, y: kd.mapCenter.y + 20, s: vp.w < 700 ? 1.6 : 1.9 });
    if (!game.isKingdomUnlocked(id)) { setShake(id); setTimeout(() => setShake(null), 600); return; }
    const target = STOPS[kd.index + 1];
    const from = nearestIdx(walker.pos);
    const seg = from < target ? ROAD.pts.slice(from + 1, target + 1) : ROAD.pts.slice(target, from).reverse();
    const done = await walker.walk(seg);
    if (done && selRef.current === id) { setArrived(id); setStop(kd.index + 1); sessionStorage.setItem('ph-stop', String(kd.index + 1)); }
  }, [game, walker, vp.w]);

  const close = () => { selRef.current = null; setSelected(null); setArrived(null); setFocus({ x: walker.pos.x, y: walker.pos.y, s: 1 }); };
  const sel = KINGDOMS.find((k) => k.id === selected);
  const selUnlocked = sel && game.isKingdomUnlocked(sel.id);
  const prev = sel && KINGDOMS[sel.index - 1];
  const lastUnlocked = KINGDOMS.filter((k) => game.isKingdomUnlocked(k.id)).length;
  const litUntil = STOPS[lastUnlocked];
  const enter = () => { sessionStorage.setItem('ph-stop', String(sel.index + 1)); nav(`/kingdom/${sel.id}`); };

  return (
    <div className="map-page">
      <div className="map-viewport" ref={viewRef}>
        <div className="map-stage" style={{ width: stageW, height: stageH, transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${focus.s})` }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" role="img" aria-label="World map of the five ancient kingdoms">
            <SharedDefs />
            <defs><pattern id="grassPatch" width="60" height="60" patternUnits="userSpaceOnUse"><circle cx="10" cy="14" r="2" fill="#5c9f45" /><circle cx="40" cy="40" r="2.4" fill="#8ad06a" /><circle cx="50" cy="8" r="1.6" fill="#5c9f45" /></pattern></defs>
            <Terrain />
            <StonePath pts={ROAD.pts} litUntil={litUntil} bridges={[{ x: 655, y: 520, r: 38 }]} />
            {/* start camp */}
            <g transform="translate(95 905)"><Hut x={0} y={0} s={0.9} roof="#b3262d" /><g transform="translate(-34 6)"><rect x="-1.5" y="-26" width="3" height="28" fill="#6b4a1e" /><rect x="-18" y="-26" width="36" height="12" rx="3" fill="#d9b97a" stroke="#6b4a1e" strokeWidth="2" /><text textAnchor="middle" y="-17" fontSize="7.5" fontWeight="900" fill="#3a2410" fontFamily="Cinzel,serif">START</text></g></g>
            {[...KINGDOMS].sort((a, b) => a.mapCenter.y - b.mapCenter.y).map((k) => (
              <g key={k.id} className={shake === k.id ? 'shake' : ''}>
                <KingdomRegion kingdom={k} status={game.isKingdomUnlocked(k.id) ? 'open' : 'locked'} selected={selected === k.id}
                  progress={game.progress[k.id].completed} onSelect={select} guardianActive={arrived === k.id} />
              </g>
            ))}
            <PlayerCharacter x={walker.pos.x} y={walker.pos.y} facing={walker.facing} walking={walker.walking} celebrating={game.kingdomsCompleted > 0 && !walker.walking && stop === 0 && false} scale={1.35} />
            <rect width={W} height={H} fill="url(#vignette)" pointerEvents="none" />
          </svg>
        </div>
      </div>

      <div className="map-hud top">
        <div className="hud-plate"><span className="hud-title">PROMPT HEIST</span><span className="hud-sub">The Five Ancient Kingdoms</span></div>
        <div className="hud-plate small" title="Kingdoms sealed"><ShieldIcon /> <b>{game.kingdomsCompleted}</b>/5 kingdoms</div>
        {devTools && <div className="dev-tools"><button className="stone-btn tiny" onClick={game.unlockAll}>Dev: unlock to Lv6</button><button className="stone-btn tiny" onClick={game.resetAll}>Reset</button></div>}
      </div>

      <nav className="kingdom-chips" aria-label="Kingdoms">
        {KINGDOMS.map((k) => {
          const open = game.isKingdomUnlocked(k.id);
          return (
            <button key={k.id} className={`chip ${selected === k.id ? 'on' : ''} ${open ? '' : 'locked'}`} style={{ '--c': k.colors.primary }} onClick={() => select(k.id)}>
              <span className="chip-flag" />{open ? '' : '🔒 '}{k.name.replace('The ', '')}<small>{game.progress[k.id].completed}/6</small>
            </button>
          );
        })}
      </nav>

      {sel && (
        <aside className={`parchment kingdom-panel ${selUnlocked ? '' : 'sealed'}`} style={{ '--c': sel.colors.primary }} aria-live="polite">
          <button className="panel-close" onClick={close} aria-label="Close">×</button>
          <div className="ribbon" style={{ '--c': sel.colors.primary }}>{sel.name}</div>
          <p className="domain">{sel.domain}</p>
          <p>{sel.description}</p>
          {selUnlocked ? (
            <>
              <div className="guard-line">
                <svg viewBox="-50 -135 100 150" width="64" height="90"><SharedDefs /><GuardianCharacter kind={sel.guardian.kind} level={1} x={0} y={0} /></svg>
                <blockquote>
                  <cite>{sel.guardian.name}</cite>
                  {arrived === sel.id ? `“HALT, TRAVELER! THE ANCIENT KINGDOM IS UNDER MY PROTECTION.”` : walker.walking ? 'Your messenger approaches the gate…' : '…'}
                </blockquote>
              </div>
              <div className="pips">{Array.from({ length: 6 }).map((_, i) => <i key={i} className={i < game.progress[sel.id].completed ? 'on' : ''} />)}<span>{game.progress[sel.id].completed}/6 levels</span></div>
              <button className="stone-btn big" onClick={enter} disabled={arrived !== sel.id}>{arrived === sel.id ? 'Enter the Kingdom ›' : 'Travelling…'}</button>
            </>
          ) : (
            <p className="locked-note">🔒 The gates are sealed. Complete all six levels of <b>{prev?.name}</b> to unlock this kingdom.</p>
          )}
        </aside>
      )}
    </div>
  );
}

export const ShieldIcon = () => (<svg viewBox="0 0 24 28" width="16" height="18" aria-hidden="true"><path d="M12 1 L22 5 V13 Q22 23 12 27 Q2 23 2 13 V5Z" fill="#c9332f" stroke="#e8c13f" strokeWidth="2" /></svg>);
