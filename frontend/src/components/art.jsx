// Small reusable SVG scenery pieces (all original, drawn in code — no external assets).
import { useMemo } from 'react';

export const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5 >>> 0) / 4294967296); };

export const Tree = ({ x, y, s = 1, tone = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="0" cy="2" rx="14" ry="5" fill="#000" opacity=".18" />
    <g className="sway">
    <rect x="-3" y="-10" width="6" height="12" rx="2" fill="#7a4b24" />
    <circle cx="0" cy="-24" r="16" fill={['#2f7d3c', '#3b8f45', '#2a6e44'][tone % 3]} />
    <circle cx="-8" cy="-17" r="11" fill={['#3b8f45', '#49a352', '#34805a'][tone % 3]} />
    <circle cx="8" cy="-19" r="11" fill={['#46a04d', '#56b25c', '#3f9068'][tone % 3]} />
    <circle cx="-4" cy="-30" r="6" fill="#79c76a" opacity=".6" />
    </g>
  </g>
);
export const Pine = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="0" cy="2" rx="11" ry="4" fill="#000" opacity=".18" />
    <rect x="-2.5" y="-6" width="5" height="9" fill="#6b4220" />
    <path d="M0-48 L-13-16 H13Z" fill="#256b45" /><path d="M0-38 L-16-6 H16Z" fill="#2f8052" /><path d="M0-30 L-18 0 H18Z" fill="#3a925d" />
  </g>
);
export const Bush = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}><ellipse cx="0" cy="2" rx="12" ry="4" fill="#000" opacity=".15" />
    <circle cx="-6" cy="-4" r="7" fill="#4a9a4c" /><circle cx="5" cy="-5" r="8" fill="#5bb05a" /><circle cx="0" cy="-9" r="6" fill="#6cc468" /></g>
);
export const Rock = ({ x, y, s = 1, c = '#8d8f94' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}><ellipse cx="0" cy="3" rx="13" ry="4" fill="#000" opacity=".18" />
    <path d="M-12 2 L-8-10 L2-13 L12-5 L13 2Z" fill={c} /><path d="M-8-10 L2-13 L0-4 L-12 2Z" fill="#fff" opacity=".18" /></g>
);
export const Flower = ({ x, y, c = '#f4d03f' }) => (<g transform={`translate(${x} ${y})`}><circle r="2.6" fill={c} /><circle r="1" fill="#c0392b" /></g>);
export const Mountain = ({ x, y, s = 1, snow = true, c = '#8a8f9c', c2 = '#6d7280' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="0" cy="4" rx="70" ry="10" fill="#000" opacity=".15" />
    <path d="M-70 0 L-18-86 L12-50 L30-70 L72 0Z" fill={c} />
    <path d="M-18-86 L12-50 L-6 0 L-70 0Z" fill={c2} opacity=".55" />
    {snow && <path d="M-18-86 L-30-62 L-20-66 L-12-56 L-4-66 L12-50 Z" fill="#f3f6fa" />}
    {snow && <path d="M30-70 L22-54 L30-58 L38-52Z" fill="#f3f6fa" />}
  </g>
);
export const Cloud = ({ x, y, s = 1, d = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}><g className="drift" style={{ animationDelay: `${d}s` }} opacity=".85" fill="#fff">
    <ellipse cx="0" cy="0" rx="40" ry="12" /><circle cx="-14" cy="-8" r="14" /><circle cx="12" cy="-12" r="17" /></g></g>
);
export const Banner = ({ x, y, c = '#b3262d', c2 = '#e8c13f', s = 1, h = 40 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-1.5" y={-h} width="3" height={h} fill="#6b4a1e" /><circle cx="0" cy={-h} r="3" fill="#d9a520" />
    <path className="flag" d={`M1.5 ${-h + 3} h22 l-6 8 l6 8 h-22Z`} fill={c} stroke={c2} strokeWidth="1.2" />
  </g>
);
export const Torch = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}><rect x="-1.5" y="-12" width="3" height="14" fill="#5b3a1a" />
    <g className="flicker"><path d="M0-30 C-8-20 -6-14 0-12 C6-14 8-20 0-30Z" fill="#ff9a1f" /><path d="M0-25 C-4-19 -3-15 0-14 C3-15 4-19 0-25Z" fill="#ffe27a" /></g></g>
);
export const Tower = ({ x, y, s = 1, c = '#b9b2a2', roof = '#b3262d', h = 70, w = 26, flag = true }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="0" cy="3" rx={w * 0.8} ry="5" fill="#000" opacity=".2" />
    <rect x={-w / 2} y={-h} width={w} height={h} fill={c} />
    <rect x={w / 2 - 7} y={-h} width="7" height={h} fill="#000" opacity=".12" />
    {[...Array(4)].map((_, i) => <rect key={i} x={-w / 2 + (w / 4) * i + 1} y={-h - 5} width={w / 4 - 2} height="6" fill={c} />)}
    <rect x="-3" y={-h * 0.65} width="6" height="12" rx="3" fill="#2b2b3a" />
    <path d={`M${-w / 2 - 3} ${-h - 4} L0 ${-h - 28} L${w / 2 + 3} ${-h - 4}Z`} fill={roof} />
    {flag && <Banner x={0} y={-h - 26} h={16} s={0.9} />}
    {[...Array(Math.floor(h / 14))].map((_, i) => <line key={i} x1={-w / 2} x2={w / 2} y1={-i * 14 - 10} y2={-i * 14 - 10} stroke="#000" opacity=".08" />)}
  </g>
);
export const Wall = ({ x1, x2, y, c = '#b9b2a2' }) => (
  <g><rect x={x1} y={y - 22} width={x2 - x1} height="22" fill={c} />
    {Array.from({ length: Math.floor((x2 - x1) / 14) }).map((_, i) => <rect key={i} x={x1 + i * 14 + 2} y={y - 28} width="9" height="7" fill={c} />)}
    <rect x={x1} y={y - 22} width={x2 - x1} height="22" fill="url(#brick)" opacity=".5" /></g>
);
export const Hut = ({ x, y, s = 1, roof = '#a5532b' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}><ellipse cx="0" cy="3" rx="22" ry="5" fill="#000" opacity=".18" />
    <rect x="-16" y="-20" width="32" height="22" fill="#d9c294" /><rect x="-16" y="-20" width="32" height="22" fill="url(#brick)" opacity=".4" />
    <path d="M-22-18 L0-40 L22-18Z" fill={roof} /><rect x="-4" y="-12" width="8" height="14" rx="3" fill="#6b4220" /></g>
);
export const Ship = ({ x, y, s = 1, sail = '#f4ead0' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}><g className="bob">
    <path d="M-26 0 H26 L18 12 H-18Z" fill="#7a4a22" /><rect x="-1.5" y="-38" width="3" height="40" fill="#5b3a1a" />
    <path d="M2-36 Q24-22 2-6Z" fill={sail} stroke="#c9b27a" /><path d="M-2-32 Q-18-20 -2-8Z" fill={sail} stroke="#c9b27a" />
    <path d="M2-38 l10 3 l-10 3Z" fill="#b3262d" /></g></g>
);
export const Arches = ({ x, y, n = 5, w = 34, h = 56, c = '#cfc5ab', water = true }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="0" y={-h - 12} width={n * w} height="12" fill={c} />
    {water && <rect x="2" y={-h - 18} width={n * w - 4} height="7" rx="3" fill="#4aa8e8" />}
    {water && <rect className="water" x="2" y={-h - 18} width={n * w - 4} height="7" rx="3" fill="url(#waterShine)" />}
    {Array.from({ length: n }).map((_, i) => (<g key={i}><rect x={i * w} y={-h} width="8" height={h} fill={c} /><path d={`M${i * w + 8} 0 V${-h * 0.5} A${(w - 8) / 2} ${(w - 8) / 2} 0 0 1 ${(i + 1) * w} ${-h * 0.5} V0Z`} fill="#7ab6d8" opacity=".35" /></g>))}
    <rect x={n * w} y={-h} width="8" height={h} fill={c} /><rect x="0" y={-h - 12} width={n * w + 8} height="12" fill="#000" opacity=".08" />
  </g>
);
export const Column = ({ x, y, h = 50, c = '#f2eee3' }) => (
  <g transform={`translate(${x} ${y})`}><rect x="-6" y={-h} width="12" height={h} fill={c} /><rect x="-9" y={-h - 4} width="18" height="5" fill={c} /><rect x="-9" y="-3" width="18" height="4" fill={c} />
    <rect x="1" y={-h} width="5" height={h} fill="#000" opacity=".08" /></g>
);
export const Crystal = ({ x, y, s = 1, c = '#5ff0d0' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} className="glow"><path d="M0 0 L-6-18 L0-30 L6-18Z" fill={c} /><path d="M0 0 L-6-18 L0-30Z" fill="#fff" opacity=".35" />
    <path d="M8 0 L5-10 L9-18 L13-10Z" fill={c} opacity=".8" /></g>
);
export const Gear = ({ x, y, r = 14, c = '#8a6a4a', spin = true }) => (
  <g transform={`translate(${x} ${y})`}><g className={spin ? 'spin' : ''}>
    {Array.from({ length: 8 }).map((_, i) => <rect key={i} x={-3} y={-r - 3} width="6" height="8" fill={c} transform={`rotate(${i * 45})`} />)}
    <circle r={r} fill={c} /><circle r={r * 0.4} fill="#3a2a1a" /></g></g>
);
export const Sparkles = ({ n = 14, seed = 3, w = 200, h = 120, c = '#ffe27a' }) => {
  const pts = useMemo(() => { const r = rng(seed); return Array.from({ length: n }, () => [r() * w, r() * h, r() * 2]); }, [n, seed, w, h]);
  return <g>{pts.map(([x, y, d], i) => <circle key={i} className="twinkle" cx={x} cy={y} r="2" fill={c} style={{ animationDelay: `${d}s` }} />)}</g>;
};

// Shared gradients / patterns for every SVG scene.
export const SharedDefs = () => (
  <defs>
    <pattern id="brick" width="14" height="10" patternUnits="userSpaceOnUse"><path d="M0 0H14M0 5H14M7 0V5M0 5V10M14 5V10" stroke="#000" strokeOpacity=".18" fill="none" /></pattern>
    <pattern id="cobble" width="16" height="12" patternUnits="userSpaceOnUse"><path d="M0 6H16M8 0V6M0 6V12M16 6V12" stroke="#7a6a50" strokeOpacity=".5" fill="none" /></pattern>
    <linearGradient id="waterShine" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
    <radialGradient id="vignette" cx=".5" cy=".5" r=".75"><stop offset=".6" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#2a1608" stopOpacity=".35" /></radialGradient>
    <radialGradient id="glowGold"><stop offset="0" stopColor="#fff2b0" stopOpacity=".9" /><stop offset="1" stopColor="#ffd34d" stopOpacity="0" /></radialGradient>
    <radialGradient id="glowPurple"><stop offset="0" stopColor="#e2b8ff" stopOpacity=".9" /><stop offset="1" stopColor="#8a3fd6" stopOpacity="0" /></radialGradient>
  </defs>
);
