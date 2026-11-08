import { describe, it, expect } from 'vitest';
import {
  UPGRADES,
  ALL_UPGRADE_IDS,
  applyUpgrade,
  isMaxed,
  levelOf,
  deriveStats,
  pickThree,
  type Build,
} from './upgrades';
import { makeRng } from './waves';
import { FIRE_CD, HULL_MAX, BULLET_R, DASH_CD } from './config';

describe('build + apply', () => {
  it('starts empty and increments levels', () => {
    let b: Build = {};
    expect(levelOf(b, 'fireRate')).toBe(0);
    b = applyUpgrade(b, 'fireRate');
    b = applyUpgrade(b, 'fireRate');
    expect(levelOf(b, 'fireRate')).toBe(2);
  });

  it('does not exceed the max and does not mutate the input', () => {
    let b: Build = {};
    for (let i = 0; i < 10; i++) b = applyUpgrade(b, 'spread');
    expect(levelOf(b, 'spread')).toBe(UPGRADES.spread.max);
    expect(isMaxed(b, 'spread')).toBe(true);
    const before = { ...b };
    applyUpgrade(b, 'spread');
    expect(b).toEqual(before); // unchanged
  });
});

describe('deriveStats', () => {
  it('base build matches config defaults', () => {
    const s = deriveStats({});
    expect(s.fireCd).toBeCloseTo(FIRE_CD);
    expect(s.bulletCount).toBe(1);
    expect(s.pierce).toBe(0);
    expect(s.hullMax).toBe(HULL_MAX);
    expect(s.bulletR).toBeCloseTo(BULLET_R);
    expect(s.dashCd).toBeCloseTo(DASH_CD);
    expect(s.magnetRadius).toBe(0);
  });

  it('upgrades change the derived stats in the expected direction', () => {
    const b: Build = { fireRate: 2, spread: 2, pierce: 1, bigBullets: 2, hull: 3, dashCd: 1, magnet: 1, drone: 2, chain: 1, homing: 1 };
    const s = deriveStats(b);
    expect(s.fireCd).toBeLessThan(FIRE_CD); // faster
    expect(s.bulletCount).toBe(5); // 1 + 2*2
    expect(s.spreadArc).toBeGreaterThan(0);
    expect(s.pierce).toBe(1);
    expect(s.bulletR).toBeGreaterThan(BULLET_R);
    expect(s.hullMax).toBe(HULL_MAX + 3);
    expect(s.dashCd).toBeLessThan(DASH_CD);
    expect(s.magnetRadius).toBeGreaterThan(0);
    expect(s.drones).toBe(2);
    expect(s.chain).toBe(1);
    expect(s.homing).toBeGreaterThan(0);
  });

  it('fire cooldown never drops below the floor', () => {
    const s = deriveStats({ fireRate: UPGRADES.fireRate.max });
    expect(s.fireCd).toBeGreaterThanOrEqual(0.06);
  });
});

describe('pickThree', () => {
  it('offers three distinct, non-maxed upgrades', () => {
    const picks = pickThree({}, makeRng(1));
    expect(picks).toHaveLength(3);
    expect(new Set(picks).size).toBe(3);
    expect(picks.every((id) => ALL_UPGRADE_IDS.includes(id))).toBe(true);
  });

  it('never offers a maxed upgrade (unless nothing else is left)', () => {
    // Max everything except hull; picks should avoid the maxed ones.
    const b: Build = {};
    for (const id of ALL_UPGRADE_IDS) {
      if (id !== 'hull' && id !== 'fireRate') b[id] = UPGRADES[id].max;
    }
    const picks = pickThree(b, makeRng(7));
    expect(picks).toContain('hull');
    expect(picks.some((id) => id !== 'hull' && isMaxed(b, id))).toBe(false);
  });

  it('is deterministic for a seed', () => {
    expect(pickThree({}, makeRng(99))).toEqual(pickThree({}, makeRng(99)));
  });
});
