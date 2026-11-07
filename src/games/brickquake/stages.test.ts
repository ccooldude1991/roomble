import { describe, it, expect } from 'vitest';
import {
  LAYOUTS,
  validateLayout,
  parseLayout,
  generateLayout,
  getStageLayout,
  isBossStage,
} from './stages';

describe('stage validation', () => {
  it('every hand-made stage is valid (clearable, no enclosed breakables)', () => {
    LAYOUTS.forEach((layout, i) => {
      const errors = validateLayout(layout);
      expect(errors, `layout ${i}: ${JSON.stringify(errors)}`).toEqual([]);
    });
  });

  it('flags a fully-enclosed breakable brick', () => {
    const bad = ['SSS', 'SNS', 'SSS']; // the N is boxed in by steel
    const errors = validateLayout(bad);
    expect(errors.some((e) => e.reason.includes('enclosed'))).toBe(true);
  });

  it('flags a stage with no breakable bricks', () => {
    expect(validateLayout(['SSSS']).some((e) => e.reason.includes('no breakable'))).toBe(true);
  });

  it('parses bricks from a layout', () => {
    const bricks = parseLayout(['N.T', 'X.Y']);
    expect(bricks).toHaveLength(4);
    expect(bricks.map((b) => b.type)).toContain('tough');
  });

  it('generates valid procedural stages', () => {
    for (let seed = 17; seed < 40; seed++) {
      expect(validateLayout(generateLayout(seed))).toEqual([]);
    }
  });

  it('boss stages fall every 5th; getStageLayout stays valid for non-boss stages', () => {
    expect(isBossStage(5)).toBe(true);
    expect(isBossStage(7)).toBe(false);
    for (let s = 1; s <= 24; s++) {
      if (isBossStage(s)) continue;
      expect(validateLayout(getStageLayout(s))).toEqual([]);
    }
  });
});
