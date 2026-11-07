/*
 * Tetromino definitions, matrix rotation, and the 7-bag randomiser.
 * Pure, engine-agnostic logic (unit-tested in pieces.test.ts).
 */
export type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type Matrix = number[][]; // 1 = filled, 0 = empty, square NxN

export const PIECE_TYPES: readonly PieceType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

/** Colour id per piece (mapped to CSS tokens in the renderer). */
export const PIECE_COLORS: Record<PieceType, string> = {
  I: '#4df0d0', // phosphor
  J: '#5b8cff', // blue
  L: '#ffa23d', // orange
  O: '#ffc21a', // marquee yellow
  S: '#6fe26f', // green
  T: '#c06cff', // purple
  Z: '#ff3d6e', // joystick pink
};

/** Spawn matrices (SRS). 3x3 for JLSTZ, 4x4 for I, 2x2 for O. */
export const SPAWN: Record<PieceType, Matrix> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

/** Rotate a square matrix clockwise: new[r][c] = old[N-1-c][r]. */
export function rotateCW(m: Matrix): Matrix {
  const n = m.length;
  const out: Matrix = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out[r]![c] = m[n - 1 - c]![r]!;
  return out;
}

/** Rotate counter-clockwise: new[r][c] = old[c][N-1-r]. */
export function rotateCCW(m: Matrix): Matrix {
  const n = m.length;
  const out: Matrix = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out[r]![c] = m[c]![n - 1 - r]!;
  return out;
}

/** Local (col,row) offsets of the filled cells in a matrix. */
export function minos(m: Matrix): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < m.length; r++)
    for (let c = 0; c < m[r]!.length; c++) if (m[r]![c]) cells.push([c, r]);
  return cells;
}

/** 7-bag randomiser: each shape appears once per bag, bags reshuffled. */
export class SevenBag {
  #bag: PieceType[] = [];
  #rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.#rng = rng;
  }

  #refill(): void {
    const b = [...PIECE_TYPES];
    // Fisher-Yates
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(this.#rng() * (i + 1));
      [b[i], b[j]] = [b[j]!, b[i]!];
    }
    this.#bag = b;
  }

  next(): PieceType {
    if (this.#bag.length === 0) this.#refill();
    return this.#bag.shift()!;
  }

  /** Peek the next `count` pieces without consuming (refills as needed). */
  peek(count: number): PieceType[] {
    while (this.#bag.length < count) {
      const b = [...PIECE_TYPES];
      for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(this.#rng() * (i + 1));
        [b[i], b[j]] = [b[j]!, b[i]!];
      }
      this.#bag.push(...b);
    }
    return this.#bag.slice(0, count);
  }
}
