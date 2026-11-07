/* Shared game-feel utilities. Import from '@juice' / '../juice'. */
export * from './easings';
export * from './tween';
export { Shaker } from './shake';
export { Hitstop } from './hitstop';
export { Particles, type Particle, type BurstOptions } from './particles';
export { Popups } from './popups';
export { SlowMo } from './slowmo';

/** True when the user prefers reduced motion. Pass into juice helpers to tone down. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
