import { describe, it, expect } from 'vitest';
import { diffCount, isOneLetterApart, neighbors, par, shortestPath } from './graph';

// A tiny hand-built dictionary with a known ladder:
//   cat -> cot -> dot -> dog   (par 3)
//   cat -> cot -> cog -> dog   (par 3, alternative)
const DICT = new Set(['cat', 'cot', 'cog', 'dot', 'dog', 'dig', 'big', 'bag', 'bat']);

describe('one-letter-change validator', () => {
  it('counts differing positions', () => {
    expect(diffCount('cat', 'cot')).toBe(1);
    expect(diffCount('cat', 'dog')).toBe(3);
    expect(diffCount('cat', 'cat')).toBe(0);
    expect(diffCount('cat', 'cats')).toBe(Infinity); // different length
  });

  it('accepts exactly one changed letter, same length, same positions', () => {
    expect(isOneLetterApart('cat', 'cot')).toBe(true);
    expect(isOneLetterApart('cat', 'bat')).toBe(true);
    expect(isOneLetterApart('cat', 'cat')).toBe(false); // no change
    expect(isOneLetterApart('cat', 'dog')).toBe(false); // three changes
    expect(isOneLetterApart('cat', 'act')).toBe(false); // anagram, not one swap in place
  });

  it('finds dictionary neighbours only', () => {
    const n = neighbors('cat', DICT).sort();
    expect(n).toEqual(['bat', 'cot']);
  });
});

describe('par (BFS shortest path length)', () => {
  it('is 0 for identical words', () => {
    expect(par('dog', 'dog', DICT)).toBe(0);
  });

  it('is 1 for adjacent words', () => {
    expect(par('cat', 'cot', DICT)).toBe(1);
  });

  it('computes the shortest number of changes', () => {
    expect(par('cat', 'dog', DICT)).toBe(3); // cat-cot-cog-dog or cat-cot-dot-dog
    expect(par('cat', 'dig', DICT)).toBe(4); // cat-cot-cog-dog-dig
  });

  it('is Infinity when unreachable or a word is missing', () => {
    expect(par('cat', 'zzz', DICT)).toBe(Infinity);
    expect(par('qqq', 'dog', DICT)).toBe(Infinity);
  });
});

describe('shortestPath (for hints)', () => {
  it('returns an inclusive optimal path', () => {
    const path = shortestPath('cat', 'dog', DICT)!;
    expect(path[0]).toBe('cat');
    expect(path[path.length - 1]).toBe('dog');
    expect(path.length).toBe(4); // start + 3 changes
    // Every consecutive pair differs by exactly one letter and is in the dict.
    for (let i = 1; i < path.length; i++) {
      expect(isOneLetterApart(path[i - 1]!, path[i]!)).toBe(true);
      expect(DICT.has(path[i]!)).toBe(true);
    }
  });

  it('returns a single-element path for identical words', () => {
    expect(shortestPath('dog', 'dog', DICT)).toEqual(['dog']);
  });

  it('returns null when unreachable', () => {
    expect(shortestPath('cat', 'zzz', DICT)).toBeNull();
  });
});
