import { describe, it, expect } from 'vitest';
import { makeBrick, hitBrick, isBreakable, brickValue, crackLevel } from './bricks';

describe('bricks', () => {
  it('normal brick breaks in one hit', () => {
    const b = makeBrick('normal', 0, 0);
    expect(hitBrick(b).destroyed).toBe(true);
    expect(b.alive).toBe(false);
  });

  it('tough brick needs two hits and cracks', () => {
    const b = makeBrick('tough', 0, 0);
    expect(hitBrick(b).destroyed).toBe(false);
    expect(crackLevel(b)).toBeGreaterThan(0);
    expect(hitBrick(b).destroyed).toBe(true);
  });

  it('steel is unbreakable without power, breakable with fireball', () => {
    const b = makeBrick('steel', 0, 0);
    expect(hitBrick(b).destroyed).toBe(false);
    expect(b.alive).toBe(true);
    expect(isBreakable('steel')).toBe(false);
    expect(hitBrick(b, true).destroyed).toBe(true); // fireball power
  });

  it('explosive reports the explosive flag on destruction', () => {
    const b = makeBrick('explosive', 1, 1);
    const res = hitBrick(b);
    expect(res.destroyed).toBe(true);
    expect(res.explosive).toBe(true);
  });

  it('assigns score values by type', () => {
    expect(brickValue('normal')).toBeGreaterThan(0);
    expect(brickValue('tough')).toBeGreaterThan(brickValue('normal'));
    expect(brickValue('steel')).toBe(0);
  });
});
