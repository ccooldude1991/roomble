/*
 * Attract bot: predict where the ball will cross the paddle line (unfolding wall
 * bounces), so the paddle can track it with a little lag and miss occasionally.
 * Pure.
 */
import { LOGICAL_W, BALL_R } from './config';

/** X position where a ball at (bx,by) with velocity (vx,vy) reaches `targetY`. */
export function predictLandingX(
  bx: number,
  by: number,
  vx: number,
  vy: number,
  targetY: number,
  width = LOGICAL_W,
): number {
  if (vy <= 0) return bx; // moving up: just hover near current x
  const t = (targetY - by) / vy;
  let x = bx + vx * t;
  // Reflect into [BALL_R, width - BALL_R] (triangle-wave unfolding).
  const lo = BALL_R;
  const hi = width - BALL_R;
  const span = hi - lo;
  if (span <= 0) return bx;
  let m = (x - lo) % (2 * span);
  if (m < 0) m += 2 * span;
  x = m <= span ? lo + m : lo + (2 * span - m);
  return x;
}
