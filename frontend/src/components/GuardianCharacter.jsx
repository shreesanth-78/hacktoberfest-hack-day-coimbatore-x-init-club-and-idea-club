import { Gear } from './art.jsx';
// Original guardian sprites (layered SVG). Origin (0,0) = feet. Base height ≈ 110 units.
const PAL = {
  hydro:  { body: '#b9803c', trim: '#f3d37a', cape: '#2b7fc4', skin: '#e3b184', head: 'helm' },
  onco:   { body: '#1f9d86', trim: '#bff5e6', cape: '#157564', skin: '#d9a77c', head: 'hood' },
  broker: { body: '#a8742f', trim: '#ffd95e', cape: '#b3262d', skin: '#e8b98a', head: 'helm' },
  ledger: { body: '#5b2f85', trim: '#e8c13f', cape: '#3f1f60', skin: '#e0b088', head: 'hat' },
};

function Prop({ kind, level }) {
  if (level === 2 && kind !== 'onco') {
    return <g transform="translate(-26 -52)"><rect x="-4" y="-6" width="9" height="28" rx="3" fill="#f3e6c2" stroke="#9a7b3c" /><rect x="-6" y="-8" width="13" height="4" rx="2" fill="#8a5a2b" /><rect x="-6" y="20" width="13" height="4" rx="2" fill="#8a5a2b" /></g>;
  }
  return null;
}

function WeaponFor({ kind }) {
  switch (kind) {
    case 'hydro': return <g transform="translate(30 -4)"><rect x="-1.8" y="-104" width="3.6" height="104" fill="#7a4b24" /><path d="M-9-98 V-114 M0-98 V-120 M9-98 V-114 M-9-98 H9" stroke="#e9c75d" strokeWidth="3.4" strokeLinecap="round" fill="none" /><path d="M-9-114 l-3-4 M9-114 l3-4" stroke="#e9c75d" strokeWidth="2.4" /></g>;
    case 'onco': return <g transform="translate(28 -46) rotate(12)"><rect x="-5" y="-9" width="10" height="30" rx="4" fill="#f6ebc8" stroke="#9a7b3c" /><rect x="-7" y="-12" width="14" height="5" rx="2.5" fill="#8a5a2b" /><rect x="-7" y="17" width="14" height="5" rx="2.5" fill="#8a5a2b" /><path d="M-2 -2h4M-2 3h4M-2 8h4" stroke="#9a7b3c" /></g>;
    case 'broker': return <g transform="translate(28 -42) rotate(-8)"><rect x="-11" y="-14" width="22" height="28" rx="2" fill="#6b3a1a" /><rect x="-9" y="-12" width="18" height="24" fill="#f3e6c2" /><path d="M-6-6h12M-6-1h12M-6 4h12" stroke="#8a6a3a" /><rect x="-11" y="-14" width="4" height="28" fill="#4a2410" /></g>;
    case 'ledger': return <g transform="translate(30 -50)"><path d="M0-40 V10" stroke="#e8c13f" strokeWidth="3" /><path d="M-18-30 H18" stroke="#e8c13f" strokeWidth="3" /><path d="M-18-30 L-24-12 H-12Z M18-30 L12-12 H24Z" fill="#e8c13f" opacity=".9" /><circle cx="0" cy="-42" r="4" fill="#f5d76e" /><rect x="-8" y="10" width="16" height="4" fill="#8a5a2b" /></g>;
    default: return null;
  }
}

