# Progress

## Status

**Phase 3e complete.** `npm run capture` records every game's `attract()` self-play into a short
looping clip, a poster frame and a branded Open Graph share image, and the homepage hero + floor
cabinets now show the live loops (the tagline placeholders are the fallback). Build, 157 unit tests
and the Playwright e2e suite are green, no console errors. **All six games are playable** and the
floor is now showing real gameplay. Next: the Phase 2 play-and-feedback checkpoint, or Phase 4 (ads).

> Note: the Phase 2 checkpoint (play-and-feedback) is still open; no new global rules have been added
> to CLAUDE.md / DESIGN.md yet.

Earlier: Phase 0, Phase 1, Phase 2 (Stackdown, Rooftop Rush), Phase 3a (Starfuse), Phase 3b
(Brickquake), Phase 3c (Rungs), Phase 3d (Arcbolt) complete.

## Done

### Phase 3e — gameplay previews + share images (`npm run capture`)
- **Capture script** (`scripts/capture-previews.ts`, run with `npm run capture`): starts `astro dev`
  with `CAPTURE=1`, drives a dev-only harness with Playwright, runs each game's own `attract()`
  self-play, and writes per game into `public/previews/`:
  - `<slug>.webm` (+ `<slug>.mp4` when ffmpeg is present) — a short looping gameplay clip
  - `<slug>.jpg` — a poster frame (also the reduced-motion still)
  - `<slug>.og.png` — a branded 1200×630 Open Graph share image (wordmark + marquee + framed screen)
  - records what exists in `src/previews.manifest.json`. Takes optional slug args to capture one game.
- **Dev-only harness** (`src/pages/capture/[slug].astro`, `capture/og/[slug].astro`, `_capture.ts`):
  `getStaticPaths` returns nothing unless `CAPTURE=1`, so a normal `npm run build` emits none of these
  routes (verified: `dist/` has no `/capture`). The Astro dev toolbar is disabled during capture so it
  never bleeds into a frame.
- **`<GamePreview>` component**: a looping `<video>` over a poster. `preload="none"` + `data-src`
  sources mean nothing downloads until the clip nears the viewport (one shared IntersectionObserver
  hydrates + plays it, pauses it off-screen). `prefers-reduced-motion`: the clip never loads, the
  static poster shows instead. Falls back to the tagline placeholder when a game has no capture yet.
- **Wired in**: homepage hero (featured game) and every floor + "more games" tile. Game pages emit
  per-game Open Graph / Twitter card meta (`og:image` → the share image) via `BaseLayout`.

### Phase 3d — Arcbolt (Phaser 3 twin-stick shooter)
- **Pure, tested logic** (`src/games/arcbolt/`): `geometry.ts` (vector maths + projectile lead),
  `enemies.ts` (type stats + elite scaling), `waves.ts` (deterministic wave composition, boss every
  10th wave, budget/elite ramps), `upgrades.ts` (11-upgrade catalog, build derivation, pick-1-of-3),
  `scoring.ts` (kill multiplier rise/drop, wave bonus, accuracy), `ai.ts` (attract kite + targeting),
  `pool.ts` (fixed-capacity object pool).
- **42 unit tests** covering the spec: wave schedule + budget, upgrade stacking/derivation/offers,
  the kill multiplier, geometry/lead, and a pool test proving no object growth across repeated
  spawn/free cycles.
- **Phaser scene** (`scene.ts`): free movement in a camera-followed arena larger than the screen;
  independent aim + fire; dash with i-frames and an afterimage trail. Six enemy types with distinct
  behaviours (drifter, darter with telegraph, splitter, orbiter that leads shots, front-shielded
  shielder, drifter-spawner) plus elites and a boss every 10th wave. Between waves: three upgrade
  cards (flip-in), applied to a build shown as a HUD strip. Neon vector rendering into one world
  Graphics; explosion shock-rings warp the grid; screen shake, hit-stop on elite/boss kills, slow-mo
  on the last kill of a wave, muzzle flashes, line-segment death bursts, low-hull warning, pickups +
  magnet, chain lightning, drones, homing/pierce/ricochet bullets.
- **Entities are pooled** (bullets 400, enemies 200, particles 500/220, enemy bullets 240, pickups
  60) — counts never grow (unit- and e2e-verified). Particle cap drops on touch/reduced-motion.
- **Controls**: WASD/arrows + mouse-aim + hold/auto-fire (F) + Space/Shift dash on desktop; gamepad
  (left stick move, right stick aim+fire, RB dash); **floating twin-stick touch** (left thumb moves,
  right thumb aims + auto-fires, dash button by the right stick), drawn as translucent arcade sticks.
