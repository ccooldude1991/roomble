# Progress

## Status

**Phase 3b complete.** Brickquake (the brick-breaker) is built in Phaser 3 to spec and live on the
floor. Build, 78 unit tests and the Playwright e2e suite are green, no console errors. Four games are
now playable (Stackdown, Rooftop Rush, Starfuse, Brickquake). Next: Phase 3c (Rungs + daily).

> Note: the Phase 2 checkpoint (play-and-feedback) is still open; no new global rules have been added
> to CLAUDE.md / DESIGN.md yet.

Earlier: Phase 0, Phase 1, Phase 2 (Stackdown, Rooftop Rush), Phase 3a (Starfuse) complete.

## Done

### Phase 3b — Brickquake (Phaser 3)
- **Pure, tested logic** (`src/games/brickquake/`): `bricks.ts` (6 types with hit/crack/value),
  `stages.ts` (ASCII layouts + parser + **validator** + procedural generator), `physics.ts`
  (paddle-angle bounce, min-vertical-speed, anti-tunnel substep count), `scoring.ts`, `powerups.ts`,
  `ai.ts` (attract landing prediction).
- **20 unit tests** covering the spec's "Done when": every stage is clearable with no fully-enclosed
  breakable brick (hand-made and procedural), the ball keeps a minimum vertical speed (no flat loop),
  substep counting prevents tunnelling at max speed, plus brick/scoring behaviour.
- **Phaser scene**: manual, substepped ball integrator with the custom paddle-angle bounce; ball
  speed ramps per paddle hit (resets per stage); mouse / A-D / arrows paddle, click/Space to launch.
- **Brick types**: normal, tough (cracks), steel (unbreakable), explosive (chain reaction), mystery
  (drops a power-up), shifter (present as a type — see Decisions).
- **Power-ups** (catch with the paddle): multiball ×3, wide, laser (fire!), sticky (catch + aim),
  fireball (passes through), slow ball, extra life; negative wide-marked narrow and fast.
- **Bosses** every 5th stage: a brick-built pixel creature that moves, regenerates armour, drops
  hazards to dodge, and has a health bar; stats escalate (variant + tier).
- **Juice**: ball trail, brick particles, chain-explosion shake, hit-stop on boss hits, paddle
  squash, stage-clear shatter + fade. **Audio**: paddle bonk, brick hits pitched by row, crack,
  explosion, power-up, laser, life lost, boss roar, stage clear. Reduced-motion aware.
- Attract bot tracks the predicted ball landing with lag. Wired into the registry/floor; **e2e** for
  keyboard and pointer.

### Phase 3a — Starfuse (Canvas 2D, no engine)

### Phase 3a — Starfuse (Canvas 2D, no engine)
- **Pure, tested logic** (`src/games/starfuse/`): `board.ts` (slide/merge in four directions with no
  double-merge, spawn 90%/10%, move/game-over detection, plus a traced slide for animation),
  `scoring.ts` (2^tier per fusion + chain bonus), `wells.ts` (the gravity-well twist), `ai.ts`
  (attract bot that keeps the biggest tile in a corner), `tiers.ts` (the 13-tier ladder + the
  code that draws each celestial body).
- **19 unit tests**, including the required rules — no tile merges twice in one move, spawn logic,
  and a consistency check that the traced slide matches `slide()` across random boards.
- **Canvas game** (`game.ts`): slide animation (ease-out 120ms), fusion squash-and-stretch pop with
  a particle ring, drifting starfield behind the CRT, a discovery spotlight ("First Moon"), and a
  gentle board shake + screen flare at Sun and above. Reuses the shared juice (Particles, Shaker,
  easings) and services (`ctx.audio` incl. `playPitched`, `ctx.save`).
- **The twist — gravity wells**: every 25 moves a tile becomes a telegraphed well for 3 moves; on
  expiry it pulls matching orthogonal neighbours in, chaining upward. Toggleable (classic mode).
