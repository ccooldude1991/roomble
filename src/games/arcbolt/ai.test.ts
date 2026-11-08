import { describe, it, expect } from 'vitest';
import { nearestIndex, aimAtNearest, kiteDir } from './ai';

describe('targeting', () => {
  it('finds the nearest point', () => {
    const pts = [
      { x: 100, y: 0 },
      { x: 10, y: 0 },
      { x: 50, y: 0 },
    ];
    expect(nearestIndex(0, 0, pts)).toBe(1);
    expect(nearestIndex(0, 0, [])).toBe(-1);
  });

  it('aims at the nearest point, or the fallback when empty', () => {
    expect(aimAtNearest(0, 0, [{ x: 0, y: 10 }])).toBeCloseTo(Math.PI / 2);
    expect(aimAtNearest(0, 0, [], 1.23)).toBe(1.23);
  });
});

describe('kite bot', () => {
  it('returns a unit-ish direction', () => {
    const d = kiteDir(100, 100, [{ x: 120, y: 100 }], 1280, 720);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 1);
  });

  it('pushes away from a threat directly beside it', () => {
    // Threat to the right of the player → the move should have a leftward component.
    const d = kiteDir(640, 360, [{ x: 700, y: 360 }], 1280, 720);
    expect(d.x).toBeLessThan(0);
  });

  it('still returns a direction with no threats', () => {
    const d = kiteDir(200, 200, [], 1280, 720);
    expect(Number.isFinite(d.x) && Number.isFinite(d.y)).toBe(true);
  });
});
