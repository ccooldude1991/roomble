# Roomble: project rules for Claude Code

Read this file in full at the start of every session. Then read `docs/PROGRESS.md` to see what has
already been built, and `docs/DESIGN.md` before touching any UI. Game specs live in `specs/`.
Phase-by-phase build prompts live in `docs/PHASES.md`.

## What we are building

Roomble is a browser games site with a retro arcade-cabinet identity. It hosts a growing collection of
original, polished games that play equally well on phones and desktops. It is a static site hosted on
GitHub Pages, with Supabase added later for leaderboards. It will carry ads, so ad placement is part
of the layout from day one.

The site name may change. It must only ever be defined in one place: `src/config/site.ts`
(`SITE_NAME`, `SITE_TAGLINE`, `SITE_URL`). Never hardcode "Roomble" anywhere else, including meta
tags, page titles, the manifest, the footer, or copy. Use the config value.

## Owner context

The owner is an account manager, not a developer. He directs the build and reviews results.
When you finish a task:
- Explain what you did in plain language, briefly.
- Tell him exactly how to see it (command to run, URL to open, what to click).
- List anything he must do manually (accounts, settings, keys) as numbered steps.
- Never leave the project in a broken build state at the end of a session.

## Tech stack (do not change without asking)

| Concern | Choice |
|---|---|
| Site framework | Astro (static output), TypeScript strict mode |
| Arcade/action games | Phaser 3 (pin an exact version) |
| Puzzle/word games | Plain TypeScript + Canvas 2D or DOM/CSS, no engine |
| Styling | Plain CSS with custom properties from `src/design/tokens.css`. No Tailwind, no UI kits |
| Sound effects | ZzFX (tiny, MIT), sounds defined as code presets |
| Music | Optional CC0 loops, lazy-loaded, off by default |
| Tests | Vitest for logic, Playwright for smoke tests at mobile and desktop viewports |
| Hosting | GitHub Pages via GitHub Actions on push to `main` |
| Backend (Phase 5+) | Supabase (Postgres + RLS + Edge Functions) |
| Package manager | npm |

Do not add a dependency unless it clearly saves significant work. Note every new dependency and why in
`docs/PROGRESS.md`.

## Commands

- `npm run dev` starts the local dev server
- `npm run build` builds the static site to `dist/`
- `npm run preview` serves the built site
- `npm run test` runs unit tests
- `npm run test:e2e` runs Playwright smoke tests
- `npm run capture` records gameplay preview clips for thumbnails (built in Phase 3)

Run `npm run build` and `npm run test` before declaring any task done.

## Folder structure

```
/public
  ads.txt                 (added in ads phase)
  /previews               (generated gameplay clips + posters per game)
/src
  /config/site.ts         site name, URLs, feature flags (ads, leaderboards)
  /design                 tokens.css, fonts, shared UI components
  /layouts                page layouts
  /pages                  index, /games/[slug], /daily, /about, /privacy, /terms, 404
  /shell                  game host: mounts games, pause on tab blur, fullscreen, orientation prompt
  /services
    audio.ts              ZzFX wrapper, master volume, mute, unlock on first gesture
    save.ts               namespaced localStorage with versioning and safe fallbacks
    input.ts              unified keyboard / touch / gamepad helpers
    ads.ts                provider-agnostic ad service (see Ads rules)
    leaderboard.ts        no-op until Phase 5, then Supabase client
    analytics.ts          no-op interface until enabled
  /juice                  shared game-feel utilities: shake, hitstop, particles, tweens, number popups
  /games
    /stackdown
    /rooftop-rush
    /starfuse
    /brickquake
    /rungs
    /arcbolt
/specs                    one spec per game, the source of truth for each game
/docs                     DESIGN.md, PHASES.md, PROGRESS.md
/scripts                  capture-previews, word-list builders, etc.
/tests
```

## The game contract

Every game is a self-contained folder exporting a `GameModule`. The site shell never reaches inside a
game, and a game never touches the DOM outside the element it was given.

