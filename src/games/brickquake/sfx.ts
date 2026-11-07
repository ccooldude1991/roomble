/* Brickquake sound effects (ZzFX). Brick hits are played pitched by row. */
import type { AudioPreset } from '../../services/audio';

export const SFX = {
  paddle: [0.4, 0, 180, 0, 0.02, 0.05, 1, 0.8, 0, 0, 0, 0, 0, 2] as AudioPreset,
  brick: [0.35, 0, 500, 0, 0.02, 0.05, 0, 1.2] as AudioPreset, // played pitched by row
  crack: [0.3, 0, 260, 0, 0.02, 0.06, 2, 0.5, 0, 0, 0, 0, 0, 2] as AudioPreset,
  explode: [0.6, 0, 90, 0.01, 0.1, 0.3, 4, 0.7, 0, 0, 0, 0, 0, 3, 0, 0.3] as AudioPreset,
  power: [0.45, 0, 500, 0.02, 0.08, 0.14, 0, 1.3, 0, 0, 220, 0.05] as AudioPreset,
  laser: [0.3, 0, 900, 0, 0.02, 0.05, 1, 1.5, -8] as AudioPreset,
  lifeLost: [0.5, 0, 300, 0.05, 0.15, 0.3, 0, 0.6, -6] as AudioPreset,
  bossRoar: [0.6, 0, 70, 0.05, 0.2, 0.4, 4, 0.5, 0, 0, 0, 0, 0, 4, 0, 0.4] as AudioPreset,
  clear: [0.5, 0, 523, 0.02, 0.15, 0.25, 0, 1.4, 0, 0, 160, 0.06] as AudioPreset,
};

/** Brick hit pitched up by its row (higher rows = higher pitch). */
export function brickFreq(row: number): number {
  return 360 + row * 40;
}
