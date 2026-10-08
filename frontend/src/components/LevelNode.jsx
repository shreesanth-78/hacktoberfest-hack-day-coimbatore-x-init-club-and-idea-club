import { Banner, Hut, Tower, Torch, Column, Flower } from './art.jsx';
import { LEVELS } from '../data/levels.js';

function Building({ type, k }) {
  const c = k.colors;
  switch (type) {
    case 'outpost': return <g><Hut x={0} y={0} s={1.2} roof={c.primary} /><path d="M-34 4 H-18 M18 4 H34" stroke="#7a4b24" strokeWidth="3" /><Banner x={26} y={0} c={c.primary} h={34} /><Flower x={-30} y={8} /></g>;
    case 'tower': return <g><Tower x={0} y={0} h={64} w={28} roof={c.primary} /><Torch x={-22} y={0} /></g>;
    case 'shrine': return <g>
      <rect x="-34" y="-22" width="68" height="22" rx="3" fill="#b9b2a2" /><rect x="-34" y="-22" width="68" height="22" fill="url(#brick)" opacity=".5" />
      <Tower x={-34} y={0} h={52} w={20} roof={c.primary} flag={false} /><Tower x={34} y={0} h={52} w={20} roof={c.primary} flag={false} />
      <path d="M0-72 L22-62 V-40 Q22-20 0-8 Q-22-20 -22-40 V-62Z" fill="#c9332f" stroke="#e8c13f" strokeWidth="3" />
      <path d="M0-60 L10-52 L0-28 L-10-52Z" fill="#e8c13f" /><Banner x={-6} y={-70} h={14} /></g>;
    case 'arena': return <g>
      <ellipse cx="0" cy="0" rx="46" ry="20" fill="#9c9484" /><ellipse cx="0" cy="-3" rx="40" ry="16" fill="#cfc7b2" />
      {[-24, -8, 8, 24].map((x, i) => <rect key={x} x={x - 6} y={-10 + (i % 2) * 5} width="12" height="8" fill={i % 2 ? c.accent : '#e8dfc5'} stroke="#8a7f68" />)}
      <path d="M-30-6 l5-10 l5 10Z M20-4 h12 v7 h-12Z" fill={c.primary} stroke="#fff" strokeOpacity=".4" />
      <Column x={-46} y={0} h={36} c="#d9d1bd" /><Column x={46} y={0} h={36} c="#d9d1bd" /></g>;
    case 'archive': return <g>
      <rect x="-40" y="-36" width="80" height="36" fill="#e6dfc8" /><rect x="-40" y="-36" width="80" height="36" fill="url(#brick)" opacity=".35" />
      <path d="M-46-34 L0-62 L46-34Z" fill={c.dark} /><circle cx="0" cy="-44" r="5" fill="#f3e6c2" stroke="#8a6a3a" />
      {[-30, -15, 15, 30].map((x) => <Column key={x} x={x} y={0} h={32} c="#f2eee3" />)}
      <rect x="-9" y="-20" width="18" height="20" rx="8" fill="#241a12" /><path d="M-14-8 l-4 6 h8Z" fill="#f3e6c2" stroke="#8a6a3a" /></g>;
    case 'fortress': return <g>
      <circle cx="0" cy="-34" r="64" fill="url(#glowPurple)" className="pulse" />
      <rect x="-42" y="-30" width="84" height="30" fill="#8d88a0" /><rect x="-42" y="-30" width="84" height="30" fill="url(#brick)" opacity=".5" />
      <Tower x={-48} y={0} h={70} w={24} roof="#6a2f9a" /><Tower x={48} y={0} h={70} w={24} roof="#6a2f9a" />
      <Tower x={0} y={-24} h={74} w={30} roof="#4a1f78" c="#a39dbd" />
      <path d="M-10 -2 V-14 A10 10 0 0 1 10 -14 V-2Z" fill="#1a1020" />
      <path d="M-12-112 l4-8 l4 6 l4-9 l4 9 l4-6 l4 8 v8 h-24Z" fill="#f5c542" stroke="#8a5a1a" /></g>;
    default: return null;
  }
}