function Humanoid({ kind, level, mood }) {
  const p = PAL[kind];
  const eyes = mood === 'defeated' ? <><path d="M-5-70 l3 2 M3-68 l3-2" stroke="#2a1a10" strokeWidth="1.6" /></> : <><circle cx="-3.5" cy="-69" r="1.5" fill="#2a1a10" /><circle cx="3.5" cy="-69" r="1.5" fill="#2a1a10" /></>;
  const mouth = mood === 'happy' || level === 1 ? <path d="M-4-62 Q0-58 4-62" stroke="#7a2e1a" strokeWidth="1.8" fill="none" /> : mood === 'defeated' ? <path d="M-3-60 Q0-63 3-60" stroke="#7a2e1a" strokeWidth="1.8" fill="none" /> : <path d="M-3-61 H3" stroke="#7a2e1a" strokeWidth="1.8" />;
  return (
    <g>
      <path d="M-18-78 Q-34-40 -22 0 L22 0 Q34-40 18-78Z" fill={p.cape} />
      <rect x="-9" y="-32" width="7.5" height="32" rx="3" fill="#3b2a1a" /><rect x="1.5" y="-32" width="7.5" height="32" rx="3" fill="#4a3520" />
      <rect x="-11" y="-4" width="10" height="5" rx="2" fill="#2a1a10" /><rect x="1" y="-4" width="10" height="5" rx="2" fill="#2a1a10" />
      <path d="M-17-56 Q-19-34 -14-30 H14 Q19-34 17-56 Q0-62 -17-56Z" fill={p.body} />
      <rect x="-15" y="-38" width="30" height="5" fill={p.trim} />
      <path d="M-14-54 Q0-47 14-54" stroke={p.trim} strokeWidth="2.4" fill="none" />
      <circle cx="-18" cy="-54" r="6" fill={p.trim} /><circle cx="18" cy="-54" r="6" fill={p.trim} />
      <rect x="-24" y="-54" width="7" height="22" rx="3.5" fill={p.body} /><rect x="17" y="-54" width="7" height="22" rx="3.5" fill={p.body} />
      <g className={level === 1 ? 'wave' : ''}><circle cx="21" cy="-30" r="4" fill={p.skin} /></g><circle cx="-21" cy="-30" r="4" fill={p.skin} />
      <circle cx="0" cy="-67" r="12" fill={p.skin} />
      {p.head === 'helm' && <><path d="M-13-68 Q-13-84 0-84 Q13-84 13-68 L9-70 H-9Z" fill={p.body} stroke={p.trim} /><path d="M0-84 Q-4-96 6-98 Q2-90 4-84Z" fill={kind === 'hydro' ? '#2b7fc4' : '#b3262d'} /><rect x="-1.5" y="-84" width="3" height="14" fill={p.trim} /></>}
      {p.head === 'hood' && <><path d="M-15-62 Q-17-86 0-86 Q17-86 15-62 Q9-72 0-72 Q-9-72 -15-62Z" fill={p.cape} /><path d="M-8-72 Q0-77 8-72" stroke={p.trim} fill="none" /></>}
      {p.head === 'hat' && <><path d="M-16-76 H16 L11-92 H-11Z" fill={p.cape} /><rect x="-17" y="-78" width="34" height="4" fill={p.trim} /></>}
      {eyes}{mouth}
      {level === 5 && <g stroke="#3a2a1a" fill="#cfe9ff" fillOpacity=".5"><circle cx="-4" cy="-69" r="4" /><circle cx="4" cy="-69" r="4" /><path d="M-0.5-69h1" /></g>}
      {level === 3 && <g transform="translate(-30 -34)"><path d="M0-22 L16-16 V0 Q16 14 0 22 Q-16 14 -16 0 V-16Z" fill="#c9332f" stroke="#e8c13f" strokeWidth="2.5" /><path d="M0-12 L7-6 L0 8 L-7-6Z" fill="#e8c13f" /></g>}
      {level === 5 && <g transform="translate(-26 -40) rotate(-20)"><path d="M0 0 Q4-16 14-26 Q6-12 4 0Z" fill="#f4efe0" stroke="#8a6a3a" /></g>}
      {level === 4 && <g transform="translate(-28 -88)"><g className="float"><path d="M0 8 H12 L10 0 Q14-4 8-8 Q12-14 6-14 Q0-14 4-8 Q-2-4 2 0Z" fill="#f2c94c" stroke="#8a5a1a" /></g></g>}
      <Prop kind={kind} level={level} />
      <WeaponFor kind={kind} />
    </g>
  );
}

