/*
 * Attract-bot and targeting helpers. Pure where it matters so the "kite and shoot"
 * logic can be tested; the scene calls these each frame in attract mode.
 */
import { angleTo, dist2, normalize, type Vec } from './geometry';

export interface Pt {
  x: number;
  y: number;
}

/** Index of the nearest point to (x,y), or -1 if there are none. */
export function nearestIndex(x: number, y: number, points: Pt[]): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = dist2(x, y, points[i]!.x, points[i]!.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Aim angle at the nearest point, or a default angle if there are none. */
export function aimAtNearest(x: number, y: number, points: Pt[], fallback = 0): number {
  const i = nearestIndex(x, y, points);
  if (i < 0) return fallback;
  return angleTo(x, y, points[i]!.x, points[i]!.y);
}

/**
 * Bot movement: circle-strafe around the arena centre while pushing away from the
 * nearest threat. Returns a unit-ish velocity direction. Pure so it's testable.
 */
export function kiteDir(
  px: number,
  py: number,
  threats: Pt[],
  arenaW: number,
  arenaH: number,
): Vec {
  const cx = arenaW / 2;
  const cy = arenaH / 2;
  // Tangential component: circle around the centre.
  const toC = normalize(cx - px, cy - py);
  let vx = -toC.y;
  let vy = toC.x;

  // Repulsion from the nearest threat.
  const i = nearestIndex(px, py, threats);
  if (i >= 0) {
    const away = normalize(px - threats[i]!.x, py - threats[i]!.y);
    vx += away.x * 1.3;
    vy += away.y * 1.3;
  }

  // Gentle pull back toward centre if drifting to the edge.
  const edge = normalize(cx - px, cy - py);
  vx += edge.x * 0.25;
  vy += edge.y * 0.25;

  return normalize(vx, vy);
}
