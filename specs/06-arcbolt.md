# Arcbolt

- Slug: `arcbolt`
- Category: arcade
- Engine: Phaser 3 (Arcade Physics, object pooling for bullets/particles)
- Orientation: landscape preferred, playable letterboxed in portrait
- Marquee colour: `--phosphor` with `--joystick` bulbs
- Logical resolution: 640 x 360 (arena larger than screen, camera follows)

## Pitch
A twin-stick arena shooter in glowing vector style. Survive waves of geometric enemies, pick an
upgrade between waves, and build a ship that turns the arena into a light show.

## Core loop
Move freely in a bounded arena; aim and fire independently. Clear a wave, choose 1 of 3 upgrades,
next wave. Run ends when hull reaches zero.

## Enemies (vector shapes, each with a readable behaviour)
Drifter (slow, chases), Darter (charges in straight lines after a telegraph), Splitter (splits into
two smaller on death), Orbiter (circles and fires slow shots), Shielder (front shield, hit from
behind), Spawner (stationary, emits drifters). Elite variants glow brighter with more HP. Boss every
10 waves.

## Upgrades (pick 1 of 3 between waves)
Fire rate, spread shot, piercing, ricochet, homing, bigger bullets, drone ally, dash cooldown, hull
up, magnet for pickups, chain lightning on kill. Some stack; show current build in the pause menu.

## Movement
Dash on a cooldown with brief invulnerability, leaves an afterimage trail.

## Scoring
Kills by enemy value, x multiplier that rises with kills and drops when hit, wave-clear bonus.
Secondary stats: wave reached, accuracy.

## Controls
Desktop: WASD move, mouse aim, hold left click (or auto-fire toggle) to fire, Space/Shift dash,
Esc/P pause. Gamepad: left stick move, right stick aim+fire, RB dash.
Mobile: twin virtual sticks. Left stick appears where the left thumb lands (floating), right stick
aims and auto-fires while held, dash button above the right stick. Sticks are drawn as on-brand
arcade joysticks, translucent.

## Visuals
Neon vector lines with additive-blend glow on the dark arena grid. The grid warps slightly around
explosions (spring-mesh effect; scale down on mobile if costly). Enemies are clean geometric
outlines with distinct colours per type.

## Juice
Muzzle flashes, bullet trails, enemy hit flash + knockback, death bursts into line-segment particles,
screen shake scaled by explosion size, hit-stop on elite kills, slow-mo when the last enemy of a
wave dies, upgrade cards flip in.

## Audio
Laser pew variants (slight random pitch), enemy hit, explosions in three sizes, dash whoosh, pickup
blip, wave clear chime, upgrade select, low-hull warning pulse.

## Performance
Object pools for bullets, enemies and particles; cap particles on mobile; test 150 enemies + 300
bullets at 60fps on a mid-range mobile profile.

## Attract mode
Bot that kites enemies in circles and fires at nearest threats.

## Ads hooks
Rewarded: "Revive with half hull" once per run. Interstitial after game over subject to frequency
cap; never both in one game-over.

## Done when
Checklist passes, plus: twin-stick touch controls tested on touch emulation, pools verified (no
growing object counts across 5 runs), gamepad support tested if hardware unavailable via the
Gamepad API mock.
