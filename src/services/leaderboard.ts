/*
 * Leaderboard service — a no-op until Phase 5, when it becomes a Supabase
 * client. The shape matches the game contract's LeaderboardService so games can
 * call it today without caring whether it's wired up.
 */
import type { LeaderboardService } from '../games/types';
import { FEATURES } from '../config/site';

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  stats?: Record<string, number>;
  createdAt: string;
}

export type Period = 'daily' | 'weekly' | 'all-time';

class NoopLeaderboard implements LeaderboardService {
  readonly enabled = FEATURES.leaderboards;

  async submit(_score: number, _stats?: Record<string, number>): Promise<void> {
    // No-op until Phase 5.
  }

  async top(_slug: string, _period: Period, _limit = 50): Promise<ScoreRow[]> {
    return [];
  }
}

export const leaderboard = new NoopLeaderboard();