- **Extras**: one undo per game, a discovered-tiers collection strip, best-tile stat, and a settings
  overlay (wells on/off, and 5×5 "big sky" which unlocks after reaching a Sun). Pentatonic fusion
  tones so chains sound musical; new-discovery chime; game-over hum.
- **Controls**: arrows/WASD (U undo, R restart-with-confirm) and swipe (threshold 30px); undo and
  settings buttons above the board. Wired into the registry/floor; **e2e** for keyboard and swipe.

### Phase 2b — Rooftop Rush (Phaser 3)

### Phase 2b — Rooftop Rush (Phaser 3)
- **Pure, tested logic** (`src/games/rooftop-rush/`): `config.ts` (shared physics constants),
  `reach.ts` (jump-reach maths), `chunks.ts` (22 hand-authored ASCII chunks + tier stitcher +
  a validator that guarantees no gap is unclearable at its tier), `scoring.ts`, `cosmetics.ts`
  (coins banked via `ctx.save`, 6 unlockable trail colours), `ai.ts` (attract bot).
- **13 unit tests**, including the required "chunk stitching never produces an impossible gap at any
  speed tier" check (verifies the jump-reach math), plus scoring, cosmetics and bot decisions.
- **Phaser scene**: one-button auto-runner with variable jump height, a mid-air double jump, slide
  (cancellable into jump), coyote time (90ms) and jump buffering (100ms); speed ramps over the run.
- **Original twist — near misses**: clearing an obstacle by a hair triggers a Close call — brief
  slow-mo, a rising-pitch riser and a growing multiplier; a hit resets it.
- **Collectibles / power-ups**: packages (score + banked coins) and Magnet / Glide / Shield.
- **Visuals + juice**: 3 parallax city layers with lit windows, rooftops with a neon edge, a
  code-drawn runner (run/jump/slide/tumble), trail in the equipped colour, dust on landing, speed
  lines, camera zoom-out with speed, slow-mo flash, crash tumble + shake. Reduced-motion aware.
- **Audio** (`sfx.ts`): footsteps, jump/double/land, slide, package chime, close-call riser
  (played via the shared `audio.playPitched`), power-up, crash.
- **Controls**: keyboard (Space/Up/W jump, hold for height; Down/S slide) and touch zones (right =
  jump, left = slide) with a first-run hint; plays letterboxed in portrait (no forced rotation, with
  a gentle "rotate for a bigger view" hint) per the spec.
- **Shared-utility improvements** (reused by both games): added `audio.playPitched(preset, freq)` and
  a reusable `SlowMo` helper in `src/juice`; Stackdown's combo sound now uses `playPitched` too.
- Wired into the registry/floor as playable; **e2e** smoke tests for keyboard and touch.

### Phase 2a — Stackdown (Phaser 3)

### Phase 2a — Stackdown (Phaser 3)
- **Pure, tested logic** (engine-agnostic, in `src/games/stackdown/`): `pieces.ts` (7 tetrominoes,
  matrix rotation, 7-bag randomiser), `srs.ts` (SRS rotation with full JLSTZ + I wall-kick tables,
  from scratch), `board.ts` (10×22 well with 2 hidden rows, collision, lock, line clear, Shockwave),
  `scoring.ts` (1/2/3/4 = 100/300/500/800 ×level, back-to-back ×1.5, combo bonus, level every 10
  lines, tuned gravity curve), `ai.ts` (attract heuristic: height/lines/holes/bumpiness).
- **26 unit tests** cover rotation + kicks, the 7-bag, board clears/shockwave, and scoring.
- **Phaser scene** (`scene.ts`): DAS 160 / ARR 40, lock delay 500ms with ≤15 resets, soft/hard drop,
  hold (once per drop), next-3 preview, ghost piece, and the **charge → Shockwave** twist.
- **Juice**: ghost + glowing pieces, line-clear flash + particles + hit-stop, bigger shake and a
  "STACKDOWN" stamp on a tetris, combo popups with rising pitch, a charge meter, level-up flash, and
  a red danger vignette near the top. All scaled down / off under reduced motion.
- **Audio**: ZzFX presets (`sfx.ts`) for move, rotate, lock, hold, four ascending clears, shockwave,
  level-up and game-over.
