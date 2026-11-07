/*
 * Jump-reach maths — the physics that decides whether a gap is clearable. Used
 * by the chunk validator and the attract bot, and unit-tested so chunk stitching
 * can never produce an impossible gap at any speed tier.
 */
import { GRAVITY, JUMP_V, DOUBLE_JUMP_V, TILE } from './config';

/** Seconds a single ground jump stays airborne (up and back to launch height). */
export function singleJumpAirTime(): number {
  return (2 * JUMP_V) / GRAVITY;
}

/** Extra airtime a double jump adds (second impulse at/after apex). */
export function doubleJumpExtraAirTime(): number {
  return (2 * DOUBLE_JUMP_V) / GRAVITY;
}

/** Peak height of a full jump (single + double), in px. */
export function maxJumpHeight(): number {
  return (JUMP_V * JUMP_V + DOUBLE_JUMP_V * DOUBLE_JUMP_V) / (2 * GRAVITY);
}

/**
 * Horizontal distance (px) a single jump covers at `speed`. A 0.9 factor keeps a
 * safety margin so solvable gaps never feel frame-perfect.
 */
export function reachableGapPx(speed: number): number {
  return speed * singleJumpAirTime() * 0.9;
}

/** Max gap width in whole tiles clearable with a SINGLE jump at `speed`. */
export function reachableGapTiles(speed: number, tile = TILE): number {
  // Leave half a tile for launch/landing footing.
  return Math.max(1, Math.floor(reachableGapPx(speed) / tile - 0.5));
}
