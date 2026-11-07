/*
 * Attract-mode AI: a placement heuristic so the self-playing demo looks
 * competent. For the current piece it tries every rotation and column, simulates
 * the hard drop, and scores the result with well-known weights
 * (height / lines / holes / bumpiness).
 */
import { SPAWN, rotateCW, minos, type Matrix, type PieceType } from './pieces';
import { Board, WIDTH, HEIGHT, type Cell } from './board';

export interface Placement {
  state: number; // rotation state 0..3
  x: number; // target column (matrix top-left)
  matrix: Matrix;
}

// El-Tetris style weights.
const W_HEIGHT = -0.51;
const W_LINES = 0.76;
const W_HOLES = -0.36;
const W_BUMP = -0.18;

function rotations(type: PieceType): Matrix[] {
  const out: Matrix[] = [];
  let m = SPAWN[type];
  const count = type === 'O' ? 1 : 4;
  for (let i = 0; i < count; i++) {
    out.push(m);
    m = rotateCW(m);
  }
  return out;
}

function evaluate(grid: Cell[][]): number {
  const heights = new Array(WIDTH).fill(0);
  let holes = 0;
  for (let c = 0; c < WIDTH; c++) {
    let seen = false;
    for (let r = 0; r < HEIGHT; r++) {
      if (grid[r]![c] !== 0) {
        if (!seen) {
          seen = true;
          heights[c] = HEIGHT - r;
        }
      } else if (seen) {
        holes++;
      }
    }
  }
  const aggregate = heights.reduce((a: number, b: number) => a + b, 0);
  let bumpiness = 0;
  for (let c = 0; c < WIDTH - 1; c++) bumpiness += Math.abs(heights[c] - heights[c + 1]);
  let lines = 0;
  for (let r = 0; r < HEIGHT; r++) if (grid[r]!.every((x) => x !== 0)) lines++;
  return W_HEIGHT * aggregate + W_LINES * lines + W_HOLES * holes + W_BUMP * bumpiness;
}

/** Choose the best placement for `type` on `board`, or null if none fits. */
export function bestPlacement(board: Board, type: PieceType): Placement | null {
  let best: Placement | null = null;
  let bestScore = -Infinity;
  const rots = rotations(type);

  for (let state = 0; state < rots.length; state++) {
    const matrix = rots[state]!;
    for (let x = -2; x <= WIDTH; x++) {
      if (board.collides(matrix, x, 0)) continue;
      const y = board.dropDistance(matrix, x, 0);
      // Simulate placement on a clone.
      const clone = board.grid.map((row) => row.slice());
      let valid = true;
      for (const [c, r] of minos(matrix)) {
        const gx = x + c;
        const gy = y + r;
        if (gy < 0 || gy >= HEIGHT || gx < 0 || gx >= WIDTH) {
          valid = false;
          break;
        }
        clone[gy]![gx] = '#fff';
      }
      if (!valid) continue;
      const score = evaluate(clone);
      if (score > bestScore) {
        bestScore = score;
        best = { state, x, matrix };
      }
    }
  }
  return best;
}
