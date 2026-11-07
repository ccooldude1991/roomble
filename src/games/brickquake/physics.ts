/*
 * Ball physics helpers (pure, unit-tested):
 *  - paddle-angle control: exit angle comes from WHERE the ball hits the paddle,
 *    not a mirror bounce, clamped so it never goes near-horizontal;
 *  - a minimum vertical speed so the ball can never get stuck in a flat loop;
 *  - substep counting so a fast ball can't tunnel through a brick.
 */
import { PADDLE_MAX_ANGLE, MIN_VY, SUBSTEP_MAX } from './config';

export interface Vel {
  vx: number;
  vy: number;
}

/** Ball always leaves the paddle heading up; `offset` in [-1,1] sets the angle. */
export function paddleBounce(offset: number, speed: number): Vel {
  const o = Math.max(-1, Math.min(1, offset));
  const angle = o * PADDLE_MAX_ANGLE; // 0 = straight up
  return { vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed };
}

/** Guarantee |vy| >= minVy while preserving overall speed. */
export function enforceMinVy(v: Vel, minVy = MIN_VY): Vel {
  if (Math.abs(v.vy) >= minVy) return v;
  const speed = Math.hypot(v.vx, v.vy) || minVy;
  const dir = v.vy < 0 ? -1 : 1;
  const vy = dir * Math.min(speed, minVy);
  const vxMag = Math.sqrt(Math.max(0, speed * speed - vy * vy));
  const vx = (v.vx < 0 ? -1 : 1) * vxMag;
  return { vx, vy };
}

export function speedOf(v: Vel): number {
  return Math.hypot(v.vx, v.vy);
}

export function clampSpeed(v: Vel, max: number): Vel {
  const s = speedOf(v);
  if (s <= max) return v;
  const k = max / s;
  return { vx: v.vx * k, vy: v.vy * k };
}

/** Number of collision substeps to move `speed*dt` pixels without tunnelling. */
export function substepCount(speed: number, dt: number, maxStep = SUBSTEP_MAX): number {
  return Math.max(1, Math.ceil((speed * dt) / maxStep));
}
