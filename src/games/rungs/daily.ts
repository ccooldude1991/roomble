/*
 * Which puzzle is "today". A daily puzzle's day starts at midnight in the daily
 * timezone (Singapore, UTC+8, which never observes DST) for every player, wherever
 * they are. So a day number is just the count of whole UTC+8 days since the Unix
 * epoch — no timezone library needed, and it rolls over at 16:00 UTC.
 */

const DAY_MS = 86_400_000;
const SG_OFFSET_MS = 8 * 3_600_000; // UTC+8, fixed

export interface Puzzle {
  i: number;
  len: number;
  start: string;
  end: string;
  par: number;
}

export interface PuzzleData {
  epoch: string; // YYYY-MM-DD in the daily timezone
  generated: string;
  puzzles: Puzzle[];
}

/** Whole UTC+8 days since the Unix epoch for an instant in ms. */
export function sgDayNumber(ms: number): number {
  return Math.floor((ms + SG_OFFSET_MS) / DAY_MS);
}

/** Day number for a YYYY-MM-DD date read as midnight in the daily timezone. */
export function epochDayNumber(epoch: string): number {
  return sgDayNumber(Date.parse(`${epoch}T00:00:00+08:00`));
}

/** Days elapsed since the epoch date, in the daily timezone. */
export function dayIndex(nowMs: number, epoch: string): number {
  return sgDayNumber(nowMs) - epochDayNumber(epoch);
}

/** Day of week for a day number: 0 = Sunday … 6 = Saturday (epoch was Thursday). */
export function dayOfWeek(sgDay: number): number {
  return (((sgDay + 4) % 7) + 7) % 7;
}

export function isWeekend(sgDay: number): boolean {
  const d = dayOfWeek(sgDay);
  return d === 0 || d === 6;
}

export interface DailySelection {
  puzzle: Puzzle;
  /** 1-based puzzle number shown as "Rungs #N". */
  number: number;
  /** Day number (UTC+8) this selection belongs to; used for streaks. */
  day: number;
}

/**
 * The puzzle for the given instant. Puzzles are aligned to the epoch date; beyond
 * the generated range they wrap, so the arcade always has a climb for the day.
 */
export function selectPuzzle(nowMs: number, data: PuzzleData): DailySelection {
  const di = Math.max(0, dayIndex(nowMs, data.epoch));
  const len = data.puzzles.length;
  const idx = len > 0 ? ((di % len) + len) % len : 0;
  return {
    puzzle: data.puzzles[idx]!,
    number: di + 1,
    day: sgDayNumber(nowMs),
  };
}
