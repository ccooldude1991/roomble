import { describe, it, expect } from 'vitest';
import {
  dist,
  angleTo,
  normalize,
  clamp,
  circlesOverlap,
  leadAngle,
  angleDelta,
  fromAngle,
} from './geometry';

describe('geometry', () => {
  it('distance and angle', () => {
    expect(dist(0, 0, 3, 4)).toBe(5);
    expect(angleTo(0, 0, 1, 0)).toBeCloseTo(0);
    expect(angleTo(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2);
  });

  it('normalize returns a unit vector (and zero for zero)', () => {
    const n = normalize(0, 5);
    expect(n).toEqual({ x: 0, y: 1 });
    expect(Math.hypot(normalize(3, 4).x, normalize(3, 4).y)).toBeCloseTo(1);
    expect(normalize(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('clamp', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('circle overlap', () => {
    expect(circlesOverlap(0, 0, 5, 8, 0, 4)).toBe(true); // centres 8 apart, radii sum 9
    expect(circlesOverlap(0, 0, 5, 20, 0, 4)).toBe(false);
  });

  it('fromAngle is the inverse of angleTo on the unit circle', () => {
    const v = fromAngle(Math.PI / 2);
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(1);
  });

  it('angleDelta gives the shortest signed turn', () => {
    expect(angleDelta(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    // From 170° to -170° the short way is +20°, not -340°.
    expect(angleDelta((170 * Math.PI) / 180, (-170 * Math.PI) / 180)).toBeCloseTo((20 * Math.PI) / 180);
  });

  it('leadAngle aims straight at a stationary target', () => {
    expect(leadAngle(0, 0, 10, 0, 0, 0, 500)).toBeCloseTo(0);
  });

  it('leadAngle leads a crossing target ahead of its current position', () => {
    // Target to the right, moving up (−y). The lead angle should aim above the x-axis.
    const a = leadAngle(0, 0, 100, 0, 0, -40, 200);
    expect(a).toBeLessThan(0); // negative y is "up" → negative angle
    expect(a).toBeGreaterThan(-Math.PI / 2);
  });
});
