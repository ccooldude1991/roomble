# Rooftop Rush

- Slug: `rooftop-rush`
- Category: arcade
- Engine: Phaser 3 (Arcade Physics)
- Orientation: landscape preferred; on portrait phones, play in a letterboxed landscape view
  rather than forcing rotation (show a gentle "rotate for a bigger view" hint once)
- Marquee colour: `--marquee`
- Logical resolution: 640 x 360

## Pitch
A courier sprints across a neon city's rooftops at night, leaping gaps, sliding under signs and
grabbing packages. One-button simple, with near-miss bonuses that make risky play pay.

## Core loop
Auto-running character. Jump over gaps and low obstacles, slide under high obstacles. Speed
increases over time. Fall or crash ends the run. Distance is the core score.

- Variable jump height (hold to jump higher), one mid-air double jump
- Slide (short duration, can cancel into jump)
- Procedural level from hand-designed "chunks" (at least 20), stitched by difficulty tier
- Coyote time 90ms and jump buffering 100ms so it feels fair

## Original twist: near misses
Clearing an obstacle or gap edge by a tiny margin triggers a "Close call" bonus, a brief slow-mo
(150ms) and a growing multiplier. Getting hit resets it. Rewards skilful risk.

## Collectibles and power-ups
- Packages: score bonus, counted as the run's "deliveries"
- Power-ups (rare): Magnet (pulls packages), Glide (slow fall for 6s), Shield (survive one hit)

## Progression
Packages bank as coins across runs. Spend on cosmetic runner skins and trail colours (6 to start),
stored via `ctx.save`. Cosmetic only, no pay-to-win.

## Scoring
Distance in metres + packages x 25 + near-miss bonus x multiplier.

## Controls
Desktop: Space/Up/W jump (hold for height), Down/S slide, Esc/P pause.
Mobile: tap anywhere on the right half to jump (hold for height), tap/swipe down on the left half to
slide. Show both zones subtly for the first run only.

## Visuals
3 to 4 parallax layers: distant skyline silhouettes, mid buildings with lit windows, foreground
rooftops with AC units, water towers, antennas, neon signs (original invented brand names). Rain
particles in some tiers. The runner is a chunky pixel-art character drawn in code or as an
original sprite sheet, with run, jump, double-jump, slide and fall animations.

## Juice
Dust puffs on land, speed lines at high speed, camera lead in running direction, slight zoom-out as
speed rises, slow-mo + chromatic flash on close calls, crash with tumble animation and shake.

## Audio
Footstep ticks synced to run cycle, jump whoosh, land thump, package chime, close-call riser,
power-up pickup, crash.

## Attract mode
Bot that reads upcoming obstacles and jumps/slides at good timings, occasionally pulling off close
calls.

## Ads hooks
Optional rewarded break: "Continue once" after a crash (one per run). Interstitial after game over
subject to frequency cap; never show both in the same game-over.

## Done when
Checklist passes, plus: chunk stitching unit-tested to never produce impossible gaps at any speed
tier (verify jump reach math), touch zones tested, 60fps at max speed on mobile viewport.
