import { describe, it, expect } from 'vitest';
import { paddleBounce, enforceMinVy, speedOf, clampSpeed, substepCount } from './physics';
import { comboBonus, stageClearBonus } from './scoring';
import { predictLandingX } from './ai';
import { MIN_VY, PADDLE_Y } from './config';

describe('ball physics', () => {
  it('paddle centre sends the ball straight up', () => {
    const v = paddleBounce(0, 300);
    expect(v.vy).toBeLessThan(0);
    expect(Math.abs(v.vx)).toBeLessThan(0.001);
    expect(speedOf(v)).toBeCloseTo(300, 3);
  });

  it('edge hits angle the ball but never near-horizontal, keeping it heading up', () => {
    const v = paddleBounce(1, 300);
    expect(v.vy).toBeLessThan(0); // still upward
    expect(Math.abs(v.vx)).toBeGreaterThan(0);
    // clamped to <= 60deg from vertical, so |vy| stays a meaningful fraction of speed
    expect(Math.abs(v.vy)).toBeGreaterThan(300 * 0.49);
  });

  it('enforces a minimum vertical speed while preserving total speed', () => {
    const v = enforceMinVy({ vx: 300, vy: 20 });
    expect(Math.abs(v.vy)).toBeGreaterThanOrEqual(MIN_VY - 0.001);
    expect(speedOf(v)).toBeCloseTo(speedOf({ vx: 300, vy: 20 }), 3);
  });

  it('clamps to a max speed', () => {
    expect(speedOf(clampSpeed({ vx: 600, vy: 600 }, 400))).toBeCloseTo(400, 3);
  });

  it('uses enough substeps to prevent tunnelling at high speed', () => {
    expect(substepCount(430, 1 / 60)).toBeGreaterThanOrEqual(1);
    expect(substepCount(4000, 1 / 60)).toBeGreaterThan(1);
  });
});

describe('scoring', () => {
  it('rewards longer combos', () => {
    expect(comboBonus(1)).toBe(0);
    expect(comboBonus(4)).toBe(30);
  });
  it('rewards fast clears and spare lives', () => {
    expect(stageClearBonus(0, 3)).toBe(1000 + 750);
    expect(stageClearBonus(200, 0)).toBe(0);
  });
});

describe('attract prediction', () => {
  it('returns current x when moving up', () => {
    expect(predictLandingX(200, 300, 50, -100, PADDLE_Y)).toBe(200);
  });
  it('keeps the predicted landing within the walls', () => {
    const x = predictLandingX(50, 100, 400, 200, PADDLE_Y);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(400);
  });
});
