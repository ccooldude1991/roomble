/*
 * Attract-mode bot. Prefers moves that keep the biggest tile pinned in a corner
 * (classic merge-game strategy) while keeping the board open. Pure.
 */
import { slide, emptyCells, maxTile, type Grid, type Dir } from './board';

const DIRS: Dir[] = ['down', 'left', 'right', 'up'];

function cornerBonus(g: Grid): number {
  const n = g.length;
  const m = maxTile(g);
  const corners = [g[0]![0], g[0]![n - 1], g[n - 1]![0], g[n - 1]![n - 1]];
  return corners.includes(m) ? 200 : 0;
}

function evaluate(g: Grid): number {
  return emptyCells(g).length * 12 + cornerBonus(g) + maxTile(g) * 2;
}

/** Best move for the current board, or null if nothing moves. */
export function bestMove(grid: Grid): Dir | null {
  let best: Dir | null = null;
  let bestScore = -Infinity;
  for (const dir of DIRS) {
    const res = slide(grid, dir);
    if (!res.moved) continue;
    const score = evaluate(res.grid) + res.merges.length * 20;
    if (score > bestScore) {
      bestScore = score;
      best = dir;
    }
  }
  return best;
}
