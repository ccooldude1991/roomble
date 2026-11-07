import { describe, it, expect } from 'vitest';
import {
  CHUNKS,
  parseColumns,
  maxGap,
  validateChunks,
  pickChunk,
  breather,
} from './chunks';

describe('chunk parsing', () => {
  it('maps characters to columns', () => {
    const cols = parseColumns('#.LHoOu');
    expect(cols[0]).toEqual({ ground: true });
    expect(cols[1]).toEqual({ ground: false });
    expect(cols[2]).toEqual({ ground: true, obstacle: 'low' });
    expect(cols[3]).toEqual({ ground: true, obstacle: 'high' });
    expect(cols[4]).toEqual({ ground: true, pkg: true });
    expect(cols[5]).toEqual({ ground: false, pkg: true });
    expect(cols[6]).toEqual({ ground: true, powerup: true });
  });

  it('measures the widest gap', () => {
    expect(maxGap(parseColumns('##..##'))).toBe(2);
    expect(maxGap(parseColumns('#.O.#'))).toBe(3); // O is also non-ground
    expect(maxGap(parseColumns('######'))).toBe(0);
  });
});

describe('chunk library', () => {
  it('has at least 20 chunks', () => {
    expect(CHUNKS.length).toBeGreaterThanOrEqual(20);
  });

  it('contains no impossible gaps at any tier (reach maths)', () => {
    const errors = validateChunks();
    expect(errors, JSON.stringify(errors)).toEqual([]);
  });

  it('pickChunk never returns a chunk above the current tier', () => {
    const rng = () => 0.42;
    for (let tier = 0; tier < 5; tier++) {
      for (let i = 0; i < 20; i++) {
        expect(pickChunk(tier, rng).tier).toBeLessThanOrEqual(tier);
      }
    }
  });

  it('breather is all ground', () => {
    expect(breather(3).every((c) => c.ground)).toBe(true);
  });
});
