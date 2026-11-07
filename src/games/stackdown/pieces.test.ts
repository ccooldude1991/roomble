import { describe, it, expect } from 'vitest';
import { SevenBag, rotateCW, rotateCCW, SPAWN, PIECE_TYPES } from './pieces';

describe('7-bag randomiser', () => {
  it('yields every piece exactly once per bag', () => {
    const bag = new SevenBag(() => 0.5);
    const drawn = Array.from({ length: 7 }, () => bag.next());
    expect(new Set(drawn).size).toBe(7);
    for (const t of PIECE_TYPES) expect(drawn).toContain(t);
  });

  it('refills across bag boundaries (14 draws = each piece twice)', () => {
    const bag = new SevenBag();
    const counts: Record<string, number> = {};
    for (let i = 0; i < 14; i++) {
      const t = bag.next();
      counts[t] = (counts[t] ?? 0) + 1;
    }
    for (const t of PIECE_TYPES) expect(counts[t]).toBe(2);
  });

  it('peek matches the pieces that come next', () => {
    const bag = new SevenBag();
    const peeked = bag.peek(3);
    expect(peeked).toHaveLength(3);
    expect([bag.next(), bag.next(), bag.next()]).toEqual(peeked);
  });
});

describe('matrix rotation', () => {
  it('rotates the T piece clockwise into its R state', () => {
    expect(rotateCW(SPAWN.T)).toEqual([
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ]);
  });

  it('four clockwise rotations return to the original', () => {
    let m = SPAWN.J;
    for (let i = 0; i < 4; i++) m = rotateCW(m);
    expect(m).toEqual(SPAWN.J);
  });

  it('CCW is the inverse of CW', () => {
    expect(rotateCCW(rotateCW(SPAWN.L))).toEqual(SPAWN.L);
  });
});