- **Controls**: keyboard (arrows/X/Z/Space/C/E/P) and touch gestures (drag to move, tap to rotate,
  swipe down to hard drop, drag down to soft drop, swipe up to hold) plus on-screen Hold/Shock
  buttons on touch devices.
- **Attract mode**: the AI self-plays, and the shell now runs a game's `attract()` behind the idle
  title ("animated falling pieces behind the logo"), stopping it when Play is pressed.
- **Shell additions**: per-game screen `aspect` (portrait games are height-fitted so the whole well
  shows on desktop and mobile); the game-over modal now renders extra stats (lines, level).
- Stackdown is wired into the registry as playable and shows on the floor.
- **e2e** (`stackdown.spec.ts`): keyboard hard-drop scores (desktop) and a pointer swipe-down hard
  drop (phone viewport), both asserting via a small telemetry hook.

### Phase 0 / Phase 1 (earlier)

### Phase 0 (earlier)
- Astro (static) + TypeScript strict, folder structure, `src/config/site.ts`, Vitest + Playwright
  (four viewports), GitHub Pages deploy workflow with env-driven base path, placeholder homepage.
  Live at https://ccooldude1991.github.io/roomble/.

### Phase 1
- **Design system** — `src/design/tokens.css` (colour, 1.25 type scale, radii, spacing, glow,
  motion), `src/design/global.css` (reset, base type, the arcade **carpet** pattern drawn in SVG,
  focus styles, reduced-motion handling, the `is-playing` scroll lock).
- **Fonts** — self-hosted via `@fontsource` (OFL): Bungee, Bungee Shade (logo), Chakra Petch
  (UI/body, weights 400/500/600/700), VT323 (HUD). Only the weights used are imported.
- **Pixel icon set** — in-house `Icon.astro` (play, pause, sound-on/off, fullscreen, share, back,
  settings, close) on a 16×16 grid, currentColor, crisp edges. No third-party icon set.
- **Components** — `Marquee` (chasing bulbs), `CrtScreen` (scanlines/vignette/glow/power-on),
  `Cabinet`, `ArcadeButton` (primary/secondary/icon, depressing edge), `ScoreReadout` (VT323
  count-up), `GameTile`, `AdSlot`, `SoundToggle`, `RotatePrompt`, `Modal` (native `<dialog>`),
  `Toast`.
- **Pages** — homepage (attract hero + daily panel + "the floor" with per-game marquee colours),
  `/games/[slug]` template (cabinet + how-to + controls + ads + "more cabinets"), `/daily`,
  `/about`, `/privacy`, `/terms` (both marked clearly as drafts for review), and a 404
  ("This cabinet's out of order…"). Copy written in the DESIGN.md voice.
- **Game host** — `src/shell/host.ts` + `src/shell/GameHost.astro`: lazy-loads the GameModule on
  Play, builds the GameContext, pauses on blur/hidden (auto-resumes on return), fullscreen, rotate
  prompt, scroll/zoom lock during play, best-score persistence, pause menu, game-over flow, and
  restart via remount. `src/shell/toast.ts` for notifications.
- **Services** — `audio` (ZzFX, lazy context unlocked on first gesture, mute persists), `save`
  (namespaced, versioned, safe fallbacks), `input` (keyboard/gesture/gamepad), `ads` (none/adsense/
  h5games with the AdSlot and interstitial frequency-cap rules; provider `none` active), `leaderboard`
  (no-op), `analytics` (no-op).
- **Juice** — `src/juice`: easings, rAF `tween`, `Shaker`, `Hitstop`, `Particles`, `Popups`, all
  reduced-motion aware.
- **cabinet-test** — hidden game (not on the public floor) implementing the full GameModule contract
  (mount/pause/resume/destroy + attract) to verify the shell.

## Decisions

- **Shell owns the common screens.** The pause menu, game-over overlay, best score and restart live
  in the shell so every game gets them free; games emit `start`/`gameover` and may draw their own
  in-game title/how-to. Restart is a destroy + remount (no page reload).
