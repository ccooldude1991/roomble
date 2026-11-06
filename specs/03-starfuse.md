# Starfuse

- Slug: `starfuse`
- Category: puzzle
- Engine: plain TypeScript + Canvas 2D (or DOM with CSS transforms if smoother), no Phaser
- Orientation: portrait on mobile, any on desktop
- Marquee colour: `--joystick`
- Board: 4 x 4 (unlock 5 x 5 "big sky" mode after reaching a Sun)

## Pitch
Slide the board to fuse matching celestial bodies into bigger ones: dust into rocks, rocks into
moons, moons into planets, all the way to a star and beyond. Calm, satisfying and hard to put down.

## Core loop
Swipe or press an arrow: every tile slides as far as it can in that direction. Two tiles of the same
tier that collide fuse into the next tier. After each move, a new tier-1 (90%) or tier-2 (10%) tile
appears in a random empty cell. Game ends when no move is possible.

Tier ladder (each with its own drawn look, glow and colour):
Dust, Pebble, Rock, Moonlet, Moon, Ice planet, Rocky planet, Ringed planet, Gas giant, Sun,
Blue giant, Nebula, Black hole (final).

## Original twist: gravity wells
Every 25 moves, one random tile becomes a gravity well for 3 moves: tiles adjacent to it that match
fuse automatically when the well expires. Visible, telegraphed and optional to exploit. Toggleable
"classic" mode without wells.

## Scoring
Each fusion scores the value of the new tier (2^tier). Chain fusions in one move add a small bonus.
Track best tile reached as a secondary stat.

## Undo
One undo per game by default. Rewarded ad can grant one extra undo (ads hook).

## Controls
Desktop: arrows / WASD, U undo, R restart (with confirm), Esc/P pause.
Mobile: swipe on the board (threshold ~30px, direction from dominant axis). Undo and menu buttons
below the board.

## Visuals
Tiles are drawn celestial bodies, not numbered squares. Each tier has a distinct silhouette and
colour, a subtle idle animation (slow rotation, shimmering rings), and its name shown small. The
background is a slowly drifting starfield behind the CRT glass. A collection panel shows tiers
discovered so far.

## Juice
Tiles slide with ease-out (120ms), fusions squash-and-stretch then pop with a ring of particles,
new tiers discovered get a short spotlight moment ("First Moon"), reaching Sun and above shakes the
board gently and flares the screen.

## Audio
Soft slide whoosh, fusion tones rising in pitch with tier (pentatonic so chains sound musical), new
discovery chime, game over hum.

## Attract mode
Bot that prefers moves keeping the biggest tile in a corner.

## Ads hooks
Rewarded: extra undo (max one per game). Interstitial after game over subject to frequency cap.

## Done when
Checklist passes, plus: slide/merge rules unit-tested (including no double-merge in one move), spawn
logic tested, swipe detection tested on touch emulation.
