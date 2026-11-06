/*
 * Hit-stop: a brief freeze on impact that makes hits feel weighty. Request a
 * freeze of N seconds; each frame, scale your delta time by `timeScale(dt)`
 * (returns 0 while frozen, 1 otherwise). Disabled under reduced motion.
 */
export class Hitstop {
  #remaining = 0;
  #enabled: boolean;

  constructor(opts: { reducedMotion?: boolean } = {}) {
    this.#enabled = !opts.reducedMotion;
  }

  /** Freeze for `seconds`. Overlapping requests take the longer freeze. */
  request(seconds: number): void {
    if (!this.#enabled) return;
    this.#remaining = Math.max(this.#remaining, seconds);
  }

  /** Call once per frame with real dt (seconds). Returns the dt multiplier. */
  timeScale(dt: number): number {
    if (this.#remaining <= 0) return 1;
    this.#remaining = Math.max(0, this.#remaining - dt);
    return 0;
  }

  get frozen(): boolean {
    return this.#remaining > 0;
  }
}
