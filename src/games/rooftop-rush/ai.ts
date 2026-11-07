/*
 * Attract-mode bot. Reads the terrain just ahead of the runner and decides when
 * to jump or slide. Pure and deterministic given the view, so it's easy to test
 * and keeps the demo looking competent.
 */
export interface TerrainView {
  /** A gap (or its leading edge) is within jump-trigger range ahead. */
  gapAhead: boolean;
  /** A low obstacle is within jump-trigger range ahead. */
  lowAhead: boolean;
  /** A high sign is within slide-trigger range ahead. */
  highAhead: boolean;
  /** Runner is on the ground (can start a jump/slide). */
  grounded: boolean;
  /** Runner is currently over a gap (must stay airborne). */
  overGap: boolean;
}

export type BotAction = 'jump' | 'slide' | 'none';

export function decideAction(v: TerrainView): BotAction {
  // Slide under an imminent sign (only meaningful while grounded).
  if (v.highAhead && v.grounded && !v.gapAhead) return 'slide';
  // Jump gaps and low obstacles from the ground.
  if ((v.gapAhead || v.lowAhead) && v.grounded) return 'jump';
  return 'none';
}
