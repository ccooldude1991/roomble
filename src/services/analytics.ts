/*
 * Analytics — a no-op interface until a privacy-friendly provider is enabled
 * (Phase 6, behind the analytics flag). Nothing is sent, no cookies, no network.
 */
import { FEATURES } from '../config/site';

export type AnalyticsEvent =
  | { name: 'game_start'; slug: string }
  | { name: 'game_over'; slug: string; score: number }
  | { name: 'page_view'; path: string };

class NoopAnalytics {
  readonly enabled = FEATURES.analytics;

  track(_event: AnalyticsEvent): void {
    // No-op until enabled.
  }
}

export const analytics = new NoopAnalytics();