- **3 e2e tests**: keyboard clear + score climb, twin-stick touch on a touch-emulated landscape
  phone, and a pool-stability check (active counts never exceed fixed capacities).

### Phase 3c — Rungs (daily word ladder) + generator + daily panel
- **Offline generator** (`scripts/build-rungs.ts`, run with `npm run build:rungs`): downloads and
  caches ENABLE (validity) + an OpenSubtitles frequency list (commonness), builds a dictionary per
  length (4 and 5) reduced to the largest one-letter-change component (every puzzle solvable), and
  generates a year of daily puzzles (par 4–8, no repeated pairs, limited endpoint reuse) aligned to
  `RUNGS_EPOCH`. Output committed to `src/games/rungs/data/` (`words.json`, `puzzles.json`); raw
  source lists are git-ignored. **Solution paths are never shipped** — hints are computed client-side
  by BFS over the dictionary.
- **Pure, tested logic** (`src/games/rungs/`): `graph.ts` (one-letter neighbours, BFS **par**,
  shortest path for hints), `validate.ts` (one-letter-change validator + messages), `daily.ts`
  (Singapore-day date math, weekday/weekend length, puzzle selection), `streaks.ts` (streak/dist,
  missed-day reset, same-day no-double-count), `share.ts` (spoiler-free share text).
- **37 Rungs unit tests** covering the spec's "Done when": BFS par, one-letter validator, date
  rollover across time zones, streak logic, share text — plus a data-integrity test that re-derives
  every shipped puzzle's par by a fresh BFS over the shipped dictionary.
- **Game** (`game.ts`): DOM/CSS neon ladder — goal word glowing at the top, start at the bottom, each
  accepted rung lighting up with the changed letter in marquee gold; custom on-screen arcade keyboard
  (also physical keyboard, captured so typing never triggers shell shortcuts), target-letter key
  highlights after the first move, up to 2 hints, invalid-word shake + buzz, solve light-up +
  letter-tile confetti, results screen (mini ladder squares, streak/max/played, over-par histogram)
  with share (clipboard + Web Share), practice mode, and an attract demo that types out a solved
  ladder. Daily result persists so a revisit shows the finished climb.
- **Homepage daily panel + `/daily`**: show the live `Rungs #N` and the viewer's streak (computed
  client-side from tiny pure modules only — the word data is **not** pulled into the homepage bundle,
  so the <200 KB budget holds). `/daily` no longer says "coming soon".
- **Config**: `RUNGS_EPOCH` added to `src/config/site.ts` (puzzle #1 date; generator is aligned to
  it).
- **Shell fix (affects all portrait games)**: on phones narrower than the portrait screen the cabinet
  used to overflow and clip (e.g. the right keyboard keys). Fixed by giving the portrait cabinet a
  definite `width: min(100%, 440px)` and the game-page grid column `minmax(0, 1fr)` so the
  height-driven screen can't push the column wider than the page. Verified Rungs fits fully at 375px.

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
- **Registry** (`src/games/registry.ts`) is the single source for the floor and game pages. All six
  games are playable (Stackdown, Rooftop Rush, Starfuse, Brickquake, Rungs, Arcbolt); `cabinet-test`
  is a hidden, playable shell-verification game.
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

- All six games are now playable; there are no "coming soon" cabinets left on the floor.
- Browser-pane automation can't deliver Phaser's keyboard events (no keyCode) and auto-pauses on
  blur, so keyboard and twin-stick play were verified with Playwright (real events) instead; real
  browsers are unaffected.
- Arcbolt tuning is a first pass: standing still gets you swarmed quickly (as intended — you must
  move and dash), but the exact wave/elite ramp and hull economy are worth a play-test pass.
- Preview clips don't exist yet (Phase 3), so tiles and the hero show a placeholder screen with the
  game's tagline instead of live gameplay.
- `/privacy` and `/terms` are honest **drafts** and carry a visible "Draft for review" banner — the
  owner should have them reviewed before launch; the terms governing-law line is a placeholder.
- The daily puzzle data covers one year from `RUNGS_EPOCH`; beyond that puzzles wrap (still valid,
  but the weekday/weekend 4/5-letter pattern drifts). Re-run `npm run build:rungs` yearly to refresh.

## Next

- The collection is content-complete through Phase 3: six games, all with live previews and share
  images. Re-run `npm run capture` whenever a game's look changes to refresh its clips.
