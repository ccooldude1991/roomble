/*
 * Rooftop Rush scoring (pure). Score = distance in metres + packages × 25 +
 * accumulated near-miss bonus. Unit-tested.
 */
export const PX_PER_METRE = 20;
export const PACKAGE_POINTS = 25;
export const NEAR_MISS_BASE = 50;

export function metresFromPx(distancePx: number): number {
  return Math.floor(distancePx / PX_PER_METRE);
}

/** Points for a single close call at the current multiplier. */
export function nearMissBonus(multiplier: number): number {
  return NEAR_MISS_BASE * Math.max(1, multiplier);
}

export interface ScoreInput {
  distancePx: number;
  packages: number;
  nearMissTotal: number;
}

export function computeScore({ distancePx, packages, nearMissTotal }: ScoreInput): number {
  return metresFromPx(distancePx) + packages * PACKAGE_POINTS + nearMissTotal;
}
