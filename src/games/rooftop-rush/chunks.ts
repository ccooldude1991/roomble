/*
 * Level chunks and the difficulty-tiered stitcher.
 *
 * Each chunk is authored as a string, one character per 40px terrain column:
 *   '#' rooftop        '.' gap (fall)
 *   'L' low obstacle (jump over)      'H' high sign (slide under)
 *   'o' package on the rooftop        'O' package floating over a gap
 *   'u' power-up on the rooftop
 *
 * The validator guarantees no chunk contains a gap wider than a single jump can
 * clear at the slowest speed of its tier (see reach.ts). Unit-tested.
 */
import { TIER_SPEEDS } from './config';
import { reachableGapTiles } from './reach';

export interface Column {
  ground: boolean;
  obstacle?: 'low' | 'high';
  pkg?: boolean;
  powerup?: boolean;
}

export interface Chunk {
  id: string;
  tier: number;
  cols: Column[];
}

const RAW: Array<{ id: string; tier: number; s: string }> = [
  // Tier 0 — forgiving (max gap 2)
  { id: 'flat', tier: 0, s: '########' },
  { id: 'low1', tier: 0, s: '###L####' },
  { id: 'high1', tier: 0, s: '####H###' },
  { id: 'pkgs', tier: 0, s: '##o##o##' },
  { id: 'gap2', tier: 0, s: '###..###' },
  { id: 'low-pkg', tier: 0, s: '##L##o##' },
  // Tier 1 (max gap 3)
  { id: 'gap3', tier: 1, s: '###...####' },
  { id: 'low-high', tier: 1, s: '##L###H##' },
  { id: 'dbl-low', tier: 1, s: '##L###L##' },
  { id: 'high-pkg', tier: 1, s: '###H##o##' },
  { id: 'gap-pkg', tier: 1, s: '##.O.###' },
  // Tier 2 (max gap 4)
  { id: 'gap4', tier: 2, s: '###....####' },
  { id: 'weave', tier: 2, s: '##H##L##H##' },
  { id: 'gap-mid-pkg', tier: 2, s: '##.O..###' },
  { id: 'low-gap3', tier: 2, s: '##L##...##' },
  // Tier 3 (max gap 5)
  { id: 'gap5', tier: 3, s: '###.....####' },
  { id: 'lhl', tier: 3, s: '##L##H##L##' },
  { id: 'gap-pkgs', tier: 3, s: '##.O.O.###' },
  { id: 'high-gap4', tier: 3, s: '##H##....##' },
  // Tier 4 — brutal (max gap 6)
  { id: 'gap6', tier: 4, s: '###......####' },
  { id: 'hlhl', tier: 4, s: '#H##L##H##L#' },
  { id: 'gap-pkg-run', tier: 4, s: '##.O..O.###' },
  { id: 'powerup', tier: 4, s: '####u#####' },
];

export function parseColumns(s: string): Column[] {
  return [...s].map((ch): Column => {
    switch (ch) {
      case '#':
        return { ground: true };
      case '.':
        return { ground: false };
      case 'L':
        return { ground: true, obstacle: 'low' };
      case 'H':
        return { ground: true, obstacle: 'high' };
      case 'o':
        return { ground: true, pkg: true };
      case 'O':
        return { ground: false, pkg: true };
      case 'u':
        return { ground: true, powerup: true };
      default:
        return { ground: true };
    }
  });
}

export const CHUNKS: Chunk[] = RAW.map((r) => ({
  id: r.id,
  tier: r.tier,
  cols: parseColumns(r.s),
}));

/** Longest run of non-ground columns in a chunk. */
export function maxGap(cols: Column[]): number {
  let max = 0;
  let run = 0;
  for (const c of cols) {
    if (!c.ground) {
      run++;
      max = Math.max(max, run);
    } else {
      run = 0;
    }
  }
  return max;
}

export interface ValidationError {
  id: string;
  tier: number;
  gap: number;
  allowed: number;
}

/** Every chunk's widest gap must be clearable at the slowest speed of its tier. */
export function validateChunks(chunks = CHUNKS): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const c of chunks) {
    const allowed = reachableGapTiles(TIER_SPEEDS[c.tier]!);
    const gap = maxGap(c.cols);
    if (gap > allowed) errors.push({ id: c.id, tier: c.tier, gap, allowed });
  }
  return errors;
}

/** Pick a chunk appropriate to the current tier (recent tiers, never too easy). */
export function pickChunk(tier: number, rng: () => number): Chunk {
  const lo = Math.max(0, tier - 1);
  const pool = CHUNKS.filter((c) => c.tier >= lo && c.tier <= tier);
  const list = pool.length > 0 ? pool : CHUNKS.filter((c) => c.tier <= tier);
  return list[Math.floor(rng() * list.length)] ?? CHUNKS[0]!;
}

/** A short flat breather inserted between chunks so landings are always fair. */
export function breather(n = 3): Column[] {
  return Array.from({ length: n }, () => ({ ground: true }));
}
