# Brickquake

- Slug: `brickquake`
- Category: arcade
- Engine: Phaser 3 (Arcade Physics, custom paddle-angle logic)
- Orientation: portrait on mobile, any on desktop
- Marquee colour: `--marquee` with `--joystick` bulbs
- Logical resolution: 400 x 640

## Pitch
Smash walls of bricks with a ball and paddle. Bricks crack, explode and chain-react, power-ups rain
down, and every fifth stage ends with a boss wall that fights back.

## Core loop
Bounce the ball off the paddle to break all breakable bricks in a stage. Lose the ball off the bottom
and lose a life (3 lives). Clear stages to progress.

- Paddle angle control: the ball's exit angle depends on where it hits the paddle (no pure
  physics bounce), clamped so it never goes near-horizontal
- Ball speed rises slightly per paddle hit within a stage, resets per stage
- 20 hand-designed stages (data files), then procedurally generated stages from patterns

## Brick types
Normal (1 hit), Tough (2 to 3 hits, visibly cracking), Steel (unbreakable), Explosive (destroys
neighbours, can chain), Shifter (moves side to side), Mystery (drops a random power-up).

## Power-ups (fall from broken bricks, catch with paddle)
Multiball (x3), Wide paddle, Laser paddle (tap/fire to shoot), Sticky paddle (catch and aim),
Fireball (passes through bricks), Slow ball, Extra life (rare). Negative pickups, rare and clearly
marked: Narrow paddle, Fast ball.

## Bosses (every 5th stage)
An original pixel creature built of bricks that moves, regenerates armour plates, and drops
slow-falling hazards to dodge. Has a visible health bar. 4 distinct bosses, then they repeat with
higher stats.

## Scoring
Brick values by type, combo bonus for breaking multiple bricks without the ball touching the paddle,
stage-clear bonus scaled by time and lives remaining.

## Controls
Desktop: mouse moves paddle (primary), arrows/A-D as alternative, Space/click launch and fire laser,
Esc/P pause.
Mobile: drag anywhere in the bottom third to move the paddle with a 1:1 offset (finger never covers
the paddle), tap to launch/fire.

## Juice
Ball trail, bricks crack in stages, explosions chain with escalating shake, hit-stop on boss hits,
paddle squash on contact, power-up capsules spin and glow, stage clear: remaining scene shatters
into particles then the next wall slides in.

## Audio
Paddle bonk, brick hits pitched by row, crack, explosion, power-up pickup, laser zap, life lost,
boss roar (synth), stage clear fanfare.

## Attract mode
Paddle tracks predicted ball landing with a slight lag so it occasionally misses for realism.

## Ads hooks
Rewarded: "Extra ball" once per game when the last life is lost. Interstitial after game over subject
to frequency cap.

## Done when
Checklist passes, plus: stage data validated by a test (every stage clearable, no fully enclosed
breakable bricks), ball can never get stuck in a horizontal loop (enforced minimum vertical speed),
tunnelling prevented at max speed.
