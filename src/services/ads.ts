/*
 * Provider-agnostic ad service.
 *
 * Providers: 'none' (default), 'adsense' (display slots), 'h5games'
 * (interstitial + rewarded breaks). Provider and on/off come from
 * src/config/site.ts. With provider 'none', nothing loads.
 *
 * This file owns the *rules* (what may show, and the interstitial frequency
 * cap). It does not load any provider script yet — Phase 4 wires AdSense /
 * H5 Games behind these same methods, and only after consent state is known.
 */
import { FEATURES } from '../config/site';

export type DisplayPlacement = 'homepage-between' | 'game-sidebar' | 'game-below';

/** Interstitials: no more than once per 3 minutes, never on the first game. */
const INTERSTITIAL_MIN_GAP_MS = 3 * 60 * 1000;

class AdsService {
  readonly enabled = FEATURES.ads.enabled;
  readonly provider = FEATURES.ads.provider;

  #gamesThisSession = 0;
  #lastInterstitialAt = 0;
  #consentKnown = false;

  /** Display ads are available only when enabled with a display-capable provider. */
  displayEnabled(): boolean {
    return this.enabled && (this.provider === 'adsense' || this.provider === 'h5games');
  }

  /** Call when a game run starts, so the cap can skip the first game of a session. */
  noteGameStart(): void {
    this.#gamesThisSession += 1;
  }

  /**
   * Whether an interstitial may run now (call after a game-over).
   * Rules: h5games only, consent known, not the first game, and the 3-minute
   * cap has elapsed. Actual display is a no-op until Phase 4.
   */
  canShowInterstitial(): boolean {
    if (!this.enabled || this.provider !== 'h5games') return false;
    if (!this.#consentKnown) return false;
    if (this.#gamesThisSession <= 1) return false;
    return performance.now() - this.#lastInterstitialAt >= INTERSTITIAL_MIN_GAP_MS;
  }

  /** Show an interstitial break if allowed. Resolves when play may resume. */
  async showInterstitial(): Promise<void> {
    if (!this.canShowInterstitial()) return;
    this.#lastInterstitialAt = performance.now();
    // Phase 4: call the H5 Games Ads Placement API here.
  }

  /** Rewarded break (opt-in per game spec). Returns whether the reward is granted. */
  async showRewarded(): Promise<boolean> {
    if (!this.enabled || this.provider !== 'h5games' || !this.#consentKnown) return false;
    // Phase 4: call the H5 Games rewarded placement here.
    return false;
  }

  /** Set once the CMP has resolved consent (EEA/UK/CH). Gates all ad loading. */
  setConsentKnown(known: boolean): void {
    this.#consentKnown = known;
  }

  consentKnown(): boolean {
    return this.#consentKnown;
  }
}

export const ads = new AdsService();
