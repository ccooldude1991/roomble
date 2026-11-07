/*
 * The word-ladder graph. Words of a fixed length are nodes; an edge joins two
 * words that differ in exactly one position. We don't prebuild an adjacency map:
 * neighbours are found by probing the dictionary Set, which is plenty fast for a
 * few thousand words and keeps memory tiny.
 *
 * Par is the shortest path length (number of letter changes). Hints walk one
 * optimal path, computed here on the client from the shipped dictionary — the
 * solution paths themselves are never shipped.
 */

const A = 97; // 'a'
const Z = 122; // 'z'

/** Count of positions at which two equal-length words differ. */
export function diffCount(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

export function isOneLetterApart(a: string, b: string): boolean {
  return diffCount(a, b) === 1;
}

/** All dictionary words exactly one letter away from `word`. */
export function neighbors(word: string, dict: Set<string>): string[] {
  const out: string[] = [];
  for (let i = 0; i < word.length; i++) {
    const orig = word.charCodeAt(i);
    for (let c = A; c <= Z; c++) {
      if (c === orig) continue;
      const n = word.slice(0, i) + String.fromCharCode(c) + word.slice(i + 1);
      if (dict.has(n)) out.push(n);
    }
  }
  return out;
}

/**
 * Shortest number of letter changes from `start` to `end`, or `Infinity` if
 * there is no path (or either word is missing). This is "par".
 */
export function par(start: string, end: string, dict: Set<string>): number {
  if (start === end) return 0;
  if (!dict.has(start) || !dict.has(end)) return Infinity;
  const seen = new Set<string>([start]);
  let frontier = [start];
  let d = 0;
  while (frontier.length) {
    d++;
    const next: string[] = [];
    for (const w of frontier) {
      for (const n of neighbors(w, dict)) {
        if (n === end) return d;
        if (!seen.has(n)) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return Infinity;
}

/**
 * One shortest path from `start` to `end` inclusive (BFS with parent tracking),
 * or null if unreachable. Used to compute the next hint word from wherever the
 * player currently is.
 */
export function shortestPath(start: string, end: string, dict: Set<string>): string[] | null {
  if (start === end) return [start];
  if (!dict.has(start) || !dict.has(end)) return null;
  const parent = new Map<string, string>([[start, start]]);
  let frontier = [start];
  while (frontier.length) {
    const next: string[] = [];
    for (const w of frontier) {
      for (const n of neighbors(w, dict)) {
        if (parent.has(n)) continue;
        parent.set(n, w);
        if (n === end) {
          const path = [end];
          let cur = end;
          while (cur !== start) {
            cur = parent.get(cur)!;
            path.push(cur);
          }
          return path.reverse();
        }
        next.push(n);
      }
    }
    frontier = next;
  }
  return null;
}
