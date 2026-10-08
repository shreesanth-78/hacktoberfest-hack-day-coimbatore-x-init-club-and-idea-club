// Original young-messenger sprite built from layered SVG shapes. Walk cycle = CSS leg swing + body bob.
export default function PlayerCharacter({ x, y, facing = 1, walking = false, celebrating = false, scale = 1 }) {
  return (
    <g className="player" transform={`translate(${x} ${y})`} style={{ pointerEvents: 'none' }}>
      <ellipse cx="0" cy="2" rx="11" ry="4" fill="#000" opacity=".3" />
      <g transform={`scale(${facing * scale} ${scale})`}>
        <g className={`player-body ${walking ? 'walking' : ''} ${celebrating ? 'cheer' : ''}`}>
          <g className="leg l1"><rect x="-5" y="-12" width="4.5" height="12" rx="2" fill="#5b3a1a" /><rect x="-6" y="-2" width="7" height="3.5" rx="1.5" fill="#3b2410" /></g>
          <g className="leg l2"><rect x="1" y="-12" width="4.5" height="12" rx="2" fill="#6b4725" /><rect x="0" y="-2" width="7" height="3.5" rx="1.5" fill="#3b2410" /></g>
          <path className="cape" d="M-7-34 Q-17-18 -12-8 L-3-14Z" fill="#b3262d" />
          <rect x="-7" y="-28" width="14" height="18" rx="5" fill="#2f6fb5" />
          <rect x="-7" y="-17" width="14" height="3.5" fill="#d9a520" />
          <g className="arm"><rect x="4" y="-27" width="4.5" height="12" rx="2.2" fill="#e8b98a" /></g>
          <circle cx="0" cy="-37" r="8" fill="#f1c9a0" />
          <path d="M-8.5-38 Q-6-48 2-46 Q9-45 8.5-37 Q4-42 -2-40Z" fill="#7a3e1a" />
          <path d="M-9-39 L9-39 L7-44 Q0-50 -7-44Z" fill="#9aa3b0" />
          <path d="M0-50 L0-44" stroke="#b3262d" strokeWidth="3" />
          <circle cx="3.5" cy="-37" r="1.2" fill="#2a1a10" />
          <path d="M8-27 L8-14" stroke="#d9a520" strokeWidth="1.6" />
        </g>
      </g>
      {celebrating && <g className="confetti">{[-14, -6, 6, 14].map((dx, i) => <circle key={i} cx={dx} cy={-52} r="2.5" fill={['#ffd34d', '#ff6b6b', '#6bd6ff', '#9bff6b'][i]} style={{ animationDelay: `${i * 0.12}s` }} />)}</g>}
    </g>
  );
}
