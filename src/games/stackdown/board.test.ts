import { describe, it, expect } from 'vitest';
import { Board, WIDTH, HEIGHT } from './board';
import { SPAWN } from './pieces';

describe('Board', () => {
  it('starts empty and reports out-of-bounds collisions', () => {
    const b = new Board();
    expect(b.collides(SPAWN.O, -1, 0)).toBe(true); // off the left
    expect(b.collides(SPAWN.O, WIDTH - 1, 0)).toBe(true); // off the right (O is 2 wide)
    expect(b.collides(SPAWN.O, 0, 0)).toBe(false);
  });

  it('computes the hard-drop distance down an empty column', () => {
    const b = new Board();
    // O piece occupies rows y and y+1; it rests with bottom at HEIGHT-1.
    expect(b.dropDistance(SPAWN.O, 0, 0)).toBe(HEIGHT - 2);
  });

  it('detects and removes full rows, dropping the stack', () => {
    const b = new Board();
    const bottom = HEIGHT - 1;
    for (let c = 0; c < WIDTH; c++) b.grid[bottom]![c] = '#fff';
    b.grid[bottom - 1]![0] = '#abc'; // a marker above the full row
    expect(b.fullRows()).toEqual([bottom]);
    b.removeRows([bottom]);
    expect(b.fullRows()).toEqual([]);
    // The marker fell one row, to the bottom.
    expect(b.grid[bottom]![0]).toBe('#abc');
  });

  it('shockwave clears the bottom two rows and drops the stack by two', () => {
    const b = new Board();
    b.grid[HEIGHT - 3]![0] = '#mark';
    b.shockwave(2);
    expect(b.grid[HEIGHT - 1]![0]).toBe('#mark');
    expect(b.grid[HEIGHT - 3]![0]).toBe(0);
  });

  it('collides against locked cells', () => {
    const b = new Board();
    b.lock(SPAWN.O, 0, HEIGHT - 2, '#fff');
    expect(b.collides(SPAWN.O, 0, HEIGHT - 2)).toBe(true);
    expect(b.collides(SPAWN.O, 2, HEIGHT - 2)).toBe(false);
  });
});
