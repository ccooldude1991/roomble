/*
 * Small vector helpers used by the scene and the AI. Pure and tested.
 */

export interface Vec {
  x: number;
  y: number;
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt(dist2(ax, ay, bx, by));
}

export function angleTo(fromX: number, fromY: number, toX: number, toY: number): number {
  return Math.atan2(toY - fromY, toX - fromX);
}

/** Unit vector for an angle (radians). */
export function fromAngle(a: number): Vec {
  return { x: Math.cos(a), y: Math.sin(a) };
}

/** Normalise (x,y); returns {0,0} for a zero vector. */
export function normalize(x: number, y: number): Vec {
  const m = Math.hypot(x, y);
  if (m === 0) return { x: 0, y: 0 };
  return { x: x / m, y: y / m };
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Circle/circle overlap test using squared distance (cheap). */
export function circlesOverlap(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  const r = ar + br;
  return dist2(ax, ay, bx, by) <= r * r;
}

/**
 * Lead a moving target: the angle to fire a projectile of `speed` so it meets a
 * target at (tx,ty) moving (tvx,tvy). Falls back to a straight aim if there's no
 * real solution. Used by Orbiters and the attract bot.
 */
export function leadAngle(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  tvx: number,
  tvy: number,
  speed: number,
): number {
  const dx = tx - sx;
  const dy = ty - sy;
  const a = tvx * tvx + tvy * tvy - speed * speed;
  const b = 2 * (dx * tvx + dy * tvy);
  const c = dx * dx + dy * dy;
  let t = 0;
  if (Math.abs(a) < 1e-6) {
    if (Math.abs(b) > 1e-6) t = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      const t1 = (-b - sq) / (2 * a);
      const t2 = (-b + sq) / (2 * a);
      t = Math.min(...[t1, t2].filter((v) => v > 0), Infinity);
      if (!isFinite(t)) t = Math.max(t1, t2, 0);
    }
  }
  if (t <= 0) return angleTo(sx, sy, tx, ty);
  return angleTo(sx, sy, tx + tvx * t, ty + tvy * t);
}

/** Shortest signed difference between two angles, in (-PI, PI]. */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
