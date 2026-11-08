/*
 * Wave composition. Pure and deterministic given a seeded RNG, so the difficulty
 * curve is testable: budget grows with the wave, only unlocked types appear, every
 * 10th wave is a boss, and elites start showing up from wave 5.
 */
import { ENEMY_DEFS, availableTypes, type EnemyType } from './enemies';
import { MAX_ENEMIES } from './config';

export interface SpawnSpec {
  type: EnemyType;
  elite: boolean;
}

export interface WavePlan {
  wave: number;
  boss: boolean;
  spawns: SpawnSpec[];
}

export type Rng = () => number;

/** Deterministic PRNG. Same seed → same sequence. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isBossWave(wave: number): boolean {
  return wave > 0 && wave % 10 === 0;
}

export function waveBudget(wave: number): number {
  return 4 + wave * 2;
}

export function eliteChance(wave: number): number {
  if (wave < 5) return 0;
  return Math.min(0.28, 0.03 * (wave - 4));
}

/** Spawns never exceed this, leaving headroom for splitters and spawner children. */
export function spawnCap(): number {
  return Math.floor(MAX_ENEMIES * 0.4);
}

export function composeWave(wave: number, rng: Rng): WavePlan {
  if (isBossWave(wave)) return { wave, boss: true, spawns: [] };

  const types = availableTypes(wave);
  const ec = eliteChance(wave);
  const cap = spawnCap();
  let budget = waveBudget(wave);
  const spawns: SpawnSpec[] = [];

  while (budget > 0 && spawns.length < cap) {
    const affordable = types.filter((t) => ENEMY_DEFS[t].cost <= budget);
    if (!affordable.length) break;
    const type = affordable[Math.floor(rng() * affordable.length)]!;
    const def = ENEMY_DEFS[type];
    // Elites only when affordable (they cost 1.5x, rounded up).
    const eliteCost = Math.ceil(def.cost * 1.5);
    const elite = ec > 0 && rng() < ec && eliteCost <= budget;
    budget -= elite ? eliteCost : def.cost;
    spawns.push({ type, elite });
  }

  return { wave, boss: false, spawns };
}
