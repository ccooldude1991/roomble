# Start here (for you, not for Claude Code)

## What's in this pack

| File | Purpose |
|---|---|
| `CLAUDE.md` | Standing rules Claude Code reads automatically every session: stack, structure, quality bar, ad rules, anti-generic rules |
| `docs/DESIGN.md` | The arcade-cabinet design system: colours, fonts, layout, components, copy voice |
| `docs/PHASES.md` | The prompts you paste into Claude Code, one phase at a time |
| `specs/01–06` | One spec per game. The source of truth for each game |

Claude Code will create `docs/PROGRESS.md` itself and keep it updated, so you can stop and resume
any time.

## How to start

1. Create an empty GitHub repository (e.g. `roomble`), public or private. Note that GitHub Pages
   on a private repo needs a paid GitHub plan.
2. Clone it to your computer and copy everything from this pack into it (keep the folder
   structure).
3. Open a terminal in that folder and start Claude Code.
4. Paste the Phase 0 prompt from `docs/PHASES.md`.
5. Keep going phase by phase. Don't skip the Phase 2 checkpoint: playing the first two games and
   feeding back is what makes the other four good.

## Things only you can do

- **GitHub:** enable Pages with "GitHub Actions" as the source (Claude Code will walk you through it).
- **Custom domain:** buy one before applying for ads. AdSense effectively requires a domain you
  own, not a `github.io` address. Point it at GitHub Pages (Claude Code can give you the DNS
  records).
- **AdSense:** apply once the six games, about, privacy and terms pages are live. Approval looks for
  real content, which is why each game page has a written description and how-to-play.
- **H5 Games Ads** (Google's ad programme for web games, for between-game and "watch to continue"
  ads): a separate application on top of AdSense. Optional; display ads alone work fine.
- **Consent banner:** set up Google's privacy and messaging in AdSense for EU/UK visitors.
- **Supabase** (Phase 5): create a free project and paste the keys where Claude Code tells you.

## Changing the name later

Everything reads the name from one config file. Use the "Rename the site" prompt in `PHASES.md`.

## Rough effort

Phases 0–1 are one or two sessions. Each game is roughly one to three sessions depending on how much
you iterate. Expect Arcbolt and Brickquake to take the longest.
