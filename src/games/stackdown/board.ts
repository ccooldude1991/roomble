/*
 * The well: a pure grid with collision, locking, line clears and the Shockwave.
 * Cells hold a colour string (or 0 when empty). Engine-agnostic; unit-tested in
 * board.test.ts.
 */
import { minos, type Matrix } from './pieces';

export const WIDTH = 10;
export const HEIGHT = 22; // 2 hidden rows at the top
export const VISIBLE_TOP = 2; // first visible row index
export const VISIBLE_ROWS = HEIGHT - VISIBLE_TOP; // 20

export type Cell = string | 0;

export class Board {
  grid: Cell[][];

  constructor() {
    this.grid = Board.#empty();
  }

  static #empty(): Cell[][] {
    return Array.from({ length: HEIGHT }, () => Array<Cell>(WIDTH).fill(0));
  }

  reset(): void {
    this.grid = Board.#empty();
  }

  /** True if the matrix placed with top-left at (x,y) is out of bounds or overlaps. */
  collides(matrix: Matrix, x: number, y: number): boolean {
    for (const [c, r] of minos(matrix)) {
      const gx = x + c;
      const gy = y + r;
      if (gx < 0 || gx >= WIDTH || gy >= HEIGHT) return true;
      if (gy >= 0 && this.grid[gy]![gx] !== 0) return true;
    }
    return false;
  }

  /** How many rows the piece can drop before colliding. */
  dropDistance(matrix: Matrix, x: number, y: number): number {
    let d = 0;
    while (!this.collides(matrix, x, y + d + 1)) d++;
    return d;
  }

  /** Write the piece's cells into the grid. */
  lock(matrix: Matrix, x: number, y: number, color: string): void {
    for (const [c, r] of minos(matrix)) {
      const gy = y + r;
      const gx = x + c;
      if (gy >= 0 && gy < HEIGHT && gx >= 0 && gx < WIDTH) this.grid[gy]![gx] = color;
    }
  }

  /** Indices of completely filled rows. */
  fullRows(): number[] {
    const rows: number[] = [];
    for (let r = 0; r < HEIGHT; r++) if (this.grid[r]!.every((c) => c !== 0)) rows.push(r);
    return rows;
  }

  /** Remove the given rows and drop everything above down. */
  removeRows(rows: number[]): void {
    if (rows.length === 0) return;
    const set = new Set(rows);
    const kept = this.grid.filter((_, r) => !set.has(r));
    const removed = rows.length;
    const top = Array.from({ length: removed }, () => Array<Cell>(WIDTH).fill(0));
    this.grid = [...top, ...kept];
  }

  /** Shockwave: clear the bottom `n` rows and drop the stack down by `n`. */
  shockwave(n = 2): void {
    const rows: number[] = [];
    for (let i = 0; i < n; i++) rows.push(HEIGHT - 1 - i);
    this.removeRows(rows);
  }

  /** Does any filled cell sit in the hidden rows (used for a visual danger read)? */
  highestFilledRow(): number {
    for (let r = 0; r < HEIGHT; r++) if (this.grid[r]!.some((c) => c !== 0)) return r;
    return HEIGHT;
  }
}
