# Progress

## Status

**Phase 2a complete.** Stackdown — the first real game — is built in Phaser 3 to the spec and the
CLAUDE.md quality bar, and is live on the homepage floor. Build, 26 unit tests and the Playwright
e2e suite are green, no console errors. Not started: Phase 2b (Rooftop Rush).

Earlier: Phase 0 (scaffold + deploy) and Phase 1 (design system + site shell) complete.

## Done

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

- The other five floor games are placeholders; their `/games/<slug>` pages show a "coming soon"
  cabinet. Stackdown is fully playable.
- Browser-pane automation can't deliver Phaser's keyboard events (no keyCode), so keyboard play was
  verified with Playwright (real key events) instead; real browsers are unaffected.
- Preview clips don't exist yet (Phase 3), so tiles and the hero show a placeholder screen with the
  game's tagline instead of live gameplay.
- `/privacy` and `/terms` are honest **drafts** and carry a visible "Draft for review" banner — the
  owner should have them reviewed before launch; the terms governing-law line is a placeholder.
- Daily streak / puzzle number on the homepage and `/daily` are static zeros until Rungs ships
  (Phase 3).

## Next

- **Phase 2b**: build Rooftop Rush per `specs/02-rooftop-rush.md`, reusing the shared juice/services.
- Then the Phase 2 checkpoint: play Stackdown and Rooftop Rush on phone and desktop, then send
  feedback so shared lessons can become rules in CLAUDE.md / DESIGN.md.
