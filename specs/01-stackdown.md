# Stackdown

- Slug: `stackdown`
- Category: arcade (puzzle-arcade)
- Engine: Phaser 3
- Orientation: portrait on mobile, any on desktop
- Marquee colour: `--phosphor`
- Logical resolution: 360 x 640 (playfield 10 x 20 cells)

## Pitch
A falling-block puzzle that rewards building up and then clearing big. Lines detonate with a
satisfying cascade, combos stack a multiplier, and the music speeds up as you climb tiers.

## Core loop
Pieces made of four cells fall into a 10 x 20 well. Move, rotate and drop them to complete full rows,
which clear. Game ends when a new piece cannot spawn.

- 7 piece shapes, 7-bag randomiser (every shape once per bag)
- Rotation with wall kicks (standard SRS-style kick tables, implemented from scratch)
- Hold piece (once per drop), next-3 preview, ghost piece showing landing spot
- Lock delay 500ms, reset on move/rotate up to 15 times
- Soft drop and hard drop

## Original twist: charge
Each cleared line adds to a charge meter. When full, the player can trigger a **Shockwave** that
clears the bottom two rows with a big visual blast. Encourages planning without breaking the core.

## Scoring
- 1 / 2 / 3 / 4 lines: 100 / 300 / 500 / 800 x level
- Back-to-back 4-line clears: x1.5
- Combo (consecutive clearing drops): +50 x combo x level
- Hard drop: 2 points per cell; soft drop: 1 per cell
- Level up every 10 lines; gravity follows a tuned curve (start forgiving, ~0.8s per row at level 1)

## Controls
Desktop: Left/Right move (with DAS 160ms, ARR 40ms), Up or X rotate clockwise, Z rotate counter,
Down soft drop, Space hard drop, C hold, E shockwave, Esc/P pause.

Mobile: gestures on the playfield. Tap = rotate, drag horizontally = move (snaps per cell), quick
swipe down = hard drop, drag down slowly = soft drop, swipe up = hold. A small on-brand button bar
below the well for Hold and Shockwave. Optional "button mode" in settings with a 4-button pad for
players who dislike gestures.

## Juice
- Pieces glow faintly in their colour; the well has a CRT phosphor trail on hard drops
- Line clear: row flashes white, cells burst into particles left-to-right, short hit-stop (60ms)
- 4-line clear: bigger shake, full-screen phosphor flash, "STACKDOWN" stamp in Bungee
- Combo counter pops above the well, rising pitch per combo step
- Level up: marquee bulbs chase around the well frame
- Danger: when the stack is within 4 rows of the top, edge vignette pulses red (`--joystick`)

## Audio
Move tick, rotate blip, lock thud, line clears (four ascending variants), shockwave boom, level-up
jingle, game over descending tone. Optional chiptune loop whose tempo steps up with level.

## Screens
Title (animated falling pieces behind the logo), how-to-play (3 panels), pause, game over with lines,
level, best score.

## Attract mode
A simple AI placing pieces using a heuristic (minimise holes and height, favour line clears) so the
preview looks competent.

## Ads hooks
Interstitial break allowed after game over (subject to global frequency cap). No rewarded continue.

## Done when
All checklist items in CLAUDE.md pass, plus: rotation and kick logic unit-tested, 7-bag unit-tested,
DAS/ARR feel tested on keyboard, gesture controls tested on a touch emulation viewport.
