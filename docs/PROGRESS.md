# Progress

## Status

**Phase 2 complete (2a + 2b).** Both first games — Stackdown and Rooftop Rush — are built in Phaser 3
to spec and live on the floor. Build, 39 unit tests and the Playwright e2e suite are green, no console
errors. Next: the **Phase 2 checkpoint** — play both on phone and desktop and send feedback so shared
lessons become rules in CLAUDE.md / DESIGN.md before the remaining four games.

Earlier: Phase 0 (scaffold + deploy) and Phase 1 (design system + site shell) complete.

## Done

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

- The other four floor games (Starfuse, Brickquake, Rungs, Arcbolt) are placeholders; their
  `/games/<slug>` pages show a "coming soon" cabinet. Stackdown and Rooftop Rush are fully playable.
- Browser-pane automation can't deliver Phaser's keyboard events (no keyCode), so keyboard play was
  verified with Playwright (real key events) instead; real browsers are unaffected.
- Preview clips don't exist yet (Phase 3), so tiles and the hero show a placeholder screen with the
  game's tagline instead of live gameplay.
- `/privacy` and `/terms` are honest **drafts** and carry a visible "Draft for review" banner — the
  owner should have them reviewed before launch; the terms governing-law line is a placeholder.
- Daily streak / puzzle number on the homepage and `/daily` are static zeros until Rungs ships
  (Phase 3).

## Next

- **Phase 2 checkpoint**: play Stackdown and Rooftop Rush on phone and desktop and send feedback.
  Feedback that applies to all games should become rules in CLAUDE.md's quality checklist or
  DESIGN.md before the remaining games.
- Then **Phase 3**: Starfuse, Brickquake, Rungs, Arcbolt, and the live preview-capture script.

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
