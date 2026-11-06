# Build phases

Paste one prompt at a time into Claude Code. Wait for it to finish, check the result, then move on.
Each prompt assumes Claude Code has read `CLAUDE.md`.

---

## Phase 0: project setup and live deploy

```
Read CLAUDE.md, docs/DESIGN.md and docs/PHASES.md. We are starting Phase 0.

Set up the project:
1. Initialise an Astro + TypeScript (strict) project with the folder structure in CLAUDE.md.
2. Create src/config/site.ts with SITE_NAME = "Roomble", a placeholder tagline, SITE_URL, the
   daily-puzzle timezone (Asia/Singapore), and feature flags: ads (provider "none"),
   leaderboards (false), analytics (false).
3. Add Vitest and Playwright with projects for 375x667, 390x844, 768x1024 and 1440x900.
4. Add a GitHub Actions workflow that builds and deploys to GitHub Pages on push to main.
   Handle the base path correctly for both a project-page URL and a future custom domain
   (driven by config/env, not hardcoded).
5. Create a minimal placeholder homepage that uses SITE_NAME from config.
6. Create docs/PROGRESS.md (sections: Status, Done, Decisions, Known issues, Next) and
   docs/CREDITS.md.

Then give me numbered steps for what I need to do on GitHub to make the site go live, and
tell me the URL it will be at.
```

---

## Phase 1: design system and site shell

```
Phase 1. Build the design system and the site shell exactly as described in docs/DESIGN.md.

1. Design tokens in src/design/tokens.css, fonts (Bungee, Bungee Shade, Chakra Petch, VT323)
   loaded efficiently.
2. All components listed under "Components to build", including the pixel SVG icon set.
3. Pages: homepage (attract-mode hero with placeholder screen content for now, daily panel,
   "the floor" with placeholder cabinets), /games/[slug] game page template, /daily, /about,
   /privacy, /terms, 404. Write real copy in the voice described in DESIGN.md. Privacy and
   terms should be honest drafts covering local storage, future ads and cookies, and future
   leaderboards; mark them clearly as drafts for me to review.
4. The game host in src/shell: lazy-loads a GameModule, handles pause on blur/hidden,
   fullscreen, rotate prompt, scroll/zoom lock during play, best-score display.
5. Services: audio (ZzFX), save, input, ads (providers none/adsense/h5games, with AdSlot and
   frequency cap logic but provider "none" active), leaderboard (no-op), analytics (no-op).
6. Juice utilities in src/juice.
7. A tiny test game ("cabinet-test": a bouncing ball you can tap) that implements the full
   GameModule contract so we can verify the shell. It must not appear on the public floor.

Self-review with screenshots at 390x844 and 1440x900 against the anti-generic rules before
reporting back. Show me the screenshots and tell me what you changed after reviewing them.
```

---

## Phase 2: first two games (review checkpoint)

Prompt 2a:
```
Phase 2a. Build Stackdown per specs/01-stackdown.md. Work in vertical slices: playable core
loop first, then the twist, then juice, then screens, then attract mode. Meet every item in the
CLAUDE.md quality checklist and the spec's "Done when". Add it to the homepage floor. Update
PROGRESS.md, then tell me how to play it locally on my computer and on my phone.
```

Prompt 2b:
```
Phase 2b. Build Rooftop Rush per specs/02-rooftop-rush.md, same approach as Stackdown. Reuse
and improve shared utilities in src/juice and src/services rather than duplicating code.
```

**Checkpoint.** Play both games on your phone and computer. Then send feedback with this prompt:

```
Feedback after playing Stackdown and Rooftop Rush:
[write what felt off: too hard, too slow, controls awkward on phone, sounds annoying, looks
plain, etc.]

Fix these. Then turn any feedback that applies to all games into rules in CLAUDE.md's quality
checklist or docs/DESIGN.md, so future games get it right first time. Tell me which rules you
added.
```

---

## Phase 3: remaining four games and live previews