// One locale on the winding road: building art + number marker + state treatment.
export default function LevelNode({ level, x, y, status, kingdom, selected, onSelect, shake }) {
  const L = LEVELS[level - 1];
  const locked = status === 'locked';
  const done = status === 'completed';
  const avail = status === 'available';
  return (
    <g transform={`translate(${x} ${y})`}><g className={`level-node ${status} ${selected ? 'selected' : ''} ${shake ? 'shake' : ''}`}
       onClick={() => onSelect?.(level)} role="button" tabIndex={0} aria-label={`Level ${level}: ${L.name} (${status})`}
       onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.(level)} style={{ cursor: 'pointer' }}>
      {avail && <ellipse cx="0" cy="2" rx="62" ry="22" fill="url(#glowGold)" className="pulse" />}
      {selected && <ellipse cx="0" cy="4" rx="58" ry="19" fill="none" stroke="#ffd34d" strokeWidth="3" strokeDasharray="6 5" className="spin-slow" />}
      <g className={locked ? 'locked-art' : ''}><Building type={L.building} k={kingdom} /></g>
      {locked && <g>
        <path d="M-38-30 L38-6 M38-30 L-38-6" stroke="#3a3a3f" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 7" />
        <g transform="translate(0 -22)"><rect x="-10" y="-4" width="20" height="16" rx="3" fill="#6b6f78" stroke="#2f3238" strokeWidth="2" /><path d="M-6-4 V-10 A6 6 0 0 1 6-10 V-4" fill="none" stroke="#2f3238" strokeWidth="3" /><circle cx="0" cy="4" r="2" fill="#2f3238" /></g></g>}
      {/* number marker */}
      <g transform="translate(-34 -52)">
        <circle r="13" fill={locked ? '#555a63' : L.boss ? '#6a2f9a' : '#7a4b24'} stroke={locked ? '#33363c' : '#f3d37a'} strokeWidth="3" />
        <text textAnchor="middle" dy="5" fontSize="15" fontWeight="900" fill="#fff6dc" fontFamily="Cinzel, serif">{level}</text>
      </g>
      {L.checkpoint && <g transform="translate(34 -52)"><path d="M0-14 L12-9 V3 Q12 12 0 17 Q-12 12 -12 3 V-9Z" fill={done ? '#e8c13f' : '#c9332f'} stroke="#fff3c4" strokeWidth="2" /><path d="M-5 2 l4 4 l7-9" fill="none" stroke="#fff" strokeWidth="2.5" opacity={done ? 1 : 0} /></g>}
      {L.boss && <g transform="translate(34 -52)" className="bounce"><circle r="13" fill="#2a1240" stroke="#c9a0ff" strokeWidth="2" /><path d="M-7-2 a7 7 0 0 1 14 0 v4 h-3 v3 h-8 v-3 h-3Z" fill="#f4eaff" /><circle cx="-3" cy="-1" r="1.8" fill="#2a1240" /><circle cx="3" cy="-1" r="1.8" fill="#2a1240" /></g>}
      {done && <g transform="translate(36 -6)"><circle r="13" fill="#e8c13f" stroke="#8a5a1a" strokeWidth="2.5" /><circle r="8.5" fill="none" stroke="#fff3c4" strokeWidth="1.5" strokeDasharray="2 2" /><path d="M-5 0 l4 4 l7-8" fill="none" stroke="#6b4a1e" strokeWidth="3" strokeLinecap="round" /></g>}
      {/* plaque */}
      <g transform="translate(0 24)">
        <rect x="-62" y="-2" width="124" height="34" rx="6" fill="#d9b97a" stroke="#6b4a1e" strokeWidth="2.5" opacity={locked ? 0.7 : 1} />
        <text textAnchor="middle" y="13" fontSize="12.5" fontWeight="700" fill="#3a2410" fontFamily="Cinzel, serif">{kingdom.places[level - 1]}</text>
        <text textAnchor="middle" y="26" fontSize="10.5" fill={L.boss ? '#6a2f9a' : '#6b4a1e'} fontStyle="italic" fontFamily="'Crimson Text', serif">{L.difficulty}{L.checkpoint ? ' · Checkpoint' : ''}{L.boss ? ' · Boss' : ''}</text>
      </g>
    </g></g>
  );
}