- The Phase 2 checkpoint (play-and-feedback) is still open and can run whenever the owner wants.
- **Phase 4**: turn ads on (the `<AdSlot>` + ad-service plumbing already exists; needs a publisher ID,
  a consent CMP, and `ads.txt`).

## Decisions (Phase 3e — previews)

- **Previews are committed assets, generated offline.** Like the Rungs word data, `npm run capture`
  is run by hand (not part of `npm run build`), and its output in `public/previews/` + the manifest in
  `src/previews.manifest.json` are committed, so the deploy build needs no browser/ffmpeg and ships the
  clips as-is.
- **ffmpeg is optional.** With it, clips are trimmed past the boot frames to a clean ~7s loop and an
  `.mp4` (H.264) is produced for broad support (incl. iOS Safari); without it the raw WebM is kept and
  the manifest records `mp4: false`. The site plays whichever sources exist.
- **"Seamless" loop is best-effort.** Attract modes aren't strictly periodic, so the clip is a trimmed
  continuous window played on `loop`; there can be a small jump at the wrap. Good enough for an ambient
  cabinet screen; a true crossfade would need a heavier ffmpeg pass.
- **Clips are throttled for performance.** Longest edge capped at 640px, `preload="none"`, lazy-loaded
  and only playing while on-screen — so a floor full of cabinets never loads a wall of video, keeping
  the homepage JS/network budget intact.
- **OG image is a separate route, not a `?mode=og` query.** Astro's dev server didn't honour the query
  param when rendering the prerendered capture route, so the share composition lives at its own
  `capture/og/[slug]` route.

## Decisions (Phase 3d — Arcbolt)

- **Logical entities in fixed pools, immediate-mode vector rendering.** Bullets/enemies/particles are
  plain objects reused from fixed-capacity pools (never allocated mid-run), and every frame is redrawn
  as vector lines into one Phaser Graphics. This meets the pool/perf Done-when and keeps the neon look
  cheap without a sprite per entity.
- **Grid "warp" is expanding shock-rings, not a spring mesh.** A true per-vertex mesh warp is costly
  on mobile; brightening rings that expand from each explosion read as a warp and stay cheap. (Per
  CLAUDE.md "make a sensible choice and record it.")
- **Touch gate = coarse-pointer OR a genuine touch event**, so phones use the twin-stick while a
  hybrid laptop still gets mouse-aim; a test-only `__arcboltForceTouch` flag exercises the stick path.
- **Playwright phone projects now set `hasTouch: true`** (real touch emulation, as the Done-when
  asks). A side effect: landscape games correctly show the rotate prompt on a portrait phone, so
  Arcbolt's touch test runs at a landscape phone size. Portrait games are unaffected.
- **Rewarded-revive / interstitial ad hooks are not wired yet** — ads stay globally off until the
  owner enables them (per the ads phase), so these are deferred with the rest of the ad integration.

## Decisions (Phase 3c — Rungs)

- **Dictionary = ENABLE ∩ a frequency list, largest component only.** Validity and "commonness" are
  the same word set, so par (BFS over that set) and player validation agree, no obscure word turns up
  mid-climb, and restricting to the giant connected component guarantees every generated puzzle is
  solvable. ~2.3k four-letter and ~2.8k five-letter words.
- **Generation is offline; only data is committed.** `scripts/build-rungs.ts` is run by hand and
  writes `words.json` + `puzzles.json`; the site build imports those and needs no network. Raw source
  lists are cached and git-ignored. Per the spec, **no solution paths are shipped** — hints are a
  client-side BFS over the shipped dictionary.
- **Singapore day = whole UTC+8 days since the Unix epoch.** No timezone library: Singapore never
  observes DST, so the day rolls at 16:00 UTC and weekday/weekend (→ 4/5-letter) comes straight from
  the day number. `RUNGS_EPOCH` in `site.ts` anchors puzzle #1 and the generator uses the same date.
- **Rungs owns its results screen** (mini ladder, streak/distribution, share) and does not emit
  `gameover`, so the shell's generic game-over modal doesn't double up; streaks are saved via
  `ctx.save` like any other game state. The shell pause button and how-to still work as usual.
- **"Beat par" = finishing on par.** Par is the shortest path, so it can be equalled but not beaten;
  reaching the goal in exactly par steps triggers the "Perfect climb" flourish.
- **e2e drives the climb via a gated telemetry hint.** `window.__rungs.next` (the optimal next word)
  is exposed only when `window.__rungsTest` is set, so the smoke test can climb any day's puzzle
  generically without that convenience shipping to players.

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
