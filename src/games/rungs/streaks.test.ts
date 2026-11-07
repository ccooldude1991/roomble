import { describe, it, expect } from 'vitest';
import { EMPTY_STATS, applyResult, currentStreak, solvedToday } from './streaks';

describe('streak logic', () => {
  it('starts a streak at 1 on the first solve', () => {
    const s = applyResult(EMPTY_STATS, 100, 5, 4);
    expect(s.streak).toBe(1);
    expect(s.maxStreak).toBe(1);
    expect(s.played).toBe(1);
    expect(s.lastDay).toBe(100);
    expect(s.dist['1']).toBe(1); // one over par
  });

  it('increments on a consecutive day', () => {
    let s = applyResult(EMPTY_STATS, 100, 4, 4);
    s = applyResult(s, 101, 6, 4);
    expect(s.streak).toBe(2);
    expect(s.maxStreak).toBe(2);
    expect(s.played).toBe(2);
    expect(s.dist['0']).toBe(1); // on par
    expect(s.dist['2']).toBe(1); // two over
  });

  it('does not double-count the same day', () => {
    let s = applyResult(EMPTY_STATS, 100, 5, 4);
    const again = applyResult(s, 100, 7, 4);
    expect(again).toBe(s); // unchanged reference
    expect(again.played).toBe(1);
    expect(again.streak).toBe(1);
  });

  it('resets the streak after a missed day', () => {
    let s = applyResult(EMPTY_STATS, 100, 4, 4);
    s = applyResult(s, 101, 4, 4);
    expect(s.streak).toBe(2);
    s = applyResult(s, 104, 5, 4); // skipped 102 and 103
    expect(s.streak).toBe(1);
    expect(s.maxStreak).toBe(2); // best is remembered
    expect(s.played).toBe(3);
  });

  it('never records a negative over-par delta', () => {
    const s = applyResult(EMPTY_STATS, 100, 3, 4); // below par shouldn't happen, but clamp
    expect(s.dist['0']).toBe(1);
  });
});

describe('currentStreak / solvedToday', () => {
  it('shows the live streak only while it is still alive', () => {
    let s = applyResult(EMPTY_STATS, 100, 4, 4);
    s = applyResult(s, 101, 4, 4);
    expect(currentStreak(s, 101)).toBe(2); // solved today
    expect(currentStreak(s, 102)).toBe(2); // yesterday — still alive, can continue
    expect(currentStreak(s, 103)).toBe(0); // lapsed
  });

  it('reports whether today is already solved', () => {
    const s = applyResult(EMPTY_STATS, 100, 4, 4);
    expect(solvedToday(s, 100)).toBe(true);
    expect(solvedToday(s, 101)).toBe(false);
  });

  it('is zero with no history', () => {
    expect(currentStreak(EMPTY_STATS, 100)).toBe(0);
    expect(solvedToday(EMPTY_STATS, 100)).toBe(false);
  });
});
