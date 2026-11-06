# Progress

## Status

**Phase 0 complete.** The project is scaffolded, builds cleanly, tests pass, and a
GitHub Actions workflow is ready to deploy to GitHub Pages on push to `main`. The site
currently shows a minimal placeholder homepage. Not started: Phase 1 (design system and
site shell).

## Done

- Astro (static output) + TypeScript strict project, set up manually (no interactive
  scaffold), extending `astro/tsconfigs/strict`.
- Folder structure from CLAUDE.md created (`src/config`, `src/design`, `src/layouts`,
  `src/pages`, `src/shell`, `src/services`, `src/juice`, `src/games/*`, `specs`, `docs`,
  `scripts`, `tests`, `public/previews`). Empty dirs hold a `.gitkeep`.
- `src/config/site.ts`: `SITE_NAME` ("Roomble"), placeholder `SITE_TAGLINE`, `SITE_URL`,
  `DAILY_TIMEZONE` ("Asia/Singapore"), and `FEATURES` flags — ads `{ enabled: false,
  provider: 'none' }`, `leaderboards: false`, `analytics: false`.
- `src/games/types.ts`: the full game contract (`GameModule`, `GameContext`, `GameMeta`,
  `GameEvent`, `GameInstance`) with minimal service interfaces so it type-checks now;
  real services arrive in Phase 1.
- Vitest configured (unit tests in `src/**/*.test.ts` and `tests/unit`), with a config
  smoke test.
- Playwright configured with four viewport projects (375x667, 390x844, 768x1024,
  1440x900) and a homepage smoke test that checks the site name and asserts no console
  errors. It builds and previews the static site automatically.
- GitHub Actions workflow `.github/workflows/deploy.yml`: builds and deploys to GitHub
  Pages on push to `main`. Base path and canonical URL are resolved at build time from the
  repo (project page vs. user/org page vs. custom domain via `public/CNAME`) and passed to
  Astro through `BASE_PATH` / `SITE_URL` env vars — nothing hardcoded.
- Minimal placeholder homepage and `BaseLayout` that read the name/tagline from config.
- Placeholder `favicon.svg` (cabinet motif).

## Decisions

- **Scaffolded by hand** rather than `npm create astro` to avoid the interactive wizard and
  keep the tree minimal and exactly as CLAUDE.md specifies.
- **Pinned versions**: astro 7.4.7, @astrojs/check 0.9.12, vitest 5.1.0,
  @playwright/test 1.65.0, typescript 6.0.3. TypeScript is 6.x (not the latest 7.x) because
  `@astrojs/check` peer-requires TypeScript `^5 || ^6`. Phaser is not added yet (Phase 2+);
  it will be pinned exactly then.
- **Base path strategy**: driven by env at build time. Add a custom domain by committing
  `public/CNAME`; the workflow then serves from `/` automatically. No code change needed to
  switch between a `github.io/<repo>` URL and a custom domain.
- **`build` runs `astro check`** first so type errors fail the build (and CI).
- **CI Node version is 24** (satisfies both Astro's `>=22.23.4` and Vitest's engine range).
- The game contract's service interfaces live in `src/games/types.ts` for now; Phase 1 may
  move them next to their implementations in `src/services`.

## Known issues

- None. Placeholder homepage is intentionally minimal; the real design system and all
  pages come in Phase 1.
- `SITE_URL` in `src/config/site.ts` reads `import.meta.env.SITE_URL` with a localhost
  fallback; the authoritative canonical URL for build-time use is Astro's `site` setting
  (set from the same env var in the workflow).

## Next

- **Phase 1**: design tokens and fonts (`src/design/tokens.css`), the component library,
  all pages (home, `/games/[slug]`, `/daily`, `/about`, `/privacy`, `/terms`, 404), the
  game host in `src/shell`, the services, juice utilities, and a `cabinet-test` game to
  verify the shell. See `docs/PHASES.md`.
