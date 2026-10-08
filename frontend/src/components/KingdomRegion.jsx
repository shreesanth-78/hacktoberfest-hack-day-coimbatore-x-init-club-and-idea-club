import { Arches, Banner, Bush, Column, Crystal, Flower, Gear, Hut, Rock, Ship, Tower, Tree, Wall } from './art.jsx';
import KingdomEntrance from './KingdomEntrance.jsx';

function Landmark({ id }) {
  switch (id) {
    case 'civic': return <g>
      <Arches x={-100} y={-34} n={5} />
      <Tower x={-96} y={-4} h={58} roof="#2b7fc4" /><Tower x={96} y={-4} h={58} roof="#2b7fc4" />
      <ellipse cx="0" cy="-12" rx="34" ry="12" fill="#8fd3ff" stroke="#cfc5ab" strokeWidth="4" />
      <ellipse className="water" cx="0" cy="-12" rx="30" ry="9" fill="url(#waterShine)" />
      <path className="fountain" d="M0-12 V-34 M-8-30 Q0-44 8-30" stroke="#bfeaff" strokeWidth="3" fill="none" />
      <Hut x={-62} y={-8} s={0.8} roof="#3d86c6" /><Hut x={62} y={-6} s={0.8} roof="#3d86c6" />
      <Banner x={-14} y={-60} c="#2b7fc4" h={30} s={0.8} /></g>;
    case 'bio': return <g>
      <rect x="-60" y="-40" width="120" height="10" fill="#f2eee3" />
      <path d="M-66-40 L0-72 L66-40Z" fill="#e9e3d2" stroke="#cfc8b2" strokeWidth="2" />
      <circle cx="0" cy="-52" r="6" fill="#1f9d86" />
      {[-52, -26, 0, 26, 52].map((x) => <Column key={x} x={x} y={-8} h={32} c="#f7f3e8" />)}
      <rect x="-60" y="-8" width="120" height="8" fill="#e0dac7" />
      <path d="M-100-8 V-36 A20 20 0 0 1 -60-36 V-8Z" fill="#f2eee3" stroke="#cfc8b2" strokeWidth="2" /><path d="M-100-36 A20 20 0 0 1 -60-36Z" fill="#1f9d86" />
      <Crystal x={80} y={-6} /><Crystal x={96} y={0} s={0.8} c="#8ff5e0" /><Crystal x={-110} y={4} s={0.7} />
      <Bush x={70} y={6} s={0.9} /><Bush x={-76} y={8} /><Flower x={86} y={10} c="#ff9ad0" /><Flower x={-90} y={12} c="#9ad0ff" />
      <Banner x={0} y={-72} c="#1f9d86" h={20} s={0.9} /></g>;
    case 'trade': return <g>
      <rect x="-110" y="-24" width="220" height="12" fill="#b9b2a2" /><rect x="-110" y="-24" width="220" height="12" fill="url(#brick)" opacity=".5" />
      <Hut x={-70} y={-24} s={1} roof="#c8921c" /><Hut x={-20} y={-26} s={1.1} roof="#b3262d" /><Hut x={34} y={-24} s={1} roof="#c8921c" />
      <Tower x={96} y={-8} h={64} roof="#b3262d" /><Tower x={-104} y={-8} h={52} roof="#c8921c" />
      <rect x="-80" y="40" width="170" height="8" fill="#8a5a2b" /><path d="M-70 40V58M-30 40V58M10 40V58M50 40V58M86 40V58" stroke="#6b4220" strokeWidth="4" />
      <rect x="-60" y="-8" width="14" height="12" fill="#a8742f" stroke="#6b4220" /><rect x="-42" y="-5" width="12" height="9" fill="#c9923c" stroke="#6b4220" />
      <Banner x={70} y={-70} c="#b3262d" h={20} s={0.9} /></g>;
    case 'risk': return <g>
      <Wall x1={-110} x2={110} y={-4} c="#cfc9d8" />
      <Tower x={-110} y={0} h={92} roof="#7b3fa8" c="#cfc9d8" /><Tower x={110} y={0} h={92} roof="#7b3fa8" c="#cfc9d8" />
      <rect x="-34" y="-110" width="68" height="106" fill="#d9d3e3" /><rect x="-34" y="-110" width="68" height="106" fill="url(#brick)" opacity=".5" />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={-34 + i * 14} y={-117} width="9" height="8" fill="#d9d3e3" />)}
      <path d="M-40-112 L0-146 L40-112Z" fill="#7b3fa8" /><Banner x={0} y={-146} c="#7b3fa8" c2="#e8c13f" h={24} />
      <path d="M-46-70 A12 12 0 0 1 -22-70" stroke="#2a1a3a" fill="#2a1a3a" /><rect x="-8" y="-68" width="16" height="22" rx="8" fill="#2a1a3a" />
      <path d="M-60-4 V-30 A14 14 0 0 1 -32-30 V-4Z" fill="#e8c13f" opacity=".9" /><text x="-46" y="-12" textAnchor="middle" fontSize="12" fontWeight="900" fill="#6b4a1e">$</text>
      <rect x="-82" y="-4" width="10" height="26" rx="4" fill="#c9c2d6" /><circle cx="-77" cy="-12" r="6" fill="#c9c2d6" /></g>;
    case 'scrap': return <g>
      <path d="M-120 0 L-100-50 L-70-60 L-60-20 L-30-70 L10-64 L24-24 L60-56 L100-40 L120 0Z" fill="#c68b4e" /><path d="M-100-50 L-70-60 L-60-20 L-90-6Z M-30-70 L10-64 L24-24 L-8-18Z" fill="#a6702f" opacity=".6" />
      <path d="M-34-10 V-46 L-24-52 L-20-40 V-10Z" fill="#d8c19a" /><Column x={30} y={0} h={30} c="#d8c19a" /><Column x={50} y={4} h={16} c="#cbb48a" />
      <g transform="translate(-60 6)"><circle r="18" fill="#7a746a" /><Gear x={-6} y={-4} r={10} c="#9b6b3a" /><Gear x={14} y={-2} r={7} c="#a8844e" /></g>
      <g transform="translate(84 8)"><rect x="-10" y="-34" width="20" height="30" rx="4" fill="#7d776b" /><rect x="-7" y="-46" width="14" height="12" rx="3" fill="#9a9488" /><circle cx="-2" cy="-41" r="2" fill="#ffb347" className="glow" /><path d="M10-28 L26-14" stroke="#7d776b" strokeWidth="5" /></g>
      <Rock x={-10} y={10} c="#b79868" /><Rock x={102} y={14} s={0.8} c="#b79868" />
      <Banner x={0} y={-64} c="#d9692b" c2="#7a2a14" h={22} /></g>;
    default: return null;
  }
}

