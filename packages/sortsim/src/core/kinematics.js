// Copied from github.com/Mike17K/recycleiq-delta-sort (src/core/kinematics.js); see NOTICE.
/** Delta-robot kinematics (Clavel): inverse kinematics, joint poses and reach. Base frame, z negative below the base. */
const SQRT3 = Math.sqrt(3), SIN120 = SQRT3 / 2, COS120 = -0.5, TAN30 = 1 / SQRT3;

export const DEFAULT_DELTA = {
  f: 0.34, e: 0.10,          // base / effector triangle side (m)
  rf: 0.55, re: 1.10,        // upper arm / forearm length (m)
  zPick: -0.85,              // effector height at pick, relative to the base (m)
  limit: [-45, 90],          // shoulder angle limits (deg)
};

/** Shoulder angle (deg) of one arm in its own YZ plane; null if the point is out of reach. */
function angleYZ(x0, y0, z0, P) {
  const y1 = -0.5 * TAN30 * P.f;
  y0 -= 0.5 * TAN30 * P.e;
  const a = (x0 * x0 + y0 * y0 + z0 * z0 + P.rf * P.rf - P.re * P.re - y1 * y1) / (2 * z0);
  const b = (y1 - y0) / z0;
  const d = -(a + b * y1) * (a + b * y1) + P.rf * (b * b * P.rf + P.rf);
  if (d < 0) return null;
  const yj = (y1 - a * b - Math.sqrt(d)) / (b * b + 1);
  const zj = a + b * yj;
  return (180 * Math.atan(-zj / (y1 - yj))) / Math.PI + (yj > y1 ? 180 : 0);
}

/** Joint angles (deg) [t1,t2,t3] for the effector at (x,y,z); null if unreachable. */
export function ik(x, y, z, P) {
  const t1 = angleYZ(x, y, z, P); if (t1 === null) return null;
  const t2 = angleYZ(x * COS120 + y * SIN120, y * COS120 - x * SIN120, z, P); if (t2 === null) return null;
  const t3 = angleYZ(x * COS120 - y * SIN120, y * COS120 + x * SIN120, z, P); if (t3 === null) return null;
  return [t1, t2, t3];
}

/** Solved geometry for rendering: per arm { theta, shoulder, elbow, wrist } in the base frame. null if unreachable. */
export function deltaPose(x, y, z, P) {
  const arms = [];
  for (let k = 0; k < 3; k++) {
    const phi = (k * 2 * Math.PI) / 3, c = Math.cos(phi), s = Math.sin(phi);
    const lx = x * c + y * s, ly = -x * s + y * c;          // effector in this arm's frame
    const theta = angleYZ(lx, ly, z, P);
    if (theta === null) return null;
    const r = (theta * Math.PI) / 180, y1 = -0.5 * TAN30 * P.f;
    const toBase = (px, py, pz) => ({ x: px * c - py * s, y: px * s + py * c, z: pz });
    arms.push({
      theta,
      shoulder: toBase(0, y1, 0),
      elbow: toBase(0, y1 - P.rf * Math.cos(r), -P.rf * Math.sin(r)),
      wrist: toBase(lx, ly - 0.5 * TAN30 * P.e, z),
    });
  }
  return arms;
}

export function isReachable(x, y, z, P) {
  const t = ik(x, y, z, P);
  return !!t && t.every(a => a >= P.limit[0] && a <= P.limit[1]);
}

/** Largest radius, at height z, that is reachable in every direction. */
export function reachRadius(P, z = P.zPick) {
  let min = Infinity;
  for (let k = 0; k < 24; k++) {
    const th = (k / 24) * 2 * Math.PI, c = Math.cos(th), s = Math.sin(th);
    let lo = 0, hi = 2;
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      if (isReachable(m * c, m * s, z, P)) lo = m; else hi = m;
    }
    min = Math.min(min, lo);
  }
  return min;
}
