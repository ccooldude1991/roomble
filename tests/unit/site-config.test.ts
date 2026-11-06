import { describe, it, expect } from 'vitest';
import { SITE_NAME, SITE_TAGLINE, DAILY_TIMEZONE, FEATURES } from '../../src/config/site';

describe('site config', () => {
  it('defines a non-empty site name', () => {
    expect(SITE_NAME.trim().length).toBeGreaterThan(0);
  });

  it('defines a tagline', () => {
    expect(SITE_TAGLINE.trim().length).toBeGreaterThan(0);
  });

  it('rolls daily puzzles over in Asia/Singapore', () => {
    expect(DAILY_TIMEZONE).toBe('Asia/Singapore');
  });

  it('ships with ads, leaderboards and analytics off by default', () => {
    expect(FEATURES.ads.enabled).toBe(false);
    expect(FEATURES.ads.provider).toBe('none');
    expect(FEATURES.leaderboards).toBe(false);
    expect(FEATURES.analytics).toBe(false);
  });
});
