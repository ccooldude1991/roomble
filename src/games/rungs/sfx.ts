/*
 * Rungs sound effects (ZzFX presets). The accept chime rises in pitch with each
 * rung so a clean climb sounds like a little ascending melody.
 */
import type { AudioPreset } from '../../services/audio';

export const SFX = {
  key: [0.4, 0, 330, 0.005, 0.01, 0.04, 1, 1.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.01] as AudioPreset,
  back: [0.4, 0, 180, 0.005, 0.02, 0.05, 1, 1.4, -8] as AudioPreset,
  accept: [0.5, 0, 523, 0.01, 0.06, 0.12, 0, 1.4, 0, 0, 120, 0.03] as AudioPreset, // played pitched
  invalid: [0.5, 0, 140, 0.02, 0.06, 0.18, 2, 0.4, -2] as AudioPreset,
  hint: [0.45, 0, 420, 0.02, 0.08, 0.15, 0, 0.9, 0, 0, 260, 0.05] as AudioPreset,
  solve: [0.55, 0, 523, 0.03, 0.22, 0.3, 0, 1.6, 0, 0, 220, 0.05, 0.08] as AudioPreset,
} satisfies Record<string, AudioPreset>;

// A major scale climbing two octaves, indexed by rung number (1-based).
const SCALE = [
  392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5,
];

/** Pitch for the nth accepted rung (1-based), clamped to the scale. */
export function rungFreq(n: number): number {
  return SCALE[Math.min(SCALE.length - 1, Math.max(0, n - 1))] ?? 523.25;
}
