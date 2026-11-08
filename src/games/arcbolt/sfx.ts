/*
 * Arcbolt sound effects (ZzFX presets). Laser pitch is jittered slightly per shot
 * so sustained fire doesn't drone.
 */
import type { AudioPreset } from '../../services/audio';

export const SFX = {
  laser: [0.3, 0, 820, 0.005, 0.03, 0.06, 1, 1.8, -4, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.01] as AudioPreset,
  hit: [0.35, 0, 300, 0.005, 0.02, 0.05, 3, 1.2] as AudioPreset,
  boomSmall: [0.5, 0, 180, 0.01, 0.06, 0.14, 4, 0.8, -3] as AudioPreset,
  boomMed: [0.6, 0, 120, 0.02, 0.1, 0.22, 4, 0.6, -4] as AudioPreset,
  boomBig: [0.75, 0, 80, 0.03, 0.16, 0.34, 4, 0.5, -6, 0, 0, 0, 0.1] as AudioPreset,
  dash: [0.4, 0, 500, 0.02, 0.05, 0.1, 1, 0.6, -40, 0, 0, 0, 0, 1.5] as AudioPreset,
  pickup: [0.4, 0, 660, 0.005, 0.04, 0.08, 0, 1.4, 0, 0, 220, 0.04] as AudioPreset,
  waveClear: [0.5, 0, 523, 0.02, 0.14, 0.2, 0, 1.3, 0, 0, 180, 0.05, 0.07] as AudioPreset,
  upgrade: [0.5, 0, 440, 0.02, 0.1, 0.16, 0, 1.2, 0, 0, 260, 0.05] as AudioPreset,
  eshot: [0.3, 0, 260, 0.01, 0.04, 0.09, 2, 0.7, 2] as AudioPreset,
  warn: [0.4, 0, 160, 0.02, 0.08, 0.14, 0, 0.5, 0, 0, 0, 0, 0, 2] as AudioPreset,
  gameover: [0.5, 0, 300, 0.05, 0.22, 0.4, 0, 0.5, -6] as AudioPreset,
} satisfies Record<string, AudioPreset>;

/** Slight random pitch for laser variety. */
export function laserFreq(): number {
  return 760 + Math.random() * 160;
}
