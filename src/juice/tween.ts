/* A tiny rAF tween. Returns a cancel function. */
import { easeOutCubic, type Easing } from './easings';

export interface TweenOptions {
  from: number;
  to: number;
  /** Milliseconds. */
  duration: number;
  easing?: Easing;
  onUpdate: (value: number, t: number) => void;
  onComplete?: () => void;
  /** When true, jump straight to `to` (respect prefers-reduced-motion). */
  reducedMotion?: boolean;
}

export function tween(opts: TweenOptions): () => void {
  const { from, to, duration, easing = easeOutCubic, onUpdate, onComplete, reducedMotion } = opts;

  if (reducedMotion || duration <= 0) {
    onUpdate(to, 1);
    onComplete?.();
    return () => {};
  }

  let raf = 0;
  const start = performance.now();
  let cancelled = false;

  const frame = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / duration);
    onUpdate(from + (to - from) * easing(t), t);
    if (t < 1) {
      raf = requestAnimationFrame(frame);
    } else {
      onComplete?.();
    }
  };

  raf = requestAnimationFrame(frame);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}
