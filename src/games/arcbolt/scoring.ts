/*
 * Scoring + the kill multiplier. Pure and tested. The multiplier rises as you
 * chain kills and drops hard when you take a hit.
 */

export const MULT_MIN = 1;
export const MULT_MAX = 8;
export const MULT_STEP = 0.1; // added per kill
export const MULT_HIT_FACTOR = 0.5; // multiplier is halved when hit

/** Score for a kill at the current multiplier (floored to a whole number). */
export function killScore(value: number, multiplier: number): number {
  return Math.round(value * multiplier);
}

/** New multiplier after a kill (climbs toward MULT_MAX). */
export function multiplierAfterKill(multiplier: number): number {
  return Math.min(MULT_MAX, Math.round((multiplier + MULT_STEP) * 10) / 10);
}

/** New multiplier after taking a hit (drops, never below MULT_MIN). */
export function multiplierAfterHit(multiplier: number): number {
  return Math.max(MULT_MIN, Math.round(multiplier * MULT_HIT_FACTOR * 10) / 10);
}

/** Bonus for clearing a wave: a base plus a reward for finishing quickly. */
export function waveClearBonus(wave: number, secondsTaken: number): number {
  const base = 100 * wave;
  const speed = Math.max(0, Math.round((45 - secondsTaken) * 10)) * wave;
  return base + speed;
}

export interface Accuracy {
  shotsFired: number;
  shotsHit: number;
}

export function accuracyPct(a: Accuracy): number {
  if (a.shotsFired <= 0) return 0;
  return Math.round((a.shotsHit / a.shotsFired) * 100);
}
