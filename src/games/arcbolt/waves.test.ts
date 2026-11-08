import { describe, it, expect } from 'vitest';
import {
  composeWave,
  isBossWave,
  waveBudget,
  eliteChance,
  spawnCap,
  makeRng,
} from './waves';
import { ENEMY_DEFS, availableTypes } from './enemies';

describe('wave schedule', () => {
  it('flags every 10th wave as a boss', () => {
    expect(isBossWave(10)).toBe(true);
    expect(isBossWave(20)).toBe(true);
    expect(isBossWave(9)).toBe(false);
    expect(isBossWave(0)).toBe(false);
  });

  it('budget grows with the wave', () => {
    expect(waveBudget(2)).toBeLessThan(waveBudget(8));
  });

  it('no elites before wave 5, then rising and capped', () => {
    expect(eliteChance(4)).toBe(0);
    expect(eliteChance(5)).toBeGreaterThan(0);
    expect(eliteChance(100)).toBeLessThanOrEqual(0.28);
  });

  it('unlocks types gradually', () => {
    expect(availableTypes(1)).toEqual(['drifter']);
    expect(availableTypes(6)).toContain('spawner');
  });
});

describe('composeWave', () => {
  it('returns a boss plan with no spawns on boss waves', () => {
    const plan = composeWave(10, makeRng(1));
    expect(plan.boss).toBe(true);
    expect(plan.spawns).toEqual([]);
  });

  it('is deterministic for a given seed', () => {
    const a = composeWave(7, makeRng(42));
    const b = composeWave(7, makeRng(42));
    expect(a).toEqual(b);
  });

  it('only spawns unlocked types', () => {
    const plan = composeWave(3, makeRng(5));
    const allowed = new Set(availableTypes(3));
    expect(plan.spawns.every((s) => allowed.has(s.type))).toBe(true);
  });

  it('never exceeds the spawn cap and produces more over time', () => {
    const early = composeWave(2, makeRng(9));
    const late = composeWave(14, makeRng(9));
    expect(early.spawns.length).toBeLessThanOrEqual(spawnCap());
    expect(late.spawns.length).toBeLessThanOrEqual(spawnCap());
    expect(late.spawns.length).toBeGreaterThan(early.spawns.length);
  });

  it('spends within budget (cost accounting is sane)', () => {
    const plan = composeWave(6, makeRng(3));
    const spent = plan.spawns.reduce((sum, s) => {
      const base = ENEMY_DEFS[s.type].cost;
      return sum + (s.elite ? Math.ceil(base * 1.5) : base);
    }, 0);
    // Can't overspend beyond the budget plus one last affordable pick.
    expect(spent).toBeLessThanOrEqual(waveBudget(6));
  });

  it('has no elites before wave 5', () => {
    for (let w = 1; w < 5; w++) {
      const plan = composeWave(w, makeRng(w * 11));
      expect(plan.spawns.some((s) => s.elite)).toBe(false);
    }
  });
});
