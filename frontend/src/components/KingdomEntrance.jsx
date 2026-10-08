import { Banner, Torch, Tower, Wall } from './art.jsx';
import GuardianCharacter from './GuardianCharacter.jsx';

// Large stone gate with towers, wooden doors / drawbridge, banners and torches.
// Origin = base centre of the gateway. `open` swings the doors apart when the guardian is satisfied.
export default function KingdomEntrance({ kingdom, x = 0, y = 0, scale = 1, withGuardian = true, level = 1, guardianMood = 'idle', active = false, open = false, boss = false }) {
  const c = kingdom.colors;
  const stone = kingdom.id === 'scrap' ? '#c8a878' : kingdom.id === 'bio' ? '#e7e2d3' : '#b9b2a2';
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="entrance">
      <Wall x1={-120} x2={120} y={0} c={stone} />
      <Tower x={-92} y={4} h={78} c={stone} roof={c.primary} />
      <Tower x={92} y={4} h={78} c={stone} roof={c.primary} />
      <g>
        <rect x="-44" y="-70" width="88" height="70" fill={stone} />
        <rect x="-44" y="-70" width="88" height="70" fill="url(#brick)" opacity=".5" />
        <path d="M-30 0 V-34 A30 30 0 0 1 30 -34 V0Z" fill="#1b1410" />
        <g style={{ transition: 'transform .8s' }} transform={open ? 'translate(-26 0)' : ''}><path d="M-30 0 V-34 A30 30 0 0 1 0 -64 V0Z" fill="#7a4b24" /><path d="M-22 0 V-60 M-12 0 V-62" stroke="#4a2a12" strokeWidth="1.5" /><circle cx="-5" cy="-26" r="2" fill="#e8c13f" /></g>
        <g style={{ transition: 'transform .8s' }} transform={open ? 'translate(26 0)' : ''}><path d="M30 0 V-34 A30 30 0 0 0 0 -64 V0Z" fill="#86552a" /><path d="M22 0 V-60 M12 0 V-62" stroke="#4a2a12" strokeWidth="1.5" /><circle cx="5" cy="-26" r="2" fill="#e8c13f" /></g>
        <path d="M-30 -4 H30 M-30-14 H30" stroke="#3a2210" strokeWidth="2.5" opacity=".6" />
        <path d="M-34 0 V-35 A34 34 0 0 1 34 -35 V0" fill="none" stroke={stone} strokeWidth="5" />
        <rect x="-8" y="-84" width="16" height="16" rx="2" fill={c.primary} stroke="#e8c13f" strokeWidth="2" />
        <circle cx="0" cy="-76" r="4" fill="#fff" opacity=".85" />
      </g>
      <Banner x={-58} y={-10} c={c.primary} h={46} />
      <Banner x={58} y={-10} c={c.primary} h={46} />
      <Torch x={-38} y={-8} /><Torch x={38} y={-8} />
      <path d="M-26 0 H26 L38 26 H-38Z" fill="#8a5a2b" opacity=".95" />
      <path d="M-30 8 H30 M-34 17 H34" stroke="#5a3a1a" strokeWidth="1.5" />
      {withGuardian && <GuardianCharacter kind={kingdom.guardian.kind} level={level} mood={guardianMood} active={active} boss={boss} x={0} y={52} scale={0.75} />}
    </g>
  );
}
