import { toPathD } from '../hooks/usePathWalker.js';

// Winding stone road. `litUntil` = sample index up to which the road is "travelled" (gold-lit); the rest stays dim/fogged.
export default function StonePath({ pts, litUntil = 0, width = 22, bridges = [] }) {
  const d = toPathD(pts);
  const lit = toPathD(pts.slice(0, Math.max(2, litUntil + 1)));
  return (
    <g className="stone-path">
      <path d={d} fill="none" stroke="#5b4222" strokeWidth={width + 8} strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
      <path d={d} fill="none" stroke="#b79a6a" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#d8c08c" strokeWidth={width - 8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 9" />
      <path d={d} fill="none" stroke="#8a6c3c" strokeWidth="2" strokeDasharray="3 14" opacity=".6" transform="translate(0 4)" />
      <path d={lit} fill="none" stroke="#ffd34d" strokeWidth={width - 14} strokeLinecap="round" strokeLinejoin="round" opacity=".55" className="path-lit" />
      {bridges.map((b, i) => (
        <g key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.r || 0})`}>
          <rect x="-34" y="-18" width="68" height="36" rx="4" fill="#9a9488" stroke="#5a5448" strokeWidth="3" /><rect x="-34" y="-18" width="68" height="36" fill="url(#brick)" opacity=".7" />
          <rect x="-34" y="-18" width="68" height="5" fill="#5a5448" /><rect x="-34" y="13" width="68" height="5" fill="#5a5448" />
        </g>
      ))}
    </g>
  );
}
