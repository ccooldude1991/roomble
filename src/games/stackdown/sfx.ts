/*
 * Stackdown sound effects as ZzFX presets (code, no audio files).
 * Kept gentle; the audio service applies the master volume.
 */
import type { AudioPreset } from '../../services/audio';

export const SFX = {
  move: [0.4, 0, 170, 0, 0.01, 0.02, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5] as AudioPreset,
  rotate: [0.45, 0, 420, 0, 0.01, 0.03, 0, 1.6] as AudioPreset,
  lock: [0.5, 0, 120, 0, 0.02, 0.07, 0, 0.6, 0, 0, 0, 0, 0, 2] as AudioPreset,
  hold: [0.45, 0, 300, 0, 0.02, 0.05, 1, 1.2, 4] as AudioPreset,
  // Four ascending line-clear variants (1..4 lines).
  clear1: [0.5, 0, 330, 0.01, 0.04, 0.1, 0, 1] as AudioPreset,
  clear2: [0.5, 0, 440, 0.01, 0.05, 0.12, 0, 1] as AudioPreset,
  clear3: [0.55, 0, 554, 0.01, 0.06, 0.14, 0, 1] as AudioPreset,
  tetris: [0.6, 0, 660, 0.02, 0.1, 0.22, 1, 1.4, 0, 0, 0, 0, 0, 0, 0, 0.1, 0, 0.8] as AudioPreset,
  shockwave: [0.7, 0, 80, 0.02, 0.12, 0.35, 4, 0.8, 0, 0, 0, 0, 0, 3, 0, 0.3] as AudioPreset,
  levelUp: [0.55, 0, 523, 0.02, 0.12, 0.18, 0, 1.3, 0, 0, 120, 0.05] as AudioPreset,
  gameOver: [0.55, 0, 360, 0.04, 0.2, 0.4, 0, 0.6, -5] as AudioPreset,
  combo: [0.45, 0, 500, 0, 0.02, 0.05, 0, 1.4] as AudioPreset,
} satisfies Record<string, AudioPreset>;

/** Pick the clear sound for a given number of lines. */
export function clearSound(lines: number): AudioPreset {
  if (lines >= 4) return SFX.tetris;
  if (lines === 3) return SFX.clear3;
  if (lines === 2) return SFX.clear2;
  return SFX.clear1;
}
