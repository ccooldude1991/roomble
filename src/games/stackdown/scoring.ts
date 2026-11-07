/*
 * Scoring, levels and the gravity curve. Pure functions, unit-tested in
 * scoring.test.ts.
 */

/** Base points for clearing 0..4 lines (before level multiplier). */
export const LINE_POINTS = [0, 100, 300, 500, 800] as const;

export const BACK_TO_BACK_MULT = 1.5;
export const CHARGE_PER_LINE = 1;
export const CHARGE_MAX = 10; // lines of clears to fill the Shockwave meter

export interface ClearInput {
  lines: number; // 0..4
  level: number; // >= 1
  b2b: boolean; // was the previous clear back-to-back eligible (a tetris)?
  combo: number; // consecutive clearing drops BEFORE this one (-1 = none)
}

export interface ClearResult {
  points: number;
  b2b: boolean; // new back-to-back state
  combo: number; // new combo count (-1 = chain broken)
}

/** Resolve the score for a single drop that cleared `lines` rows. */
export function resolveClear({ lines, level, b2b, combo }: ClearInput): ClearResult {
  if (lines <= 0) {
    return { points: 0, b2b, combo: -1 };
  }

  let base = LINE_POINTS[Math.min(lines, 4)]! * level;
  const isTetris = lines === 4;
  if (isTetris && b2b) base = Math.floor(base * BACK_TO_BACK_MULT);

  const newCombo = combo + 1;
  const comboBonus = newCombo > 0 ? 50 * newCombo * level : 0;

  return {
    points: base + comboBonus,
    b2b: isTetris,
    combo: newCombo,
  };
}

/** Level rises every 10 cleared lines, starting at 1. */
export function levelForLines(totalLines: number): number {
  return Math.floor(totalLines / 10) + 1;
}

/** Gravity in milliseconds per row. Forgiving early (~800ms at L1), ramping up. */
export function gravityMs(level: number): number {
  return Math.max(50, Math.round(800 * Math.pow(0.82, level - 1)));
}

export const softDropPoints = (cells: number): number => cells;
export const hardDropPoints = (cells: number): number => cells * 2;
