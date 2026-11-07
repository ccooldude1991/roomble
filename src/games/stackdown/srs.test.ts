import { describe, it, expect } from 'vitest';
import { tryRotate, type Active } from './srs';
import { SPAWN } from './pieces';

describe('SRS rotation + kicks', () => {
  it('rotates cleanly when the basic position is free', () => {
    const active: Active = { type: 'T', matrix: SPAWN.T, state: 0, x: 3, y: 0 };
    const res = tryRotate(active, 'cw', () => false);
    expect(res).not.toBeNull();
    expect(res!.next.state).toBe(1);
    expect(res!.kickIndex).toBe(0);
    expect(res!.next.x).toBe(3);
  });

  it('applies a wall kick when the no-kick position is blocked', () => {
    const active: Active = { type: 'T', matrix: SPAWN.T, state: 0, x: 3, y: 0 };
    // Block only the first candidate (0,0 offset → stays at x=3,y=0).
    const collides = (_m: number[][], x: number, y: number) => x === 3 && y === 0;
    const res = tryRotate(active, 'cw', collides);
    expect(res).not.toBeNull();
    // Second 0>1 kick is (-1, 0): x moves to 2.
    expect(res!.kickIndex).toBe(1);
    expect(res!.next.x).toBe(2);
    expect(res!.next.y).toBe(0);
  });

  it('returns null when every candidate is blocked', () => {
    const active: Active = { type: 'T', matrix: SPAWN.T, state: 0, x: 3, y: 0 };
    const res = tryRotate(active, 'cw', () => true);
    expect(res).toBeNull();
  });

  it('O piece rotation never kicks', () => {
    const active: Active = { type: 'O', matrix: SPAWN.O, state: 0, x: 4, y: 0 };
    const res = tryRotate(active, 'cw', () => false);
    expect(res!.kickIndex).toBe(0);
    expect(res!.next.x).toBe(4);
  });
});
