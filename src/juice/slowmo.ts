/*
 * Slow-motion helper. Request a brief slow-down (e.g. a close call); each frame,
 * read timeScale(dt) — a 0..1 multiplier you apply to your delta time — which
 * eases back to full speed. Disabled under reduced motion (always 1).
 */
import { easeOutCubic } from './easings';

export class SlowMo {
  #remaining = 0;
  #duration = 0;
  #factor = 1;
  #enabled: boolean;

  constructor(opts: { reducedMotion?: boolean } = {}) {
    this.#enabled = !opts.reducedMotion;
  }

  /** Slow to `factor` (0..1) for `seconds`, easing back to 1. */
  request(factor: number, seconds: number): void {
    if (!this.#enabled) return;
    this.#factor = factor;
    this.#duration = seconds;
    this.#remaining = seconds;
  }

  /** Advance by real dt (seconds); returns the current time multiplier (0..1). */
  timeScale(dt: number): number {
    if (this.#remaining <= 0) return 1;
    this.#remaining = Math.max(0, this.#remaining - dt);
    const p = this.#duration > 0 ? 1 - this.#remaining / this.#duration : 1;
    return this.#factor + (1 - this.#factor) * easeOutCubic(p);
  }

  get active(): boolean {
    return this.#remaining > 0;
  }
}
