import { describe, it, expect } from 'vitest';
import { reachableGapTiles, singleJumpAirTime, maxJumpHeight } from './reach';
import { TIER_SPEEDS } from './config';
import { computeScore, metresFromPx, nearMissBonus } from './scoring';
import { decideAction } from './ai';
import {
  COSMETICS,
  getCoins,
  addCoins,
  unlock,
  isUnlocked,
  equip,
  getEquipped,
} from './cosmetics';
import { createSave } from '../../services/save';

describe('reach maths', () => {
  it('a jump stays airborne for a sensible time', () => {
    expect(singleJumpAirTime()).toBeGreaterThan(0.4);
    expect(singleJumpAirTime()).toBeLessThan(1);
    expect(maxJumpHeight()).toBeGreaterThan(60);
  });

  it('reachable gap grows with speed', () => {
    const tiles = TIER_SPEEDS.map((s) => reachableGapTiles(s));
    for (let i = 1; i < tiles.length; i++) expect(tiles[i]!).toBeGreaterThanOrEqual(tiles[i - 1]!);
    expect(tiles[0]!).toBeGreaterThanOrEqual(1);
  });
});

describe('scoring', () => {
  it('converts pixels to metres', () => {
    expect(metresFromPx(0)).toBe(0);
    expect(metresFromPx(205)).toBe(10); // 20 px per metre
  });

  it('combines distance, packages and near-miss bonus', () => {
    expect(computeScore({ distancePx: 2000, packages: 4, nearMissTotal: 300 })).toBe(
      100 + 4 * 25 + 300,
    );
  });

  it('near-miss bonus scales with the multiplier', () => {
    expect(nearMissBonus(1)).toBe(50);
    expect(nearMissBonus(3)).toBe(150);
  });
});

describe('attract bot', () => {
  it('slides under a sign, jumps a gap, otherwise idles', () => {
    expect(
      decideAction({ highAhead: true, grounded: true, gapAhead: false, lowAhead: false, overGap: false }),
    ).toBe('slide');
    expect(
      decideAction({ gapAhead: true, grounded: true, highAhead: false, lowAhead: false, overGap: false }),
    ).toBe('jump');
    expect(
      decideAction({ gapAhead: false, grounded: false, highAhead: false, lowAhead: false, overGap: true }),
    ).toBe('none');
  });
});

describe('cosmetics', () => {
  it('banks coins and unlocks/equips with a real save service', () => {
    const save = createSave('test-rooftop-cosmetics');
    expect(getCoins(save)).toBe(0);
    expect(isUnlocked(save, 'phosphor')).toBe(true); // default unlocked
    expect(getEquipped(save).id).toBe('phosphor');

    const amber = COSMETICS.find((c) => c.id === 'marquee')!;
    expect(unlock(save, 'marquee')).toBe(false); // not enough coins
    addCoins(save, amber.cost);
    expect(unlock(save, 'marquee')).toBe(true);
    expect(getCoins(save)).toBe(0);
    expect(equip(save, 'marquee')).toBe(true);
    expect(getEquipped(save).id).toBe('marquee');

    save.remove('coins');
    save.remove('unlocked');
    save.remove('equipped');
  });
});
