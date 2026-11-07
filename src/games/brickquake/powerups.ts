/*
 * Power-up definitions (pure). They fall from broken bricks and are caught with
 * the paddle. Negative pickups are rare and clearly marked (a different colour).
 */
export type PowerType =
  | 'multiball'
  | 'wide'
  | 'laser'
  | 'sticky'
  | 'fireball'
  | 'slow'
  | 'extralife'
  | 'narrow'
  | 'fast';

export interface PowerDef {
  type: PowerType;
  good: boolean;
  color: string;
  label: string;
  weight: number; // relative chance when a random power-up drops
}

export const POWERUPS: Record<PowerType, PowerDef> = {
  multiball: { type: 'multiball', good: true, color: '#4df0d0', label: '3x', weight: 10 },
  wide: { type: 'wide', good: true, color: '#ffc21a', label: 'W', weight: 10 },
  laser: { type: 'laser', good: true, color: '#ff3d6e', label: 'L', weight: 8 },
  sticky: { type: 'sticky', good: true, color: '#8fb0ff', label: 'S', weight: 8 },
  fireball: { type: 'fireball', good: true, color: '#ff8a3d', label: 'F', weight: 7 },
  slow: { type: 'slow', good: true, color: '#6fe26f', label: '<', weight: 8 },
  extralife: { type: 'extralife', good: true, color: '#fff4dc', label: '+1', weight: 2 },
  narrow: { type: 'narrow', good: false, color: '#9b5bff', label: 'N', weight: 4 },
  fast: { type: 'fast', good: false, color: '#9b5bff', label: '>', weight: 4 },
};

const WEIGHTED: PowerType[] = Object.values(POWERUPS).flatMap((p) =>
  Array<PowerType>(p.weight).fill(p.type),
);

export function randomPowerType(rng: () => number = Math.random): PowerType {
  return WEIGHTED[Math.floor(rng() * WEIGHTED.length)] ?? 'wide';
}
