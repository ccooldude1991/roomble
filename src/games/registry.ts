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
  /** CSS aspect-ratio of the game screen (matches the game's logical resolution). */
  aspect?: string;
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
    status: 'playable',
    featured: true,
    aspect: '9 / 16',
    load: () => import('./stackdown'),
    meta: {
      slug: 'stackdown',
      title: 'Stackdown',
      tagline: 'Stack the falling blocks, clear full rows, chase the combo.',
      description:
        'A falling-block puzzle about building up, then clearing big. Complete full rows to detonate them in a cascade, stack combos for a rising multiplier, and feel the tempo climb as you reach higher tiers. Charge the meter to trigger a Shockwave that blasts the bottom rows.',
      howToPlay: [
        'Move and rotate each falling piece.',
        'Fill a full row to clear it; clear four at once for a Stackdown.',
        "Keep the stack low — it's over when a new piece can't appear.",
      ],
      controls: {
        desktop: [
          'Left / Right to move, Up or X to rotate, Z to rotate back',
          'Down to soft drop, Space to hard drop',
          'C to hold, E for Shockwave, P or Esc to pause',
        ],
        mobile: [
          'Drag sideways to move, tap to rotate',
          'Swipe down to hard drop, drag down to soft drop',
          'Swipe up to hold; use the Hold / Shock buttons',
        ],
      },
      orientation: 'portrait',
      category: 'arcade',
    },
  },
  {
    color: 'marquee',
    status: 'playable',
    aspect: '16 / 9',
    load: () => import('./rooftop-rush'),
    meta: {
      slug: 'rooftop-rush',
      title: 'Rooftop Rush',
      tagline: 'Sprint the neon rooftops. Jump the gaps, slide the signs.',
      description:
        'A courier sprints across a neon city at night, leaping gaps, sliding under signs and grabbing packages. One button to play, with near-miss bonuses that reward risky lines — clear an obstacle by a hair for slow-mo and a rising multiplier. Bank packages to unlock trail colours.',
      howToPlay: [
        'You run automatically — keep going.',
        'Jump over gaps and low obstacles (hold to jump higher, tap again to double-jump).',
        'Slide under high signs. Clear things by a hair for a Close call bonus.',
      ],
      controls: {
        desktop: ['Space, Up or W to jump (hold for height)', 'Down or S to slide', 'P or Esc to pause'],
        mobile: ['Tap the right side to jump (hold for height)', 'Tap the left side to slide'],
      },
      // 'any' so portrait phones play letterboxed rather than being forced to rotate.
      orientation: 'any',
      category: 'arcade',
    },
  },
  {
    color: 'joystick',
    status: 'playable',
    aspect: '3 / 4',
    load: () => import('./starfuse'),
    meta: {
      slug: 'starfuse',
      title: 'Starfuse',
      tagline: 'Slide and fuse matching bodies, from dust to rocks to stars.',
      description:
        'Slide the whole board and fuse matching celestial bodies into bigger ones — dust into rocks, rocks into moons, on toward a star and beyond. Gravity wells appear every so often and pull matching neighbours together. Calm, satisfying and hard to put down.',
      howToPlay: [
        'Swipe or press a direction to slide every tile.',
        'Two matching bodies that meet fuse into the next tier.',
        'Keep fusing before the board fills up. One undo per game.',
      ],
      controls: {
        desktop: ['Arrows or WASD to slide', 'U to undo, R to restart', 'P or Esc to pause'],
        mobile: ['Swipe to slide', 'Undo and settings buttons above the board'],
      },
      orientation: 'portrait',
      category: 'puzzle',
    },
  },
  {
    color: 'marquee',
    status: 'playable',
    aspect: '5 / 8',
    load: () => import('./brickquake'),
    meta: {
      slug: 'brickquake',
      title: 'Brickquake',
      tagline: 'Break the wall with ball and paddle. Mind the boss stage.',
      description:
        'Smash walls of bricks with a ball and paddle. Bricks crack, explode and chain-react, power-ups rain down to catch, and every fifth stage ends with a boss wall that fights back. The ball leaves the paddle based on where it hits, so you aim with the paddle.',
      howToPlay: [
        'Move the paddle to bounce the ball.',
        'Break every breakable brick to clear the stage.',
        "Catch power-ups; don't let the ball fall past the paddle (3 lives).",
      ],
      controls: {
        desktop: ['Mouse moves the paddle (or A / D, arrows)', 'Space or click to launch and fire lasers', 'P or Esc to pause'],
        mobile: ['Drag in the lower area to move the paddle', 'Tap to launch and to fire'],
      },
      orientation: 'portrait',
      category: 'arcade',
    },
  },
  {
    color: 'ticket',
    status: 'coming-soon',
    aspect: '3 / 4',
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
    aspect: '16 / 9',
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
    aspect: '3 / 4',
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
