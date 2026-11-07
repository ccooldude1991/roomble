/*
 * Daily streak + distribution, saved via ctx.save. All pure so the rules are
 * testable: a missed day resets the streak, finishing the same day twice never
 * double-counts, and the over-par distribution feeds the results histogram.
 */

export interface Stats {
  streak: number;
  maxStreak: number;
  played: number;
  /** Day number (UTC+8) of the last solved daily, or -1 if none. */
  lastDay: number;
  /** Histogram keyed by (steps - par): "0" = on par, "1" = one over, … */
  dist: Record<string, number>;
}

export const EMPTY_STATS: Stats = {
  streak: 0,
  maxStreak: 0,
  played: 0,
  lastDay: -1,
  dist: {},
};

/**
 * Record a solved daily for `today` (a UTC+8 day number). Idempotent for the same
 * day: solving today's puzzle again returns the stats unchanged.
 */
export function applyResult(stats: Stats, today: number, steps: number, par: number): Stats {
  if (stats.lastDay === today) return stats;

  const continues = stats.lastDay === today - 1;
  const streak = continues ? stats.streak + 1 : 1;
  const delta = Math.max(0, steps - par);
  const key = String(delta);
  const dist = { ...stats.dist, [key]: (stats.dist[key] ?? 0) + 1 };

  return {
    streak,
    maxStreak: Math.max(stats.maxStreak, streak),
    played: stats.played + 1,
    lastDay: today,
    dist,
  };
}

/**
 * The live streak as of `today`, accounting for days gone by without a solve:
 * if the last solved day is older than yesterday, the streak has lapsed to 0.
 */
export function currentStreak(stats: Stats, today: number): number {
  if (stats.lastDay < 0) return 0;
  if (stats.lastDay === today || stats.lastDay === today - 1) return stats.streak;
  return 0;
}

export function solvedToday(stats: Stats, today: number): boolean {
  return stats.lastDay === today;
}
