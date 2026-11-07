/*
 * SRS rotation with wall kicks, implemented from scratch.
 *
 * Rotation states: 0 = spawn, 1 = R (one CW), 2 = 180, 3 = L (one CCW).
 * Kick tables are the standard SRS data, stored in guideline form (x right+,
 * y up+). The grid is y-down, so a kick (dx, dyUp) moves the piece to
 * (x + dx, y - dyUp). Unit-tested in srs.test.ts.
 */
import { rotateCW, rotateCCW, type Matrix, type PieceType } from './pieces';

export type RotState = 0 | 1 | 2 | 3;

export interface Active {
  type: PieceType;
  matrix: Matrix;
  state: RotState;
  x: number; // top-left column of the matrix in the grid
  y: number; // top-left row of the matrix in the grid
}

type Kick = [number, number]; // [dx, dyUp]

// JLSTZ kicks, keyed "from>to".
const JLSTZ: Record<string, Kick[]> = {
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

// I-piece kicks.
const I_KICKS: Record<string, Kick[]> = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

export function kicksFor(type: PieceType, from: RotState, to: RotState): Kick[] {
  if (type === 'O') return [[0, 0]];
  const key = `${from}>${to}`;
  return (type === 'I' ? I_KICKS[key] : JLSTZ[key]) ?? [[0, 0]];
}

/** A collision test: returns true if a matrix at (x,y) is blocked. */
export type Collides = (matrix: Matrix, x: number, y: number) => boolean;

/**
 * Try to rotate `active` in `dir`, applying wall kicks. Returns the new Active
 * (and the kick index used, for T-spin detection later) or null if every
 * candidate is blocked.
 */
export function tryRotate(
  active: Active,
  dir: 'cw' | 'ccw',
  collides: Collides,
): { next: Active; kickIndex: number } | null {
  const matrix = dir === 'cw' ? rotateCW(active.matrix) : rotateCCW(active.matrix);
  const state = (dir === 'cw' ? (active.state + 1) % 4 : (active.state + 3) % 4) as RotState;
  const table = kicksFor(active.type, active.state, state);

  for (let i = 0; i < table.length; i++) {
    const [dx, dyUp] = table[i]!;
    const nx = active.x + dx;
    const ny = active.y - dyUp;
    if (!collides(matrix, nx, ny)) {
      return { next: { type: active.type, matrix, state, x: nx, y: ny }, kickIndex: i };
    }
  }
  return null;
}
