/*
 * Shared constants for Rooftop Rush. Both the pure reach/chunk logic and the
 * Phaser scene import these so the solvability maths matches the real physics.
 */
export const LOGICAL_W = 640;
export const LOGICAL_H = 360;

export const TILE = 40; // one terrain column
export const GROUND_Y = 300; // rooftop surface (runner's feet rest here)

// Runner
export const RUNNER_X = 150; // fixed screen x
export const RUNNER_W = 26;
export const RUNNER_H = 42;
export const RUNNER_SLIDE_H = 22;

// Physics (px, seconds)
export const GRAVITY = 1900;
export const JUMP_V = 640; // initial upward speed (positive magnitude)
export const DOUBLE_JUMP_V = 560;
export const MIN_JUMP_V = 240; // released-early cutoff (variable jump height)
export const SLIDE_MS = 420;
export const COYOTE_MS = 90;
export const JUMP_BUFFER_MS = 100;
export const GLIDE_GRAVITY = 520; // while gliding power-up active

// Speed / difficulty tiers (px per second)
export const SPEED_START = 220;
export const SPEED_MAX = 470;
export const SPEED_ACCEL = 7; // per second

/** Speed tiers; a chunk tagged with tier T may appear once the run reaches T. */
export const TIER_SPEEDS = [220, 280, 340, 400, 460] as const;
export const TIER_COUNT = TIER_SPEEDS.length;

/** The current difficulty tier for a given speed. */
export function tierForSpeed(speed: number): number {
  let t = 0;
  for (let i = 0; i < TIER_SPEEDS.length; i++) if (speed >= TIER_SPEEDS[i]!) t = i;
  return t;
}