// A kingdom on the world map: plaza, signature landmark, small entrance + guardian and a banner plate.
export default function KingdomRegion({ kingdom, status, selected, progress, onSelect, guardianActive, near }) {
  const { x, y } = kingdom.mapCenter;
  const locked = status === 'locked';
  const done = progress >= 6;
  const c = kingdom.colors;
  return (
    <g transform={`translate(${x} ${y})`} className={`kingdom-region ${locked ? 'is-locked' : ''} ${selected ? 'is-selected' : ''}`}
       onClick={() => onSelect(kingdom.id)} role="button" tabIndex={0} aria-label={`${kingdom.name}${locked ? ' (locked)' : ''}`}
       onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(kingdom.id)} style={{ cursor: 'pointer' }}>
      <ellipse cx="0" cy="14" rx="150" ry="74" fill="#000" opacity=".15" />
      <ellipse cx="0" cy="8" rx="146" ry="70" fill={kingdom.id === 'scrap' ? '#d8b676' : c.ground2} />
      <ellipse cx="0" cy="8" rx="146" ry="70" fill="none" stroke={selected ? '#ffd34d' : '#6b4a1e'} strokeWidth={selected ? 5 : 3} strokeDasharray={selected ? '10 6' : '0'} className={selected ? 'spin-slow' : ''} />
      <ellipse cx="0" cy="8" rx="132" ry="60" fill="url(#cobble)" opacity=".45" />
      <g className={locked ? 'locked-art' : ''}>
        <Landmark id={kingdom.id} />
        <KingdomEntrance kingdom={kingdom} x={0} y={100} scale={0.62} withGuardian level={1} active={guardianActive} />
      </g>
      {/* banner plate */}
      <g transform="translate(0 -118)">
        <path d="M-92 0 H92 V32 L80 40 L92 48 H-92 L-80 40 L-92 32Z" fill="#e9d6a6" stroke="#6b4a1e" strokeWidth="3" />
        <rect x="-92" y="0" width="12" height="48" fill={c.primary} /><rect x="80" y="0" width="12" height="48" fill={c.primary} />
        <text textAnchor="middle" y="21" fontSize="15" fontWeight="900" fill="#3a2410" fontFamily="Cinzel, serif">{kingdom.name.toUpperCase()}</text>
        <text textAnchor="middle" y="37" fontSize="11" fontStyle="italic" fill="#6b4a1e" fontFamily="'Crimson Text', serif">{kingdom.domain}</text>
      </g>
      {/* progress pips */}
      {!locked && <g transform="translate(-45 138)">{Array.from({ length: 6 }).map((_, i) => <circle key={i} cx={i * 18} cy="0" r="6" fill={i < progress ? '#e8c13f' : '#4a3a24'} stroke="#f3e6c2" strokeWidth="1.5" />)}</g>}
      {done && <g transform="translate(116 -90)"><circle r="15" fill="#e8c13f" stroke="#8a5a1a" strokeWidth="3" /><path d="M-6 0 l4 5 l8-10" stroke="#6b4a1e" strokeWidth="3.5" fill="none" strokeLinecap="round" /></g>}
      {locked && <g>
        <ellipse cx="0" cy="8" rx="146" ry="70" fill="#1d2230" opacity=".5" />
        <g transform="translate(0 20)"><circle r="26" fill="#3b3f4a" stroke="#c9ccd4" strokeWidth="3" /><rect x="-11" y="-3" width="22" height="18" rx="3" fill="#c9ccd4" /><path d="M-7-3 V-10 A7 7 0 0 1 7-10 V-3" stroke="#c9ccd4" strokeWidth="3.5" fill="none" /></g>
      </g>}
    </g>
  );
}