```ts
// src/games/types.ts
export interface GameMeta {
  slug: string;                 // URL slug, e.g. "stackdown"
  title: string;
  tagline: string;              // one line, shown on tiles
  description: string;          // 2-4 sentences, shown on the game page (also helps SEO/ad approval)
  howToPlay: string[];          // short steps
  controls: { desktop: string[]; mobile: string[] };
  orientation: 'any' | 'portrait' | 'landscape';
  category: 'arcade' | 'puzzle' | 'daily';
  daily?: boolean;
}

export type GameEvent =
  | { type: 'ready' }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'gameover'; score: number; stats?: Record<string, number> }
  | { type: 'milestone'; name: string };

export interface GameContext {
  audio: AudioService;
  save: SaveService;            // already namespaced to this game
  leaderboard: LeaderboardService;
  emit(event: GameEvent): void; // the shell listens (ads, analytics, best scores)
  reducedMotion: boolean;
}

export interface GameInstance {
  pause(): void;
  resume(): void;
  destroy(): void;              // must free all listeners, timers, audio, WebGL contexts
}

export interface GameModule {
  meta: GameMeta;
  mount(el: HTMLElement, ctx: GameContext): Promise<GameInstance>;
  attract?(el: HTMLElement): Promise<GameInstance>; // self-playing demo for previews
}
```

Rules:
- Games are lazy-loaded with dynamic `import()` only on their own page.
- The shell pauses the game when the tab is hidden, the window loses focus, or an ad break runs.
- Games render at a fixed logical resolution and scale to fit the container (Phaser `Scale.FIT`,
  or equivalent math for canvas games). Never stretch. Letterbox with the cabinet bezel colour.
- All persistent data goes through `ctx.save`. Never call `localStorage` directly.

## Mobile and desktop are equal priority

Every feature, screen and game must work fully on both. This is not "desktop with a mobile fallback".

- Test every change at 375x667, 390x844, 768x1024 and 1440x900 (Playwright projects for each).
- Each game spec defines both desktop and touch controls. Touch controls are designed, not bolted on:
  large hit areas (minimum 48px), placed for thumbs, visually on-brand, and hidden on devices without
  touch.
- Respect safe-area insets (`env(safe-area-inset-*)`).
- Prevent page scroll, pinch-zoom and pull-to-refresh only while a game is actively being played.
- If a game needs a specific orientation, show a friendly rotate prompt rather than a broken layout.
- Fullscreen button on the game page (uses the Fullscreen API where supported; hide where not).
- Target 60fps on a mid-range phone. If a juice effect costs frames on mobile, scale it down there.

## Quality bar: a game is not done until all of this is true

Screens and flow
- [ ] Title screen with the game's logo treatment, a Play button, and best score
- [ ] How-to-play shown on first launch (and reachable later), short and visual
- [ ] Pause (Esc / P / on-screen button) with resume, restart, sound toggle, quit
- [ ] Game over screen with score, best score, a "new best" celebration, and Play again
- [ ] Play again restarts in under one second, no page reload

Game feel ("juice")
- [ ] Easing on all movement and UI transitions (no linear motion except where intended)
- [ ] Particles on meaningful events
- [ ] Screen shake and/or hit-stop on impacts, scaled to event size, disabled with reduced motion
- [ ] Score popups and animated score counters
- [ ] A sound for every meaningful action, mixed so nothing is harsh; mute persists
- [ ] Difficulty ramps over a session; the first 30 seconds are forgiving

Craft
- [ ] Visually consistent with `docs/DESIGN.md` (palette, fonts, CRT treatment)
- [ ] Full touch support and keyboard support; gamepad where it makes sense
- [ ] No console errors or warnings
- [ ] `destroy()` leaves nothing running (verify by navigating away and back three times)
- [ ] `attract()` demo mode runs a convincing self-playing loop for previews
- [ ] Unit tests for core rules/scoring logic
- [ ] Playwright smoke test: page loads, game starts, a simulated input works, no errors

## Anti-generic rules (the site must not look AI-made)

Banned outright:
- Purple-to-blue or any decorative gradient washes; glassmorphism; frosted blur cards
- Inter, Roboto, Arial, system-ui, Space Grotesk, Poppins, or "Press Start 2P" (overused)
- Emoji used as icons or decoration anywhere in the UI
- Generic icon sets sprinkled for decoration (Lucide etc.). Icons are drawn in-house as pixel SVGs
  and only used where they carry meaning (sound, pause, fullscreen, share)
