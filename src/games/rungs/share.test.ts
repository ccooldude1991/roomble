import { describe, it, expect } from 'vitest';
import { shareText } from './share';

describe('share text', () => {
  it('matches the spoiler-free format (steps/par, one square per rung)', () => {
    const text = shareText({
      title: 'Rungs',
      number: 142,
      steps: 5,
      par: 4,
      hints: [false, false, true, false, false],
      url: 'roomble.example/rungs',
    });
    expect(text).toBe('Rungs #142  5/4 par\n\u{1F7E9}\u{1F7E9}\u{1F7E8}\u{1F7E9}\u{1F7E9}\nroomble.example/rungs');
  });

  it('uses all green squares for a hint-free climb', () => {
    const text = shareText({
      title: 'Rungs',
      number: 7,
      steps: 4,
      par: 4,
      hints: [false, false, false, false],
      url: 'https://roomble.example/games/rungs',
    });
    const lines = text.split('\n');
    expect(lines[0]).toBe('Rungs #7  4/4 par');
    expect(lines[1]).toBe('\u{1F7E9}\u{1F7E9}\u{1F7E9}\u{1F7E9}');
    expect(lines[2]).toBe('https://roomble.example/games/rungs');
  });

  it('never leaks the words, only the shape of the climb', () => {
    const text = shareText({
      title: 'Rungs',
      number: 3,
      steps: 6,
      par: 6,
      hints: [false, true, false, false, true, false],
      url: 'x',
    });
    const squares = text.split('\n')[1]!;
    expect(squares).not.toMatch(/[a-z]/i); // no letters on the squares line
    expect(squares).toBe('\u{1F7E9}\u{1F7E8}\u{1F7E9}\u{1F7E9}\u{1F7E8}\u{1F7E9}');
  });
});
