/*
 * Starfuse sound effects (ZzFX presets). Fusion tones are played pitched up a
 * pentatonic scale so chains in one move sound musical.
 */
import type { AudioPreset } from '../../services/audio';

export const SFX = {
  slide: [0.3, 0, 180, 0.01, 0.03, 0.08, 4, 0.6, 0, 0, 0, 0, 0, 1.5] as AudioPreset,
  fusion: [0.4, 0, 440, 0.01, 0.05, 0.12, 0, 1.1] as AudioPreset, // played pitched
  discovery: [0.5, 0, 523, 0.02, 0.12, 0.2, 0, 1.3, 0, 0, 180, 0.04] as AudioPreset,
  well: [0.45, 0, 300, 0.02, 0.1, 0.2, 1, 0.8, 0, 0, 90, 0.05] as AudioPreset,
  gameover: [0.4, 0, 300, 0.05, 0.2, 0.4, 0, 0.5, -4] as AudioPreset,
} satisfies Record<string, AudioPreset>;

// C major pentatonic across octaves, indexed by tier (1..13).
const PENTA = [
  261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66,
  1318.51,
];

export function fusionFreq(tier: number): number {
  return PENTA[Math.min(PENTA.length - 1, Math.max(0, tier - 1))] ?? 440;
}
