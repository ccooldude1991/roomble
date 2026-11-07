/*
 * Rooftop Rush sound effects as ZzFX presets (code, no audio files).
 * The close-call riser is played pitched (rising with the multiplier) via the
 * audio service's playPitched helper.
 */
import type { AudioPreset } from '../../services/audio';

export const SFX = {
  step: [0.25, 0, 90, 0, 0.01, 0.02, 0, 0.8, 0, 0, 0, 0, 0, 2] as AudioPreset,
  jump: [0.45, 0, 300, 0.01, 0.04, 0.1, 0, 1.4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0.6] as AudioPreset,
  double: [0.45, 0, 440, 0.01, 0.04, 0.1, 0, 1.6, 8] as AudioPreset,
  land: [0.4, 0, 120, 0, 0.02, 0.06, 0, 0.5, 0, 0, 0, 0, 0, 2.5] as AudioPreset,
  slide: [0.3, 0, 200, 0.02, 0.06, 0.08, 4, 0.6, 0, 0, 0, 0, 0, 1.5] as AudioPreset,
  package: [0.45, 0, 740, 0.01, 0.04, 0.08, 0, 1.3, 0, 0, 180, 0.02] as AudioPreset,
  closeCall: [0.4, 0, 500, 0.02, 0.08, 0.12, 0, 1.2] as AudioPreset, // played pitched
  powerup: [0.5, 0, 420, 0.02, 0.1, 0.16, 0, 1.4, 0, 0, 220, 0.05] as AudioPreset,
  crash: [0.6, 0, 180, 0.02, 0.12, 0.3, 4, 0.7, -4, 0, 0, 0, 0, 3, 0, 0.3] as AudioPreset,
} satisfies Record<string, AudioPreset>;
