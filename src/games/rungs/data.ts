/*
 * Typed access to the generated data (built by scripts/build-rungs.ts). The word
 * dictionaries and the year of puzzles are shipped; the solution paths are not.
 */
import puzzlesRaw from './data/puzzles.json';
import wordsRaw from './data/words.json';
import type { PuzzleData } from './daily';

export const PUZZLES = puzzlesRaw as PuzzleData;

const WORDS = wordsRaw as Record<string, string[]>;

/** The dictionary (as a Set) for a given word length, built once per length. */
const cache = new Map<number, Set<string>>();

export function dictFor(len: number): Set<string> {
  let d = cache.get(len);
  if (!d) {
    d = new Set(WORDS[String(len)] ?? []);
    cache.set(len, d);
  }
  return d;
}

export function wordCount(len: number): number {
  return (WORDS[String(len)] ?? []).length;
}
