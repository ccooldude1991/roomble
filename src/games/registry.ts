/*
 * The game registry: the single list the site reads to build the floor and the
 * game pages. Each entry carries the game's meta, its marquee colour, whether
 * it's playable yet, and a lazy loader for its GameModule.
 *
 * Phase 1: the six arcade games are placeholders ("coming-soon"); only the
 * hidden "cabinet-test" game is playable, so we can verify the shell.
 */
import type { GameMeta, GameModule } from './types';

export type MarqueeColor = 'marquee' | 'phosphor' | 'joystick' | 'ticket';

export interface GameEntry {
  meta: GameMeta;
  color: MarqueeColor;
  status: 'playable' | 'coming-soon';
  /** Hidden from the public floor (e.g. the shell test game). */
  hidden?: boolean;
  /** Spans two columns on the floor. */
  featured?: boolean;
  /** Lazy import of the GameModule. Undefined until the game is built. */
  load?: () => Promise<GameModule | { default: GameModule }>;
}

export const games: GameEntry[] = [
  {
    color: 'phosphor',
    status: 'coming-soon',
    featured: true,
    meta: {
      slug: 'stackdown',
      title: 'Stackdown',
      tagline: 'Stack the falling blocks, clear full rows, chase the combo.',
      description:
        'A falling-block puzzle about building up, then clearing big. Complete full rows to detonate them in a cascade, stack combos for a rising multiplier, and feel the tempo climb as you reach higher tiers.',
      howToPlay: [
        'Move and rotate each falling piece.',
        'Fill a full row to clear it.',
        "Keep the stack low — it's over when a piece can't spawn.",
      ],
      controls: {
        desktop: ['Arrow keys or A / D to move', 'Up or W to rotate', 'Down to soft drop, Space to hard drop'],
        mobile: ['Swipe left or right to move', 'Tap to rotate', 'Swipe down to drop'],
      },
      orientation: 'portrait',
      category: 'arcade',
    },
  },
  {
    color: 'marquee',
    status: 'coming-soon',
    meta: {
      slug: 'rooftop-rush',
      title: 'Rooftop Rush',
      tagline: 'Sprint the neon rooftops. Jump the gaps, slide the signs.',
      description:
        'A night-time rooftop sprint. Your courier runs on their own; you time the jumps over gaps and the slides under signs, chaining near-misses for bonus distance. Simple to start, hard to put down.',
      howToPlay: [
        'Your runner moves on their own.',
        'Jump over gaps and low obstacles.',
        'Slide under high obstacles and grab packages.',
      ],
      controls: {
        desktop: ['Space, W or Up to jump', 'Down or S to slide'],
        mobile: ['Tap to jump', 'Swipe down to slide'],
      },
      orientation: 'landscape',
      category: 'arcade',
    },
  },
  {
    color: 'joystick',
    status: 'coming-soon',
    meta: {
      slug: 'starfuse',
      title: 'Starfuse',
      tagline: 'Slide and fuse matching bodies, from dust to rocks to stars.',
      description:
        'Slide the whole board and fuse matching bodies into bigger ones — dust into rocks, rocks into moons, on toward a star and beyond. Every move counts and the next merge is always one slide away. Calm and quietly addictive.',
      howToPlay: [
        'Swipe or press a direction to slide every tile.',
        'Two matching tiles that meet fuse into the next tier.',
        'Keep fusing before the board fills up.',
      ],
      controls: {
        desktop: ['Arrow keys to slide', 'R to restart'],
        mobile: ['Swipe up, down, left or right to slide'],
      },
      orientation: 'portrait',
      category: 'puzzle',
    },
  },
  {
    color: 'marquee',
    status: 'coming-soon',
    meta: {
      slug: 'brickquake',
      title: 'Brickquake',
      tagline: 'Break the wall with ball and paddle. Mind the boss stage.',
      description:
        'Break walls of bricks with a ball and paddle. Bricks crack, explode and chain-react, power-ups drop into the fray, and every fifth stage throws a boss wall that fights back. Angle your shots and keep the ball alive.',
      howToPlay: [
        'Move the paddle to bounce the ball.',
        'Break every breakable brick to clear the stage.',
        "Don't let the ball fall past the paddle.",
      ],
      controls: {
        desktop: ['Mouse, A / D or Arrows to move', 'Space to launch'],
        mobile: ['Drag to move the paddle', 'Tap to launch'],
      },
      orientation: 'portrait',
      category: 'arcade',
    },
  },
  {
    color: 'ticket',
    status: 'coming-soon',
    meta: {
      slug: 'rungs',
      title: 'Rungs',
      tagline: 'Change one letter at a time from the start word to the end.',
      description:
        'Climb from a start word to an end word, changing one letter at a time, every step a real word. One puzzle a day, the same for everyone. Beat par, hold your streak, and share the shape of your climb.',
      howToPlay: [
        'Start from the given word.',
        'Change one letter to make a new real word.',
        'Reach the end word in as few steps as you can.',
      ],
      controls: {
        desktop: ['Type letters', 'Enter to submit a word', 'Backspace to edit'],
        mobile: ['Use the on-screen keyboard', 'Tap enter to submit'],
      },
      orientation: 'any',
      category: 'daily',
      daily: true,
    },
  },
  {
    color: 'phosphor',
    status: 'coming-soon',
    meta: {
      slug: 'arcbolt',
      title: 'Arcbolt',
      tagline: 'Twin-stick arena shooter. Clear waves, pick upgrades, light it up.',
      description:
        'A twin-stick arena shooter in glowing vector style. Move and aim independently, survive waves of geometric enemies, and pick an upgrade after each one to build a ship that turns the arena into a light show.',
      howToPlay: [
        'Move around the bounded arena.',
        'Aim and fire independently.',
        'Clear each wave, then choose one of three upgrades.',
      ],
      controls: {
        desktop: ['WASD to move', 'Mouse to aim, click or hold to fire'],
        mobile: ['Left stick to move', 'Right stick to aim and fire'],
      },
      orientation: 'landscape',
      category: 'arcade',
    },
  },
  // Hidden shell verification game — not shown on the public floor.
  {
    color: 'phosphor',
    status: 'playable',
    hidden: true,
    load: () => import('./cabinet-test'),
    meta: {
      slug: 'cabinet-test',
      title: 'Cabinet Test',
      tagline: 'Shell check: tap the ball before the timer runs out.',
      description:
        'A tiny built-in game used to verify the site shell — mounting and teardown, pause on blur, fullscreen, best-score persistence and the game-over flow. Not part of the public arcade.',
      howToPlay: [
        'Tap or click the moving ball to score.',
        'Each hit makes it a little faster.',
        'Rack up points before the timer runs out.',
      ],
      controls: {
        desktop: ['Click the ball', 'P or Esc to pause'],
        mobile: ['Tap the ball', 'Use the pause button'],
      },
      orientation: 'any',
      category: 'arcade',
    },
  },
];

export const floorGames = games.filter((g) => !g.hidden);

export function getEntry(slug: string): GameEntry | undefined {
  return games.find((g) => g.meta.slug === slug);
}

export function getMeta(slug: string): GameMeta | undefined {
  return getEntry(slug)?.meta;
}
