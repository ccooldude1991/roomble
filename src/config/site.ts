/**
 * Single source of truth for the site's identity and feature flags.
 *
 * The site name must ONLY ever be defined here. Never hardcode it anywhere else
 * (meta tags, titles, manifest, footer, copy). Always import SITE_NAME.
 */

/** The site name. Change the brand here and nowhere else. */
export const SITE_NAME = 'Roomble';

/** One-line tagline shown in the header/marquee and meta description. Placeholder for now. */
export const SITE_TAGLINE = 'An arcade of original browser games.';

/**
 * Canonical site URL (no trailing slash).
 *
 * In production this is injected by the deploy workflow via the SITE_URL env var
 * (see astro.config.mjs). The value here is the local/dev default and a fallback.
 */
export const SITE_URL = import.meta.env?.SITE_URL ?? 'http://localhost:4321';

/**
 * Timezone used to roll over daily puzzles. A daily puzzle's "day" starts at
 * midnight in this zone for every player, wherever they are.
 */
export const DAILY_TIMEZONE = 'Asia/Singapore';

/** Ad providers the ad service knows how to drive. */
export type AdProvider = 'none' | 'adsense' | 'h5games';

export interface Features {
  ads: {
    /** Master on/off for all ads. */
    enabled: boolean;
    /** Which provider to use when enabled. "none" renders nothing in prod. */
    provider: AdProvider;
  };
  /** Global leaderboards (Supabase). Off until Phase 5. */
  leaderboards: boolean;
  /** Privacy-friendly analytics. Off until explicitly enabled. */
  analytics: boolean;
}

/** Feature flags. Everything optional is off by default. */
export const FEATURES: Features = {
  ads: {
    enabled: false,
    provider: 'none',
  },
  leaderboards: false,
  analytics: false,
};
