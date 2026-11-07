/*
 * Brick types and their behaviour (pure). Hit logic, hp, breakability and score
 * value. Unit-tested.
 */
export type BrickType = 'normal' | 'tough' | 'steel' | 'explosive' | 'shifter' | 'mystery';

export interface Brick {
  type: BrickType;
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  alive: boolean;
}

const HP: Record<BrickType, number> = {
  normal: 1,
  tough: 2,
  steel: Infinity,
  explosive: 1,
  shifter: 1,
  mystery: 1,
};

const VALUE: Record<BrickType, number> = {
  normal: 10,
  tough: 30,
  steel: 0,
  explosive: 25,
  shifter: 20,
  mystery: 15,
};

export const BRICK_COLORS: Record<BrickType, string> = {
  normal: '#4df0d0',
  tough: '#8fb0ff',
  steel: '#8a8f98',
  explosive: '#ff3d6e',
  shifter: '#c06cff',
  mystery: '#ffc21a',
};

export const CHAR_TO_TYPE: Record<string, BrickType> = {
  N: 'normal',
  T: 'tough',
  S: 'steel',
  X: 'explosive',
  M: 'shifter', // "mover"
  Y: 'mystery',
};

export function isBreakable(type: BrickType): boolean {
  return type !== 'steel';
}

export function makeBrick(type: BrickType, col: number, row: number): Brick {
  const hp = HP[type];
  return { type, col, row, hp, maxHp: hp === Infinity ? 1 : hp, alive: true };
}

export function brickValue(type: BrickType): number {
  return VALUE[type];
}

export interface HitResult {
  destroyed: boolean;
  /** This brick explodes its neighbours when destroyed. */
  explosive: boolean;
}

/** Apply one hit to a brick (fireball passes a `power` to one-shot it). */
export function hitBrick(brick: Brick, power = false): HitResult {
  if (!brick.alive) return { destroyed: false, explosive: false };
  if (brick.type === 'steel' && !power) return { destroyed: false, explosive: false };
  brick.hp = power ? 0 : brick.hp - 1;
  if (brick.hp <= 0) {
    brick.alive = false;
    return { destroyed: true, explosive: brick.type === 'explosive' };
  }
  return { destroyed: false, explosive: false };
}

/** Crack level 0..1 for drawing (tough bricks visibly crack). */
export function crackLevel(brick: Brick): number {
  if (brick.maxHp <= 1) return 0;
  return 1 - brick.hp / brick.maxHp;
}
