import { describe, it, expect } from 'vitest';
import {
  sgDayNumber,
  epochDayNumber,
  dayIndex,
  dayOfWeek,
  isWeekend,
  selectPuzzle,
  type PuzzleData,
} from './daily';

describe('Singapore day rollover across time zones', () => {
  it('rolls the day over at 16:00 UTC (midnight UTC+8), not at UTC midnight', () => {
    const justBefore = Date.parse('2026-01-01T15:59:59Z'); // 23:59 SGT, 1 Jan
    const justAfter = Date.parse('2026-01-01T16:00:00Z'); // 00:00 SGT, 2 Jan
    expect(sgDayNumber(justAfter) - sgDayNumber(justBefore)).toBe(1);
  });

  it('puts a late-UTC instant on the next Singapore day', () => {
    // 23:30 UTC on 1 Jan is 07:30 SGT on 2 Jan.
    const lateUtc = Date.parse('2026-01-01T23:30:00Z');
    const sgMorning = Date.parse('2026-01-02T00:30:00+08:00');
    expect(sgDayNumber(lateUtc)).toBe(sgDayNumber(sgMorning));
  });

  it('agrees with an explicit +08:00 midnight for the epoch date', () => {
    expect(epochDayNumber('2026-01-01')).toBe(sgDayNumber(Date.parse('2026-01-01T00:00:00+08:00')));
  });

  it('counts whole days since the epoch regardless of the viewer time zone', () => {
    // Same instant, two ways of writing it — same day index.
    const a = dayIndex(Date.parse('2026-01-10T10:00:00+08:00'), '2026-01-01');
    const b = dayIndex(Date.parse('2026-01-10T02:00:00Z'), '2026-01-01');
    expect(a).toBe(9);
    expect(b).toBe(9);
  });
});

describe('weekday / weekend', () => {
  it('reads day-of-week from the day number (epoch day 0 was Thursday)', () => {
    expect(dayOfWeek(sgDayNumber(Date.parse('1970-01-01T00:00:00+08:00')))).toBe(4); // Thursday
  });

  it('flags Saturday and Sunday as the weekend', () => {
    const sat = sgDayNumber(Date.parse('2026-01-03T12:00:00+08:00')); // Saturday
    const sun = sgDayNumber(Date.parse('2026-01-04T12:00:00+08:00')); // Sunday
    const mon = sgDayNumber(Date.parse('2026-01-05T12:00:00+08:00')); // Monday
    expect(isWeekend(sat)).toBe(true);
    expect(isWeekend(sun)).toBe(true);
    expect(isWeekend(mon)).toBe(false);
  });
});

describe('selectPuzzle', () => {
  const data: PuzzleData = {
    epoch: '2026-01-01',
    generated: '2026-01-01',
    puzzles: [
      { i: 0, len: 4, start: 'guts', end: 'bowl', par: 4 },
      { i: 1, len: 4, start: 'toro', end: 'logo', par: 5 },
      { i: 2, len: 5, start: 'laser', end: 'dolls', par: 6 },
    ],
  };

  it('returns the epoch-day puzzle as #1', () => {
    const sel = selectPuzzle(Date.parse('2026-01-01T09:00:00+08:00'), data);
    expect(sel.number).toBe(1);
    expect(sel.puzzle.start).toBe('guts');
  });

  it('advances by one each Singapore day', () => {
    const sel = selectPuzzle(Date.parse('2026-01-02T09:00:00+08:00'), data);
    expect(sel.number).toBe(2);
    expect(sel.puzzle.start).toBe('toro');
  });

  it('wraps past the end of the generated range but keeps the absolute number', () => {
    const sel = selectPuzzle(Date.parse('2026-01-04T09:00:00+08:00'), data); // day index 3
    expect(sel.number).toBe(4);
    expect(sel.puzzle.start).toBe('guts'); // 3 % 3 === 0
  });

  it('clamps dates before the epoch to the first puzzle', () => {
    const sel = selectPuzzle(Date.parse('2025-06-01T09:00:00+08:00'), data);
    expect(sel.puzzle.start).toBe('guts');
  });
});
