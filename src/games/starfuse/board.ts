/*
 * Pure board logic for Starfuse: slide + merge in four directions (no tile merges
 * twice in one move), random spawns, and move/game-over detection. All functions
 * return new grids and never mutate their input. Unit-tested.
 */
import { MAX_TIER } from './tiers';

export type Grid = number[][]; // [row][col], 0 = empty, else tier value
export type Dir = 'left' | 'right' | 'up' | 'down';

export function newGrid(n: number): Grid {
  return Array.from({ length: n }, () => Array<number>(n).fill(0));
}

export function cloneGrid(g: Grid): Grid {
  return g.map((row) => row.slice());
}

export function emptyCells(g: Grid): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < g.length; r++)
    for (let c = 0; c < g.length; c++) if (g[r]![c] === 0) cells.push([r, c]);
  return cells;
}

function slideRowLeft(row: number[]): { row: number[]; merges: number[] } {
  const n = row.length;
  const nz = row.filter((x) => x !== 0);
  const out: number[] = [];
  const merges: number[] = [];
  let i = 0;
  while (i < nz.length) {
    if (i + 1 < nz.length && nz[i] === nz[i + 1] && nz[i]! < MAX_TIER) {
      const merged = nz[i]! + 1;
      out.push(merged);
      merges.push(merged);
      i += 2; // consumed two tiles; the merged tile can't merge again this move
    } else {
      out.push(nz[i]!);
      i += 1;
    }
  }
  while (out.length < n) out.push(0);
  return { row: out, merges };
}

const reverseRows = (g: Grid): Grid => g.map((r) => r.slice().reverse());
const transpose = (g: Grid): Grid => g.map((_, c) => g.map((row) => row[c]!));

export interface SlideResult {
  grid: Grid;
  moved: boolean;
  /** Tier value of each fusion that happened this move. */
  merges: number[];
}

export function slide(grid: Grid, dir: Dir): SlideResult {
  let work = cloneGrid(grid);
  if (dir === 'right') work = reverseRows(work);
  else if (dir === 'up') work = transpose(work);
  else if (dir === 'down') work = reverseRows(transpose(work));

  const merges: number[] = [];
  const slid = work.map((row) => {
    const res = slideRowLeft(row);
    merges.push(...res.merges);
    return res.row;
  });

  let result = slid;
  if (dir === 'right') result = reverseRows(slid);
  else if (dir === 'up') result = transpose(slid);
  else if (dir === 'down') result = transpose(reverseRows(slid));

  const moved = JSON.stringify(result) !== JSON.stringify(grid);
  return { grid: result, moved, merges };
}

export interface SpawnResult {
  grid: Grid;
  pos: [number, number] | null;
  tier: number;
}

/** Add a tier-1 (90%) or tier-2 (10%) tile in a random empty cell. */
export function spawn(grid: Grid, rng: () => number = Math.random): SpawnResult {
  const cells = emptyCells(grid);
  if (cells.length === 0) return { grid, pos: null, tier: 0 };
  const [r, c] = cells[Math.floor(rng() * cells.length)]!;
  const tier = rng() < 0.9 ? 1 : 2;
  const out = cloneGrid(grid);
  out[r]![c] = tier;
  return { grid: out, pos: [r, c], tier };
}

/** Any legal move left? (an empty cell, or two equal orthogonal neighbours). */
export function canMove(grid: Grid): boolean {
  const n = grid.length;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const v = grid[r]![c];
      if (v === 0) return true;
      if (c + 1 < n && grid[r]![c + 1] === v) return true;
      if (r + 1 < n && grid[r + 1]![c] === v) return true;
    }
  return false;
}

export function maxTile(grid: Grid): number {
  let m = 0;
  for (const row of grid) for (const v of row) if (v > m) m = v;
  return m;
}

export interface TileMove {
  from: [number, number];
  to: [number, number];
  tier: number; // the sliding tile's own tier (pre-merge)
  merged: boolean;
}

export interface TracedResult {
  grid: Grid;
  moved: boolean;
  merges: number[];
  moves: TileMove[];
}

// Map a (line, pos) in slide space to a [row, col], where pos 0 is the edge the
// tiles pack toward in direction `dir`.
function cellFor(dir: Dir, line: number, pos: number, n: number): [number, number] {
  switch (dir) {
    case 'left':
      return [line, pos];
    case 'right':
      return [line, n - 1 - pos];
    case 'up':
      return [pos, line];
    case 'down':
      return [n - 1 - pos, line];
  }
}

/**
 * Like slide(), but also returns each tile's from→to movement (for animation).
 * A consistency test asserts its grid/merges match slide().
 */
export function slideTraced(grid: Grid, dir: Dir): TracedResult {
  const n = grid.length;
  const out = newGrid(n);
  const merges: number[] = [];
  const moves: TileMove[] = [];

  for (let line = 0; line < n; line++) {
    const tiles: Array<{ tier: number; from: [number, number] }> = [];
    for (let pos = 0; pos < n; pos++) {
      const [r, c] = cellFor(dir, line, pos, n);
      if (grid[r]![c] !== 0) tiles.push({ tier: grid[r]![c]!, from: [r, c] });
    }
    let i = 0;
    let outPos = 0;
    while (i < tiles.length) {
      const a = tiles[i]!;
      const [dr, dc] = cellFor(dir, line, outPos, n);
      if (i + 1 < tiles.length && tiles[i + 1]!.tier === a.tier && a.tier < MAX_TIER) {
        const b = tiles[i + 1]!;
        out[dr]![dc] = a.tier + 1;
        merges.push(a.tier + 1);
        moves.push({ from: a.from, to: [dr, dc], tier: a.tier, merged: true });
        moves.push({ from: b.from, to: [dr, dc], tier: b.tier, merged: true });
        i += 2;
      } else {
        out[dr]![dc] = a.tier;
        moves.push({ from: a.from, to: [dr, dc], tier: a.tier, merged: false });
        i += 1;
      }
      outPos++;
    }
  }

  const moved = JSON.stringify(out) !== JSON.stringify(grid);
  return { grid: out, moved, merges, moves };
}
