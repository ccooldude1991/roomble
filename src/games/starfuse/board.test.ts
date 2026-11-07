import { describe, it, expect } from 'vitest';
import { slide, slideTraced, spawn, canMove, newGrid, maxTile, type Grid, type Dir } from './board';

const G = (rows: number[][]): Grid => rows.map((r) => r.slice());

describe('slide + merge', () => {
  it('slides tiles left and merges a matching pair', () => {
    const res = slide(G([
      [1, 0, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]), 'left');
    expect(res.grid[0]).toEqual([2, 0, 0, 0]);
    expect(res.merges).toEqual([2]);
    expect(res.moved).toBe(true);
  });

  it('never merges a tile twice in one move', () => {
    const res = slide(G([
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]), 'left');
    expect(res.grid[0]).toEqual([2, 2, 0, 0]); // not [3,0,0,0]
    expect(res.merges).toEqual([2, 2]);
  });

  it('merges toward the direction of travel', () => {
    expect(
      slide(G([
        [0, 2, 2, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]), 'right').grid[0],
    ).toEqual([0, 0, 2, 3]);
  });

  it('reports moved=false when nothing changes', () => {
    const res = slide(G([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]), 'left');
    expect(res.moved).toBe(false);
  });

  it('slides up and down across columns', () => {
    const up = slide(G([
      [3, 0, 0, 0],
      [3, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]), 'up');
    expect(up.grid[0]![0]).toBe(4);
    expect(up.grid[1]![0]).toBe(0);
  });

  it('does not merge past the max tier', () => {
    const res = slide(G([
      [13, 13, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]), 'left');
    expect(res.grid[0]).toEqual([13, 13, 0, 0]);
    expect(res.merges).toEqual([]);
    expect(res.moved).toBe(false);
  });
});

describe('slideTraced matches slide', () => {
  it('produces the same grid and merges across random boards and directions', () => {
    let seed = 12345;
    const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const dirs: Dir[] = ['left', 'right', 'up', 'down'];
    for (let t = 0; t < 50; t++) {
      const g: Grid = Array.from({ length: 4 }, () =>
        Array.from({ length: 4 }, () => (rng() < 0.5 ? 0 : 1 + Math.floor(rng() * 4))),
      );
      for (const dir of dirs) {
        const a = slide(g, dir);
        const b = slideTraced(g, dir);
        expect(b.grid).toEqual(a.grid);
        expect(b.merges).toEqual(a.merges);
        expect(b.moved).toBe(a.moved);
      }
    }
  });
});

describe('spawn', () => {
  it('places a tier-1 tile (rng < 0.9) in an empty cell', () => {
    const res = spawn(newGrid(4), () => 0);
    expect(res.tier).toBe(1);
    expect(res.pos).not.toBeNull();
    expect(maxTile(res.grid)).toBe(1);
  });

  it('places a tier-2 tile when rng >= 0.9', () => {
    // First rng() picks the cell, second decides the tier.
    const seq = [0, 0.95];
    let i = 0;
    const res = spawn(newGrid(4), () => seq[i++] ?? 0);
    expect(res.tier).toBe(2);
  });

  it('returns null position on a full board', () => {
    const full = G([
      [1, 2, 1, 2],
      [2, 1, 2, 1],
      [1, 2, 1, 2],
      [2, 1, 2, 1],
    ]);
    expect(spawn(full).pos).toBeNull();
  });
});

describe('canMove', () => {
  it('is true with an empty cell', () => {
    expect(canMove(newGrid(4))).toBe(true);
  });
  it('is true with an adjacent matching pair but no space', () => {
    expect(
      canMove(G([
        [1, 1, 2, 3],
        [2, 3, 2, 3],
        [3, 2, 3, 2],
        [2, 3, 2, 3],
      ])),
    ).toBe(true);
  });
  it('is false on a locked board', () => {
    expect(
      canMove(G([
        [1, 2, 1, 2],
        [2, 1, 2, 1],
        [1, 2, 1, 2],
        [2, 1, 2, 1],
      ])),
    ).toBe(false);
  });
});