Run these one at a time:

```
Phase 3a. Build Starfuse per specs/03-starfuse.md. Follow CLAUDE.md, including any rules
added after the Phase 2 checkpoint.
```
```
Phase 3b. Build Brickquake per specs/04-brickquake.md.
```
```
Phase 3c. Build Rungs per specs/05-rungs.md, including the build-time puzzle generator script
and the homepage daily panel.
```
```
Phase 3d. Build Arcbolt per specs/06-arcbolt.md.
```
```
Phase 3e. Build scripts/capture-previews: use Playwright to run each game's attract() mode,
record a short seamless loop (6-8s) and a poster frame per game into public/previews, and an
Open Graph share image per game. Wire the homepage hero and game cabinets to use them,
following the performance and reduced-motion rules. Add `npm run capture`.
```

---

## Phase 4: ads go live

Do this only after you have: a custom domain pointed at GitHub Pages, the privacy and terms pages
reviewed, and an approved AdSense account (and H5 Games Ads approval if you want interstitials and
rewarded ads).

```
Phase 4. Turn on ads.
Publisher ID: [ca-pub-XXXXXXXX]
Providers to enable: [adsense / adsense + h5games]

1. Add public/ads.txt.
2. Configure the ads service for the provider(s), respecting every placement rule in CLAUDE.md.
3. Ensure no ad script loads before consent state is known; integrate with Google's
   consent messaging (I will set up the message in the AdSense dashboard; tell me exactly
   what to configure there).
4. Verify with Playwright at all viewports that no ad overlaps the game screen or touch
   controls, and layout shift is zero.
5. Update the privacy page to reflect the actual ad setup.
```

---

## Phase 5: leaderboards (Supabase)

```
Phase 5. Add global leaderboards with Supabase.

1. Write SQL migrations in /supabase: players (anonymous auth, display name with a profanity
   filter), scores (game slug, score, stats, created_at), with Row Level Security so clients can
   read leaderboards but can only insert via the Edge Function.
2. An Edge Function that validates submissions per game (plausible score for the run duration
   and stats, rate limiting, one signed run token issued at game start).
3. Implement src/services/leaderboard.ts against Supabase; keep it a no-op when the flag is off.
4. UI: top 50 daily / weekly / all-time per game on the game page and game-over screen, styled as
   an arcade high-score table (VT323). Players set a 3-to-12 character name the first time.
   Rungs gets a daily leaderboard by steps then time.
5. Give me numbered steps to create the Supabase project, run the migrations, deploy the
   function, and add the URL and anon key as GitHub repository variables.
```

---

## Phase 6: polish and launch

```
Phase 6. Launch polish.
1. SEO: per-page titles and descriptions, Open Graph/Twitter images, sitemap.xml, robots.txt,
   structured data (VideoGame schema) for each game page.
2. PWA: manifest and icons so the site can be added to a phone home screen, with an offline
   page. Games already loaded should keep working offline.
3. Analytics: enable a privacy-friendly option behind the analytics flag (I'll choose the
   provider; give me two options with trade-offs first).
4. Run Lighthouse on mobile and desktop for the homepage and two game pages; fix anything under
   90 in performance, accessibility, best practices and SEO.
5. Full regression pass: every game, every viewport, sound on/off, reduced motion on.
6. Write a short launch checklist for me in docs/LAUNCH.md.
```

---

## Reusable prompts

Add a new game:
```
I want a new game. Here's my idea: [describe it]. First write a spec in specs/ following the
same structure as the existing specs, and show it to me. Don't build until I approve it.
```

Rename the site:
```
Rename the site to [NEW NAME] with tagline [TAGLINE]. Change it only in src/config/site.ts,
then search the whole repo to confirm the old name appears nowhere else. Update the logo
marquee treatment for the new name's length.
```

Resume after a break:
```
Read CLAUDE.md and docs/PROGRESS.md. Summarise where we are in plain language and what the
next step is. Don't change anything yet.
```
