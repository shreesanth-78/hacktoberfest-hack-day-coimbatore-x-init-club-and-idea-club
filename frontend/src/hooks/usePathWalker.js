// Moves a sprite along an array of {x,y} points with requestAnimationFrame interpolation.
import { useCallback, useEffect, useRef, useState } from 'react';

export function usePathWalker(start, speed = 170) {
  const [pos, setPos] = useState(start);
  const [facing, setFacing] = useState(1);
  const [walking, setWalking] = useState(false);
  const raf = useRef(0);
  const cancel = useRef(null);
  const posRef = useRef(start);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const walk = useCallback((points, spd = speed) => new Promise((resolve) => {
    cancelAnimationFrame(raf.current);
    cancel.current?.(false);
    if (!points?.length) { resolve(true); return; }
    cancel.current = resolve;
    const pts = [posRef.current, ...points];
    const seg = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(d); total += d; }
    if (total < 1) { resolve(true); return; }
    let t0 = null;
    setWalking(true);
    const step = (t) => {
      if (t0 === null) t0 = t;
      const dist = Math.min(total, ((t - t0) / 1000) * spd);
      let acc = 0, i = 0;
      while (i < seg.length - 1 && acc + seg[i] < dist) { acc += seg[i]; i++; }
      const f = seg[i] ? (dist - acc) / seg[i] : 1;
      const a = pts[i], b = pts[i + 1];
      const p = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
      if (Math.abs(b.x - a.x) > 0.5) setFacing(b.x >= a.x ? 1 : -1);
      posRef.current = p;
      setPos(p);
      if (dist < total) raf.current = requestAnimationFrame(step);
      else { setWalking(false); cancel.current = null; resolve(true); }
    };
    raf.current = requestAnimationFrame(step);
  }), [speed]);

  const teleport = useCallback((p) => { posRef.current = p; setPos(p); }, []);
  return { pos, facing, walking, walk, teleport };
}

// Catmull-Rom spline through control points → dense polyline. `marks[i]` = sample index of control point i.
export function spline(ctrl, per = 14) {
  const pts = [], marks = [];
  const P = (i) => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))];
  for (let i = 0; i < ctrl.length - 1; i++) {
    marks.push(pts.length);
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  marks.push(pts.length);
  pts.push(ctrl[ctrl.length - 1]);
  return { pts, marks };
}
export const toPathD = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
