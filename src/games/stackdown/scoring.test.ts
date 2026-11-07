import { describe, it, expect } from 'vitest';
import { resolveClear, levelForLines, gravityMs } from './scoring';

describe('scoring', () => {
  it('scores a single line at level 1', () => {
    const r = resolveClear({ lines: 1, level: 1, b2b: false, combo: -1 });
    expect(r.points).toBe(100);
    expect(r.b2b).toBe(false);
    expect(r.combo).toBe(0);
  });

  it('scores a tetris and sets back-to-back', () => {
    const r = resolveClear({ lines: 4, level: 1, b2b: false, combo: -1 });
    expect(r.points).toBe(800);
    expect(r.b2b).toBe(true);
  });

  it('applies the 1.5x back-to-back bonus on a second tetris', () => {
    const r = resolveClear({ lines: 4, level: 1, b2b: true, combo: -1 });
    expect(r.points).toBe(1200); // floor(800 * 1.5)
    expect(r.b2b).toBe(true);
  });

  it('adds a combo bonus on consecutive clears', () => {
    // combo 0 before → newCombo 1 → +50*1*level
    const r = resolveClear({ lines: 1, level: 1, b2b: false, combo: 0 });
    expect(r.points).toBe(150);
    expect(r.combo).toBe(1);
  });

  it('breaks the combo on a drop with no clear', () => {
    const r = resolveClear({ lines: 0, level: 5, b2b: true, combo: 3 });
    expect(r.points).toBe(0);
    expect(r.combo).toBe(-1);
    expect(r.b2b).toBe(true); // b2b is preserved across non-clearing drops
  });

  it('levels up every 10 lines', () => {
    expect(levelForLines(0)).toBe(1);
    expect(levelForLines(9)).toBe(1);
    expect(levelForLines(10)).toBe(2);
    expect(levelForLines(25)).toBe(3);
  });

  it('gravity starts forgiving and ramps, with a floor', () => {
    expect(gravityMs(1)).toBe(800);
    expect(gravityMs(2)).toBeLessThan(gravityMs(1));
    expect(gravityMs(50)).toBe(50);
  });
});
