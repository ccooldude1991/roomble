import { describe, it, expect } from 'vitest';
import { Pool } from './pool';

interface Item {
  active: boolean;
  v: number;
}

const make = () => ({ active: false, v: 0 }) as Item;

describe('Pool', () => {
  it('pre-allocates a fixed-length array', () => {
    const p = new Pool<Item>(5, make);
    expect(p.items.length).toBe(5);
    expect(p.capacity).toBe(5);
    expect(p.activeCount()).toBe(0);
  });

  it('spawns up to capacity, then returns null — never growing', () => {
    const p = new Pool<Item>(3, make);
    expect(p.spawn()).not.toBeNull();
    expect(p.spawn()).not.toBeNull();
    expect(p.spawn()).not.toBeNull();
    expect(p.spawn()).toBeNull();
    expect(p.items.length).toBe(3); // array length unchanged
    expect(p.activeCount()).toBe(3);
  });

  it('reuses freed slots without allocating new objects', () => {
    const p = new Pool<Item>(2, make);
    const a = p.spawn()!;
    const b = p.spawn()!;
    expect(p.spawn()).toBeNull();
    a.active = false; // free one
    const c = p.spawn();
    expect(c).not.toBeNull();
    expect(c === a || c === b).toBe(true); // reused an existing object
    expect(p.items.length).toBe(2);
  });

  it('simulates many spawn/free cycles with no growth (the Done-when guarantee)', () => {
    const p = new Pool<Item>(10, make);
    for (let run = 0; run < 5; run++) {
      for (let i = 0; i < 100; i++) {
        const it = p.spawn();
        if (it) it.v = i;
        // randomly free some
        p.forEach((x) => {
          if (x.v % 3 === 0) x.active = false;
        });
      }
      p.clear();
      expect(p.items.length).toBe(10);
      expect(p.activeCount()).toBe(0);
    }
  });

  it('forEach visits only active items', () => {
    const p = new Pool<Item>(4, make);
    p.spawn();
    p.spawn();
    let n = 0;
    p.forEach(() => n++);
    expect(n).toBe(2);
  });
});
