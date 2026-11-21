// Copied from github.com/Mike17K/recycleiq-delta-sort (src/core/motion.js); see NOTICE.
/** Planar helpers and the trapezoidal speed profile shared by the scheduler and the animation. */
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a, b, s) => ({ x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s });

/** Trapezoidal profile over distance d. Returns { T: total time, s(t): fraction of d covered at time t }. */
export function trapezoid(d, vmax, amax) {
  if (d < 1e-9) return { T: 0, s: () => 1 };
  const ta = vmax / amax, da = (vmax * vmax) / amax;      // accel time, accel+decel distance
  if (d >= da) {
    const T = d / vmax + ta;
    return {
      T,
      s(t) {
        if (t <= 0) return 0;
        if (t >= T) return 1;
        let x;
        if (t < ta) x = 0.5 * amax * t * t;
        else if (t < T - ta) x = 0.5 * amax * ta * ta + vmax * (t - ta);
        else x = d - 0.5 * amax * (T - t) * (T - t);
        return x / d;
      },
    };
  }
  const tp = Math.sqrt(d / amax), T = 2 * tp;               // triangular: never reaches vmax
  return {
    T,
    s(t) {
      if (t <= 0) return 0;
      if (t >= T) return 1;
      return (t < tp ? 0.5 * amax * t * t : d - 0.5 * amax * (T - t) * (T - t)) / d;
    },
  };
}

/** Profile between two points for a motion config { vmax, amax }. */
export const profileBetween = (a, b, motion) => trapezoid(dist(a, b), motion.vmax, motion.amax);
export const moveTime = (a, b, motion) => profileBetween(a, b, motion).T;
