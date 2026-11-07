import { describe, it, expect } from 'vitest';
import { pointsForTier, scoreForMove } from './scoring';
import { shouldSpawnWell, pickWell, applyWellExpiry, type WellState } from './wells';
import { bestMove } from './ai';
import type { Grid } from './board';

const G = (rows: number[][]): Grid => rows.map((r) => r.slice());

describe('scoring', () => {
  it('scores 2^tier per fusion', () => {
    expect(pointsForTier(2)).toBe(4);
    expect(pointsForTier(5)).toBe(32);
  });
  it('adds a chain bonus for multiple fusions in one move', () => {
    expect(scoreForMove([2])).toBe(4);
    expect(scoreForMove([2, 2])).toBe(4 + 4 + 25); // two fusions + chain bonus
  });
});

describe('gravity wells', () => {
  it('spawns every 25 moves, not on move 0', () => {
    expect(shouldSpawnWell(0)).toBe(false);
    expect(shouldSpawnWell(24)).toBe(false);
    expect(shouldSpawnWell(25)).toBe(true);
    expect(shouldSpawnWell(50)).toBe(true);
  });

  it('pulls matching neighbours into the well on expiry', () => {
    const grid = G([
      [0, 3, 0, 0],
      [3, 3, 3, 0],
      [0, 3, 0, 0],
      [0, 0, 0, 0],
    ]);
    const well: WellState = { r: 1, c: 1, tier: 3, movesLeft: 0 };
    const res = applyWellExpiry(grid, well);
    // Four matching orthogonal neighbours chain the centre up by four tiers.
    expect(res.grid[1]![1]).toBe(7);
    expect(res.merges.length).toBe(4);
    expect(res.grid[0]![1]).toBe(0);
  });

  it('picks an occupied cell as a well', () => {
    const grid = G([
      [0, 0, 0, 0],
      [0, 5, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(pickWell(grid, () => 0)).toEqual({ r: 1, c: 1, tier: 5, movesLeft: 3 });
  });
});

describe('attract bot', () => {
  it('returns a move that changes the board, or null when stuck', () => {
    const movable = G([
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(bestMove(movable)).not.toBeNull();

    const stuck = G([
      [1, 2, 1, 2],
      [2, 1, 2, 1],
      [1, 2, 1, 2],
      [2, 1, 2, 1],
    ]);
    expect(bestMove(stuck)).toBeNull();
  });
});
