/*
 * Screen shake. Accumulate trauma on impacts; read a decaying (x, y) offset each
 * frame and apply it to your camera/canvas transform. Disabled under reduced
 * motion (always returns zero offset).
 */
export class Shaker {
  #trauma = 0;
  #max: number;
  #decay: number;
  #enabled: boolean;
  #seed = Math.random() * 1000;

  constructor(opts: { maxOffset?: number; decayPerSecond?: number; reducedMotion?: boolean } = {}) {
    this.#max = opts.maxOffset ?? 16;
    this.#decay = opts.decayPerSecond ?? 1.8;
    this.#enabled = !opts.reducedMotion;
  }

  /** Add shake, scaled to the event (0..1). Bigger hits pass a larger amount. */
  add(amount: number): void {
    if (!this.#enabled) return;
    this.#trauma = Math.min(1, this.#trauma + amount);
  }

  /** Advance by dt seconds and return the current offset. */
  update(dt: number, time = performance.now() / 1000): { x: number; y: number } {
    if (!this.#enabled || this.#trauma <= 0) return { x: 0, y: 0 };
    this.#trauma = Math.max(0, this.#trauma - this.#decay * dt);
    // Quadratic falloff feels better than linear.
    const mag = this.#trauma * this.#trauma * this.#max;
    const nx = Math.sin((time + this.#seed) * 37) + Math.sin((time + this.#seed) * 61) * 0.5;
    const ny = Math.cos((time + this.#seed) * 43) + Math.cos((time + this.#seed) * 71) * 0.5;
    return { x: nx * mag, y: ny * mag };
  }

  reset(): void {
    this.#trauma = 0;
  }
}
