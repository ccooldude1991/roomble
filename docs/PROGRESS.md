# Progress

## Status

**Phase 1 complete.** The arcade-cabinet design system and the full site shell are built: design
tokens, fonts, the component library, all pages, the game host, the services, the juice utilities,
and a hidden `cabinet-test` game that verifies the shell end to end. Build, unit tests and Playwright
smoke tests (all four viewports) are green, with no console errors. Not started: Phase 2 (the first
two real games, Stackdown and Rooftop Rush).

## Done

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
- **Registry** (`src/games/registry.ts`) is the single source for the floor and game pages. The six
  real games are `coming-soon` placeholders with full meta (titles, taglines, descriptions, how-to,
  controls, marquee colour) taken from `specs/`; `cabinet-test` is the only playable, hidden entry.
- **Audio context is created lazily** on the first user gesture (not at import), avoiding the browser
  autoplay-warning and keeping the "no console warnings" bar.
- **Fonts self-hosted via @fontsource** rather than Google Fonts links — faster, no third-party
  request (cleaner for the future ads/consent story), and still OFL. Logged in CREDITS.md.
- **New dependencies**: `@fontsource/{bungee,bungee-shade,chakra-petch,vt323}` (fonts, OFL),
  `zzfx` (MIT, sound), `@types/node` (dev). All justified above.

## Known issues

- The six floor games are placeholders; their `/games/<slug>` pages show a "coming soon" cabinet.
- Preview clips don't exist yet (Phase 3), so tiles and the hero show a placeholder screen with the
  game's tagline instead of live gameplay.
- `/privacy` and `/terms` are honest **drafts** and carry a visible "Draft for review" banner — the
  owner should have them reviewed before launch; the terms governing-law line is a placeholder.
- Daily streak / puzzle number on the homepage and `/daily` are static zeros until Rungs ships
  (Phase 3).

## Next

- **Phase 2a**: build Stackdown per `specs/01-stackdown.md` (Phaser 3), meeting the CLAUDE.md quality
  checklist and the spec's "Done when"; add it to the floor.
- **Phase 2b**: build Rooftop Rush per `specs/02-rooftop-rush.md`, reusing the shared juice/services.
- Then the Phase 2 checkpoint (play both, send feedback).
