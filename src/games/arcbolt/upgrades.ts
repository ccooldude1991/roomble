/*
 * Upgrades: the between-wave "pick 1 of 3". Pure catalog + derivation so the build
 * maths and the offer logic are testable without the scene.
 */
import { FIRE_CD, BULLET_R, DASH_CD, HULL_MAX } from './config';
import type { Rng } from './waves';

export type UpgradeId =
  | 'fireRate'
  | 'spread'
  | 'pierce'
  | 'ricochet'
  | 'homing'
  | 'bigBullets'
  | 'drone'
  | 'dashCd'
  | 'hull'
  | 'magnet'
  | 'chain';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  max: number;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  fireRate: { id: 'fireRate', name: 'Fire rate', desc: 'Shoot faster', max: 5 },
  spread: { id: 'spread', name: 'Spread shot', desc: 'Extra bullets, fan out', max: 3 },
  pierce: { id: 'pierce', name: 'Piercing', desc: 'Bullets punch through', max: 3 },
  ricochet: { id: 'ricochet', name: 'Ricochet', desc: 'Bullets bounce off walls', max: 2 },
  homing: { id: 'homing', name: 'Homing', desc: 'Bullets curve to enemies', max: 2 },
  bigBullets: { id: 'bigBullets', name: 'Big bullets', desc: 'Larger, harder-hitting shots', max: 3 },
  drone: { id: 'drone', name: 'Drone ally', desc: 'An orbiting drone that fires', max: 3 },
  dashCd: { id: 'dashCd', name: 'Quick dash', desc: 'Shorter dash cooldown', max: 3 },
  hull: { id: 'hull', name: 'Hull up', desc: 'Repair and raise max hull', max: 6 },
  magnet: { id: 'magnet', name: 'Magnet', desc: 'Pull in pickups from afar', max: 3 },
  chain: { id: 'chain', name: 'Chain lightning', desc: 'Kills arc to nearby foes', max: 3 },
};

export const ALL_UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

export type Build = Partial<Record<UpgradeId, number>>;

export function levelOf(build: Build, id: UpgradeId): number {
  return build[id] ?? 0;
}

export function isMaxed(build: Build, id: UpgradeId): boolean {
  return levelOf(build, id) >= UPGRADES[id].max;
}

/** Apply one pick. Returns a new build (never mutates). */
export function applyUpgrade(build: Build, id: UpgradeId): Build {
  if (isMaxed(build, id)) return build;
  return { ...build, [id]: levelOf(build, id) + 1 };
}

export interface DerivedStats {
  fireCd: number; // seconds between shots
  bulletCount: number; // bullets per shot
  spreadArc: number; // radians spanned by a volley
  pierce: number; // enemies a bullet passes through
  ricochet: number; // wall bounces
  homing: number; // turn rate (rad/s), 0 = none
  bulletR: number;
  bulletDamage: number;
  drones: number;
  dashCd: number;
  hullMax: number;
  magnetRadius: number; // 0 = no magnet
  chain: number; // extra targets a kill arcs to
}

export function deriveStats(build: Build): DerivedStats {
  const fr = levelOf(build, 'fireRate');
  const spread = levelOf(build, 'spread');
  const big = levelOf(build, 'bigBullets');
  return {
    fireCd: Math.max(0.06, FIRE_CD * Math.pow(0.84, fr)),
    bulletCount: 1 + spread * 2,
    spreadArc: spread === 0 ? 0 : (Math.PI / 9) * spread, // ~20° per level
    pierce: levelOf(build, 'pierce'),
    ricochet: levelOf(build, 'ricochet'),
    homing: levelOf(build, 'homing') * 3.2,
    bulletR: BULLET_R + big * 1.6,
    bulletDamage: 1 + big, // bigger bullets hit harder
    drones: levelOf(build, 'drone'),
    dashCd: DASH_CD * Math.pow(0.8, levelOf(build, 'dashCd')),
    hullMax: HULL_MAX + levelOf(build, 'hull'),
    magnetRadius: levelOf(build, 'magnet') * 70,
    chain: levelOf(build, 'chain'),
  };
}

/**
 * Offer three distinct upgrades not yet maxed. If fewer than three remain, falls
 * back to repeatable picks so the player is never offered nothing. Deterministic
 * given the RNG.
 */
export function pickThree(build: Build, rng: Rng): UpgradeId[] {
  const pool = ALL_UPGRADE_IDS.filter((id) => !isMaxed(build, id));
  const shuffled = shuffle(pool, rng);
  const chosen = shuffled.slice(0, 3);
  // Fallback: if everything is maxed (unlikely), offer hull repairs.
  while (chosen.length < 3) chosen.push('hull');
  return chosen;
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
