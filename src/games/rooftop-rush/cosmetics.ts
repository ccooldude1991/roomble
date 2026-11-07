/*
 * Cosmetics: runner trail colours (also tint the runner). Cosmetic only — no
 * gameplay effect. Packages bank as coins across runs; coins unlock cosmetics.
 * All state goes through the game's SaveService (ctx.save).
 */
import type { SaveService } from '../types';

export interface Cosmetic {
  id: string;
  name: string;
  color: string;
  cost: number; // coins; 0 = free / unlocked by default
}

export const COSMETICS: Cosmetic[] = [
  { id: 'phosphor', name: 'Phosphor', color: '#4df0d0', cost: 0 },
  { id: 'marquee', name: 'Amber', color: '#ffc21a', cost: 150 },
  { id: 'joystick', name: 'Hot pink', color: '#ff3d6e', cost: 150 },
  { id: 'sky', name: 'Sky', color: '#5b8cff', cost: 300 },
  { id: 'lime', name: 'Lime', color: '#6fe26f', cost: 300 },
  { id: 'violet', name: 'Violet', color: '#c06cff', cost: 500 },
];

const COINS_KEY = 'coins';
const UNLOCKED_KEY = 'unlocked';
const EQUIPPED_KEY = 'equipped';

export function getCoins(save: SaveService): number {
  return save.get<number>(COINS_KEY, 0);
}

export function addCoins(save: SaveService, n: number): void {
  save.set(COINS_KEY, getCoins(save) + Math.max(0, n));
}

export function unlockedIds(save: SaveService): string[] {
  const stored = save.get<string[]>(UNLOCKED_KEY, []);
  // The first cosmetic is always unlocked.
  return Array.from(new Set(['phosphor', ...stored]));
}

export function isUnlocked(save: SaveService, id: string): boolean {
  return unlockedIds(save).includes(id);
}

/** Attempt to buy a cosmetic. Returns true on success (enough coins). */
export function unlock(save: SaveService, id: string): boolean {
  const cosmetic = COSMETICS.find((c) => c.id === id);
  if (!cosmetic) return false;
  if (isUnlocked(save, id)) return true;
  const coins = getCoins(save);
  if (coins < cosmetic.cost) return false;
  save.set(COINS_KEY, coins - cosmetic.cost);
  save.set(UNLOCKED_KEY, Array.from(new Set([...unlockedIds(save), id])));
  return true;
}

export function getEquipped(save: SaveService): Cosmetic {
  const id = save.get<string>(EQUIPPED_KEY, 'phosphor');
  const c = COSMETICS.find((x) => x.id === id && isUnlocked(save, id));
  return c ?? COSMETICS[0]!;
}

export function equip(save: SaveService, id: string): boolean {
  if (!isUnlocked(save, id)) return false;
  save.set(EQUIPPED_KEY, id);
  return true;
}
