# Credits and licences

Every third-party asset used in this project must be CC0 or MIT-compatible (fonts: OFL),
and logged here with its source and licence. Original artwork, sounds and code drawn in the
project itself do not need an entry.

## Fonts

Self-hosted via the `@fontsource` packages. All are SIL Open Font License (OFL).

| Font | Role | Package | Source |
|---|---|---|---|
| Bungee | Headings, game titles, marquee | `@fontsource/bungee` | https://fonts.google.com/specimen/Bungee |
| Bungee Shade | Logo treatment only | `@fontsource/bungee-shade` | https://fonts.google.com/specimen/Bungee+Shade |
| Chakra Petch | UI and body | `@fontsource/chakra-petch` | https://fonts.google.com/specimen/Chakra+Petch |
| VT323 | HUD / score numbers | `@fontsource/vt323` | https://fonts.google.com/specimen/VT323 |

## Sound

| Asset | Licence | Source |
|---|---|---|
| ZzFX (sound engine) | MIT | https://github.com/KilledByAPixel/ZzFX |

Sound effects are authored in-house as ZzFX parameter presets (code, see
`src/services/audio.ts`). Any CC0 music loops added later will be logged here.

## Word lists

Used by `scripts/build-rungs.ts` to generate the Rungs dictionaries and puzzles. The raw
source files are downloaded and cached locally (git-ignored); only the derived, filtered word
lists and start/end/par puzzle data are committed (`src/games/rungs/data/`). A filtered list of
common English words is factual, not a creative work, but the sources are logged here for
provenance.

| List | Role | Licence | Source |
|---|---|---|---|
| ENABLE (enable1.txt) | Validity dictionary (is it a real word?) | Public domain | https://github.com/dolph/dictionary |
| OpenSubtitles 2018 frequency (en_50k.txt) | Filter to common words only | CC BY-SA 4.0 | https://github.com/hermitdave/FrequencyWords |

The shipped Rungs dictionary is ENABLE words that also appear in the frequency list, reduced to
the largest connected component of the one-letter-change graph (so every puzzle is solvable).

## Code dependencies

See `package.json` for the full list. Notable runtime/build dependencies:

| Package | Licence | Why |
|---|---|---|
| astro | MIT | Static site framework |
| vitest | MIT | Unit tests |
| @playwright/test | Apache-2.0 | Cross-viewport smoke tests |
| typescript | Apache-2.0 | Type checking |
