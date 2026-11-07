/*
 * Stage layouts (ASCII), parsing, validation and procedural generation.
 *
 * Chars: '.' empty, N normal, T tough, S steel, X explosive, M shifter(mover),
 * Y mystery. A stage is a list of rows (top to bottom), up to COLS wide.
 *
 * The validator enforces the spec's "Done when": every stage is clearable (has a
 * breakable brick) and has no fully-enclosed breakable brick (surrounded by steel
 * on all four sides, so the ball could never reach it). Unit-tested.
 */
import { COLS, MAX_ROWS, BOSS_EVERY } from './config';
import { CHAR_TO_TYPE, isBreakable, makeBrick, type Brick, type BrickType } from './bricks';

export type Layout = string[];

export const LAYOUTS: Layout[] = [
  ['NNNNNNNNNN', 'NNNNNNNNNN', 'NNNNNNNNNN'],
  ['TTTTTTTTTT', 'NNNNNNNNNN', 'NNNNNNNNNN', 'NNNNNNNNNN'],
  ['N.N.N.N.N.', '.N.N.N.N.N', 'N.N.N.N.N.', '.N.N.N.N.N'],
  ['NNNNNNNNNN', 'N.NNNNNN.N', 'N.NNNNNN.N', 'NNNNNNNNNN'],
  ['..NNNNNN..', '.NNTTTTNN.', 'NNTYYYYTNN', '.NNTTTTNN.', '..NNNNNN..'],
  ['XNNNNNNNNX', 'NXNNNNNNXN', 'NNXNNNNXNN', 'NNNNNNNNNN'],
  ['SNSNSNSNSN', 'NNNNNNNNNN', 'NNNNNNNNNN', 'TTTTTTTTTT'],
  ['NNNNNNNNNN', 'NTNTNTNTNT', 'NNNNNNNNNN', 'NMNMNMNMNM'],
  ['.TTTTTTTT.', 'T.NNNNNN.T', 'T.NXXXXN.T', 'T.NNNNNN.T', '.TTTTTTTT.'],
  ['YNNNNNNNNY', 'NNNNNNNNNN', 'NTTTTTTTTN', 'NNNNNNNNNN', 'NNNNNNNNNN'],
  ['NNNNNNNNNN', 'NSNNNNNNSN', 'NNNNNNNNNN', 'NSNNNNNNSN', 'NNNNNNNNNN'],
  ['..X....X..', '.NNN..NNN.', 'NNNNNNNNNN', 'TTTTTTTTTT', 'NNNNNNNNNN'],
  ['MMMMMMMMMM', 'NNNNNNNNNN', 'TTTTTTTTTT', 'NNNNNNNNNN'],
  ['NYNYNYNYNY', 'YNYNYNYNYN', 'NYNYNYNYNY', 'YNYNYNYNYN'],
  ['TNTNTNTNTN', 'NTNTNTNTNT', 'TNTNTNTNTN', 'XNXNXNXNXN'],
  ['NNNNNNNNNN', 'NNTTTTTTNN', 'NTSSSSSSTN', 'NNTTTTTTNN', 'NNNNNNNNNN'],
];

export function parseLayout(layout: Layout): Brick[] {
  const bricks: Brick[] = [];
  for (let row = 0; row < layout.length; row++) {
    const line = layout[row]!;
    for (let col = 0; col < line.length && col < COLS; col++) {
      const t = CHAR_TO_TYPE[line[col]!];
      if (t) bricks.push(makeBrick(t, col, row));
    }
  }
  return bricks;
}

export interface StageError {
  reason: string;
}

export function validateLayout(layout: Layout): StageError[] {
  const errors: StageError[] = [];
  if (layout.length > MAX_ROWS) errors.push({ reason: 'too many rows' });

  const grid: (BrickType | null)[][] = [];
  let breakableCount = 0;
  for (let row = 0; row < layout.length; row++) {
    const line = layout[row]!;
    if (line.length > COLS) errors.push({ reason: `row ${row} too wide` });
    grid[row] = [];
    for (let col = 0; col < COLS; col++) {
      const t = CHAR_TO_TYPE[line[col] ?? '.'] ?? null;
      grid[row]![col] = t;
      if (t && isBreakable(t)) breakableCount++;
    }
  }

  if (breakableCount === 0) errors.push({ reason: 'no breakable bricks' });

  // No fully-enclosed breakable brick (all four orthogonal neighbours are steel).
  const isSteel = (r: number, c: number): boolean => {
    if (r < 0 || c < 0 || r >= grid.length || c >= COLS) return false; // out of grid = open
    return grid[r]![c] === 'steel';
  };
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < COLS; c++) {
      const t = grid[r]![c];
      if (!t || !isBreakable(t)) continue;
      if (isSteel(r - 1, c) && isSteel(r + 1, c) && isSteel(r, c - 1) && isSteel(r, c + 1)) {
        errors.push({ reason: `enclosed breakable at ${r},${c}` });
      }
    }

  return errors;
}

/** Deterministic procedural layout from a seed, used after the hand-made stages. */
export function generateLayout(seed: number): Layout {
  let s = (seed * 2654435761) >>> 0;
  const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
  const rows = 4 + Math.floor(rng() * 3); // 4..6
  const specials = ['N', 'N', 'N', 'T', 'T', 'X', 'M', 'Y']; // steel kept out so nothing encloses
  const layout: Layout = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    // Mirror the left half to the right for a tidy, symmetric wall.
    const half: string[] = [];
    for (let c = 0; c < COLS / 2; c++) {
      const ch = rng() < 0.15 ? '.' : specials[Math.floor(rng() * specials.length)]!;
      half.push(ch);
    }
    line = half.join('') + half.reverse().join('');
    layout.push(line);
  }
  return layout;
}

export function isBossStage(stageNum: number): boolean {
  return stageNum % BOSS_EVERY === 0;
}

export function bossVariant(stageNum: number): number {
  return (Math.floor(stageNum / BOSS_EVERY) - 1) % 4;
}

/** Layout for a non-boss stage (hand-made first, then procedural). */
export function getStageLayout(stageNum: number): Layout {
  // Count how many non-boss stages precede this one to index the hand layouts.
  let idx = 0;
  for (let s = 1; s < stageNum; s++) if (!isBossStage(s)) idx++;
  if (idx < LAYOUTS.length) return LAYOUTS[idx]!;
  return generateLayout(stageNum);
}