- A uniform grid of identical rounded cards with the same soft shadow and hover lift
- Fade-and-slide-up entrance animations on every section
- Copy such as "Welcome to", "ultimate destination", "seamless", "immersive", "elevate",
  "unleash", "dive in", "level up your", "endless fun"
- All-caps tracked-out eyebrow labels above headings in the site UI
- "→" appended to button and link text
- Lorem ipsum or placeholder copy in anything committed

Required instead: see `docs/DESIGN.md`. Spend the boldness on the cabinet/CRT identity and the live
gameplay previews; keep everything around them disciplined.

## Original content and IP

- All game names, art, characters and sounds are original. Never use names, logos, characters or
  distinctive art from existing games (no "Tetris", "Wordle", "Breakout", "Arkanoid", "2048" in
  titles, copy or code-visible text). Describing a genre in plain words is fine.
- Fonts from Google Fonts (OFL). Any third-party asset must be CC0 or MIT-compatible and logged in
  `docs/CREDITS.md` with source and licence.
- Word lists must come from a public-domain or permissively licensed source; log the source.

## Ads rules

Ads are planned from the start but stay switched off until the owner enables them.

- `src/services/ads.ts` exposes one interface with providers: `none` (default), `adsense`
  (display slots), and `h5games` (Google H5 Games Ads Placement API for interstitials and
  rewarded breaks). Provider and on/off live in `src/config/site.ts`.
- Display ads use an `<AdSlot>` component with reserved dimensions so layout never shifts.
  With provider `none`, slots render nothing in production and a subtle labelled placeholder in dev.
- Placement rules:
  - Never over, inside, or overlapping the game canvas or touch controls
  - Never during active play
  - Game page: desktop sidebar slot beside the cabinet; mobile slot below the cabinet,
    and only on title/game-over states, never under the thumbs during play
  - Homepage: at most one slot between content sections, never in the hero
  - Interstitial breaks (h5games only): at most after a game-over, frequency-capped
    (no more than once per 3 minutes, never on the first game of a session)
  - Rewarded break (optional, per game spec): e.g. "watch an ad to continue once"
- Ads must never block the "Play again" path for more than the break itself.
- Consent: EEA/UK/Swiss visitors need a Google-certified CMP before ads load. Wire the ad service so
  no ad script loads until consent state is known.
- `/privacy` and `/terms` pages exist before ads are turned on. `public/ads.txt` is added when the
  owner supplies a publisher ID.

## Performance and accessibility

- Homepage under 200 KB of JS before any game is opened. Each game bundle is code-split.
- Preview clips: short WebM/MP4 loops plus a static poster, `loading="lazy"`, autoplay muted only
  when in viewport, paused when off-screen, posters only when `prefers-reduced-motion`.
- Fonts self-hosted or preconnected, `font-display: swap`.
- Visible keyboard focus everywhere; all site UI usable by keyboard.
- Respect `prefers-reduced-motion`: disable shake, CRT flicker and auto-playing previews.
- Colour contrast meets WCAG AA for all site text.

## Security and secrets

- Never commit secrets. Supabase URL and anon key come from `PUBLIC_` env vars set as GitHub
  repository secrets/variables and injected in the Actions workflow.
- The Supabase anon key is safe in the client only because Row Level Security is on for every
  table. Never use the service role key in client code.
- Leaderboard submissions are validated server-side (Edge Function). Assume clients cheat.

## Working method

- Work one phase from `docs/PHASES.md` at a time. Do not start the next phase unprompted.
- Before building a game, re-read its spec. If the spec is ambiguous, make a sensible choice and
  record it under "Decisions" in `docs/PROGRESS.md`.
- Build in vertical slices: get a playable core loop first, then juice, then screens, then polish.
- After each task, update `docs/PROGRESS.md`: what was done, decisions, known issues, next step.
- Commit in small logical commits with clear messages.
- When you are unsure whether something matches the design, take Playwright screenshots at a
  mobile and a desktop viewport and review them yourself before reporting back.
