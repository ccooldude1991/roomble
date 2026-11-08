import { describe, it, expect } from 'vitest';
import {
  killScore,
  multiplierAfterKill,
  multiplierAfterHit,
  waveClearBonus,
  accuracyPct,
  MULT_MIN,
  MULT_MAX,
} from './scoring';

describe('kill multiplier', () => {
  it('scores value times multiplier', () => {
    expect(killScore(10, 1)).toBe(10);
    expect(killScore(20, 2.5)).toBe(50);
  });

  it('climbs on kills and caps at MULT_MAX', () => {
    let m = MULT_MIN;
    for (let i = 0; i < 200; i++) m = multiplierAfterKill(m);
    expect(m).toBe(MULT_MAX);
  });

  it('halves on a hit but never below MULT_MIN', () => {
    expect(multiplierAfterHit(4)).toBe(2);
    expect(multiplierAfterHit(1)).toBe(MULT_MIN);
    expect(multiplierAfterHit(MULT_MIN)).toBe(MULT_MIN);
  });
});

describe('wave clear bonus', () => {
  it('rewards later waves and faster clears', () => {
    expect(waveClearBonus(3, 10)).toBeGreaterThan(waveClearBonus(1, 10));
    expect(waveClearBonus(3, 5)).toBeGreaterThan(waveClearBonus(3, 40));
  });

  it('never goes negative for a slow clear', () => {
    expect(waveClearBonus(1, 120)).toBeGreaterThanOrEqual(100);
  });
});

describe('accuracy', () => {
  it('is a rounded percentage, 0 when nothing fired', () => {
    expect(accuracyPct({ shotsFired: 0, shotsHit: 0 })).toBe(0);
    expect(accuracyPct({ shotsFired: 200, shotsHit: 50 })).toBe(25);
  });
});
