import { describe, it, expect } from 'vitest';
import { PUZZLES, dictFor, wordCount } from './data';
import { par } from './graph';

// Integrity of the generated data: every shipped puzzle must be solvable in its
// shipped dictionary, and its stated par must equal an independent BFS. This is
// the real-data counterpart to graph.test.ts's hand-built ladder.
describe('generated puzzle data', () => {
  it('ships non-empty dictionaries for both lengths', () => {
    expect(wordCount(4)).toBeGreaterThan(500);
    expect(wordCount(5)).toBeGreaterThan(500);
  });

  it('has a full year of puzzles aligned to the epoch', () => {
    expect(PUZZLES.puzzles.length).toBeGreaterThanOrEqual(365);
    PUZZLES.puzzles.forEach((p, idx) => expect(p.i).toBe(idx));
  });

  it('never ships solution paths, only start/end/par', () => {
    const keys = Object.keys(PUZZLES.puzzles[0]!).sort();
    expect(keys).toEqual(['end', 'i', 'len', 'par', 'start']);
  });

  it('start and end are real words of the right length, and differ', () => {
    for (const p of PUZZLES.puzzles) {
      const dict = dictFor(p.len);
      expect(p.start.length).toBe(p.len);
      expect(p.end.length).toBe(p.len);
      expect(p.start).not.toBe(p.end);
      expect(dict.has(p.start)).toBe(true);
      expect(dict.has(p.end)).toBe(true);
    }
  });

  it('every stated par matches a fresh BFS and stays in the 4..8 range', () => {
    for (const p of PUZZLES.puzzles) {
      const bfsPar = par(p.start, p.end, dictFor(p.len));
      expect(bfsPar).toBe(p.par);
      expect(p.par).toBeGreaterThanOrEqual(4);
      expect(p.par).toBeLessThanOrEqual(8);
    }
  }, 30_000); // 366 full BFS runs over the shipped dictionaries

  it('uses 4-letter words on weekdays and 5-letter on weekends (first fortnight)', () => {
    // Day 0 is the epoch (2026-01-01, a Thursday).
    const expected = [4, 4, 5, 5, 4, 4, 4, 4, 4, 5, 5, 4, 4, 4]; // Thu..next Wed
    expected.forEach((len, i) => expect(PUZZLES.puzzles[i]!.len).toBe(len));
  });
});