function Reclaimer({ level, mood }) {
  const eye = mood === 'defeated' ? '#6b6b6b' : '#ffb347';
  return (
    <g>
      <rect x="-22" y="-34" width="16" height="34" rx="3" fill="#6f6a60" /><rect x="6" y="-34" width="16" height="34" rx="3" fill="#7d776b" />
      <rect x="-26" y="-6" width="22" height="7" rx="2" fill="#3f3b34" /><rect x="4" y="-6" width="22" height="7" rx="2" fill="#3f3b34" />
      <path d="M-32-92 H32 L28-34 H-28Z" fill="#8f897c" /><path d="M-32-92 H-10 L-14-34 H-28Z" fill="#000" opacity=".12" />
      <rect x="-30" y="-52" width="60" height="8" fill="#b4531f" /><path d="M-24-80 H24 M-24-66 H24" stroke="#4a4338" strokeWidth="2" />
      {[-24, -8, 8, 24].map((x) => <circle key={x} cx={x} cy="-48" r="2.2" fill="#e9c37a" />)}
      <circle cx="0" cy="-70" r="9" fill="#d9692b" className="glow" />
      <rect x="-44" y="-90" width="16" height="48" rx="4" fill="#7d776b" /><rect x="28" y="-90" width="16" height="48" rx="4" fill="#6f6a60" />
      <circle cx="-36" cy="-38" r="9" fill="#4a4338" /><circle cx="36" cy="-38" r="9" fill="#4a4338" />
      <rect x="-18" y="-116" width="36" height="28" rx="5" fill="#9a9488" />
      <path d="M-18-116 L-24-126 M18-116 L24-126" stroke="#4a4338" strokeWidth="4" />
      <rect x="-12" y="-108" width="24" height="7" rx="3" fill="#2a2620" />
      <circle cx="-6" cy="-105" r="3" fill={eye} className="glow" /><circle cx="6" cy="-105" r="3" fill={eye} className="glow" />
      <path d="M-8-94 H8" stroke="#4a4338" strokeWidth="3" />
      <g transform="translate(52 -60)"><Gear x={0} y={0} r={11} c="#a7835a" spin={mood !== 'defeated'} /></g>
      {level === 3 && <g transform="translate(-56 -40)"><path d="M0-22 L16-16 V0 Q16 14 0 22 Q-16 14 -16 0 V-16Z" fill="#c9332f" stroke="#e8c13f" strokeWidth="2.5" /></g>}
    </g>
  );
}

export default function GuardianCharacter({ kind = 'hydro', level = 1, mood = 'idle', boss = false, scale = 1, x = 0, y = 0, active = false, flip = false }) {
  const s = scale * (boss ? 1.45 : 1);
  return (
    <g transform={`translate(${x} ${y})`} className={`guardian ${active ? 'active' : ''}`}>
      {boss && <g><circle cx="0" cy={-70 * s} r={95 * s} fill="url(#glowPurple)" className="pulse" /></g>}
      <ellipse cx="0" cy="3" rx={26 * s} ry={6 * s} fill="#000" opacity=".3" />
      <g transform={`scale(${(flip ? -1 : 1) * s} ${s})`}>
        <g className={`guardian-body ${mood}`}>
          {kind === 'reclaimer' ? <Reclaimer level={level} mood={mood} /> : <Humanoid kind={kind} level={level} mood={mood} />}
          {boss && <g><path d="M-14-100 L-14-114 L-7-106 L0-118 L7-106 L14-114 L14-100Z" fill="#f5c542" stroke="#8a5a1a" strokeWidth="1.5" transform={`translate(0 ${kind === 'reclaimer' ? -24 : kind === 'ledger' ? 6 : 14})`} /></g>}
        </g>
      </g>
      {active && <g transform={`translate(0 ${-130 * s})`}><path className="bounce" d="M-7 0 L0 9 L7 0Z" fill="#ffd34d" stroke="#8a5a1a" /></g>}
    </g>
  );
}
