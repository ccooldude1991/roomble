/*
 * Gravity wells (the original twist). Every 25 moves one tile becomes a well for
 * 3 moves; when it expires, orthogonally-adjacent tiles that match the well's
 * tier fuse into it automatically. Telegraphed and optional to exploit;
 * disabled in "classic" mode. Pure helpers, unit-tested.
 */
import type { Grid } from './board';
import { cloneGrid } from './board';
import { MAX_TIER } from './tiers';

export const WELL_INTERVAL = 25;
export const WELL_DURATION = 3;

export interface WellState {
  r: number;
  c: number;
  tier: number;
  movesLeft: number;
}

/** A well may spawn on this move count (every 25 moves, not move 0). */
export function shouldSpawnWell(moveCount: number): boolean {
  return moveCount > 0 && moveCount % WELL_INTERVAL === 0;
}

/** Pick a random occupied cell to become a well, or null if the board is empty. */
export function pickWell(grid: Grid, rng: () => number = Math.random): WellState | null {
  const occupied: Array<[number, number]> = [];
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid.length; c++) if (grid[r]![c] !== 0) occupied.push([r, c]);
  if (occupied.length === 0) return null;
  const [r, c] = occupied[Math.floor(rng() * occupied.length)]!;
  return { r, c, tier: grid[r]![c]!, movesLeft: WELL_DURATION };
}

export interface WellResult {
  grid: Grid;
  merges: number[];
}

/**
 * Resolve a well: each orthogonal neighbour equal to the well's current tier is
 * pulled in, bumping the well tier by one (so several matches chain upward).
 * The well cell must still hold the well's tier, or nothing happens.
 */
export function applyWellExpiry(grid: Grid, well: WellState): WellResult {
  const out = cloneGrid(grid);
  const merges: number[] = [];
  const { r, c } = well;
  if (out[r]?.[c] !== well.tier) return { grid: out, merges };

  const neighbours: Array<[number, number]> = [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ];
  // Count neighbours matching the well's ORIGINAL tier, then chain the well
  // upward by that many tiers (so the result is independent of scan order).
  let count = 0;
  for (const [nr, nc] of neighbours) {
    if (nr < 0 || nc < 0 || nr >= out.length || nc >= out.length) continue;
    if (out[nr]![nc] === well.tier) {
      out[nr]![nc] = 0;
      count++;
    }
  }
  let tier = well.tier;
  for (let k = 0; k < count && tier < MAX_TIER; k++) {
    tier++;
    merges.push(tier);
  }
  out[r]![c] = tier;
  return { grid: out, merges };
}
