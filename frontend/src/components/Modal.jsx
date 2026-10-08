import { useEffect, useRef } from 'react';
export default function Modal({ children, label, tone = '' }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="modal-overlay">
      <div className={`modal parchment ${tone}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref}>{children}</div>
    </div>
  );
}
export const Confetti = () => (<div className="confetti-rain" aria-hidden="true">{Array.from({ length: 36 }).map((_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.18}s`, background: ['#ffd34d', '#c9332f', '#4aa8e8', '#6bd66b', '#b57cf0'][i % 5] }} />)}</div>);
