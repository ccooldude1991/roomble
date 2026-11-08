/*
 * Enemy definitions: stats and behaviour tags. The behaviours themselves run in
 * the scene; this file is the pure data + the elite-scaling rules, so wave budget
 * and spawn logic can be unit-tested without Phaser.
 */

export type EnemyType =
  | 'drifter'
  | 'darter'
  | 'splitter'
  | 'orbiter'
  | 'shielder'
  | 'spawner';

export interface EnemyDef {
  type: EnemyType;
  hp: number;
  speed: number;
  radius: number;
  value: number; // base score
  color: string;
  /** Cost toward a wave's budget — tougher enemies cost more. */
  cost: number;
  /** First wave this type can appear on. */
  unlockWave: number;
}

import { COLORS } from './config';

export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  drifter: { type: 'drifter', hp: 2, speed: 55, radius: 11, value: 10, color: COLORS.phosphor, cost: 1, unlockWave: 1 },
  darter: { type: 'darter', hp: 2, speed: 70, radius: 10, value: 20, color: COLORS.marquee, cost: 2, unlockWave: 2 },
  splitter: { type: 'splitter', hp: 3, speed: 48, radius: 14, value: 25, color: '#9b7bff', cost: 3, unlockWave: 3 },
  orbiter: { type: 'orbiter', hp: 3, speed: 60, radius: 11, value: 30, color: COLORS.joystick, cost: 3, unlockWave: 4 },
  shielder: { type: 'shielder', hp: 4, speed: 42, radius: 13, value: 35, color: '#6fe3ff', cost: 4, unlockWave: 5 },
  spawner: { type: 'spawner', hp: 6, speed: 16, radius: 16, value: 60, color: '#ff9a3d', cost: 5, unlockWave: 6 },
};

export const ELITE_HP_MULT = 2.4;
export const ELITE_VALUE_MULT = 2.5;
export const ELITE_SPEED_MULT = 1.15;

export interface EnemyStats {
  hp: number;
  speed: number;
  radius: number;
  value: number;
}

/** Effective stats for a (possibly elite) enemy of a type. */
export function enemyStats(type: EnemyType, elite: boolean): EnemyStats {
  const d = ENEMY_DEFS[type];
  if (!elite) return { hp: d.hp, speed: d.speed, radius: d.radius, value: d.value };
  return {
    hp: Math.round(d.hp * ELITE_HP_MULT),
    speed: d.speed * ELITE_SPEED_MULT,
    radius: d.radius + 3,
    value: Math.round(d.value * ELITE_VALUE_MULT),
  };
}

/** Enemy types available to spawn on a given wave. */
export function availableTypes(wave: number): EnemyType[] {
  return (Object.keys(ENEMY_DEFS) as EnemyType[]).filter((t) => ENEMY_DEFS[t].unlockWave <= wave);
}