- **Game-page UI is one component** (`GameHost.astro`) wired by a client script that pulls the lazy
  loader from the registry by slug — so only the opened game's bundle loads.
- **Registry** (`src/games/registry.ts`) is the single source for the floor and game pages. Stackdown
  is playable; the other five are `coming-soon` placeholders with full meta taken from `specs/`;
  `cabinet-test` is a hidden, playable shell-verification game.
- **Audio context is created lazily** on the first user gesture (not at import), avoiding the browser
  autoplay-warning and keeping the "no console warnings" bar.
- **Fonts self-hosted via @fontsource** rather than Google Fonts links — faster, no third-party
  request (cleaner for the future ads/consent story), and still OFL. Logged in CREDITS.md.
- **New dependencies**: `phaser` 3.90.0 (pinned exact; arcade/action engine, code-split so it loads
  only on the Stackdown page — the homepage stays light), `@fontsource/*` (fonts, OFL), `zzfx`
  (MIT, sound), `@types/node` (dev). All justified above.
- **Stackdown runs attract on page load** (not only on Play) to power the live title; this loads the
  Phaser chunk on the game page, which the lazy-load rule allows ("only on its own page").

## Known issues

- Rungs and Arcbolt are still placeholders ("coming soon" cabinets); Stackdown, Rooftop Rush,
  Starfuse and Brickquake are fully playable.
- Browser-pane automation can't deliver Phaser's keyboard events (no keyCode), so keyboard play was
  verified with Playwright (real key events) instead; real browsers are unaffected.
- Preview clips don't exist yet (Phase 3), so tiles and the hero show a placeholder screen with the
  game's tagline instead of live gameplay.
- `/privacy` and `/terms` are honest **drafts** and carry a visible "Draft for review" banner — the
  owner should have them reviewed before launch; the terms governing-law line is a placeholder.
- Daily streak / puzzle number on the homepage and `/daily` are static zeros until Rungs ships
  (Phase 3).

## Next

- **Phase 3c**: Rungs (`specs/05-rungs.md`) — the daily word-ladder, its build-time puzzle generator,
  and wiring the homepage daily panel + `/daily`.
- Then Phase 3d Arcbolt, 3e the preview-capture script.
- The Phase 2 checkpoint (play-and-feedback) is still open and can run whenever the owner wants.

## Decisions (Phase 3b — Brickquake)

- **Manual substepped ball physics instead of Arcade Physics bodies.** The scene uses Phaser 3 for
  scene/loop/input/render but integrates the ball itself in small substeps. This is what makes the
  spec's guarantees enforceable and testable: the custom paddle-angle bounce, a minimum vertical
  speed (no flat loop), and no tunnelling through bricks at max speed.
- **Shifter brick** is present as a distinct type (colour + value) but its side-to-side motion is
  deferred — the grid-keyed collision assumes fixed cells; adding moving bricks needs a separate
  non-grid collision pass. Everything else about it works.
- **Bosses**: one brick-creature body with per-stage stat/colour variants (hp, speed, hazard rate)
  rather than four hand-drawn shapes; the fight mechanics (health bar, armour regen, dodge hazards,
  beatable) are all in. More distinct shapes can be added later.

## Decisions (Phase 2b)

- **Deterministic fixed-step integrator instead of Arcade Physics bodies.** Rooftop Rush uses Phaser
  3 for the scene/loop/input/rendering but integrates the runner's vertical motion and resolves
  terrain/obstacle collisions manually. This keeps world scrolling and the close-call slow-mo exact
  and frame-rate independent, and makes the gap-reachability guarantee testable. (Recorded per
  CLAUDE.md's "make a sensible choice and record it".)
- **Orientation 'any' for Rooftop** (though landscape-preferred) so portrait phones play letterboxed
  with a gentle hint rather than being blocked by a forced-rotation prompt, as the spec requires.
- **Cosmetics** are trail colours (6) that also tint the runner — cosmetic only, unlocked with banked
  coins, stored via `ctx.save`. A full skin/shop screen can come later; this keeps the loop intact.
