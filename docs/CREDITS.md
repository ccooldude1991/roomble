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

_None added yet. Word lists must come from a public-domain or permissively licensed source
and be logged here._

## Code dependencies

See `package.json` for the full list. Notable runtime/build dependencies:

| Package | Licence | Why |
|---|---|---|
| astro | MIT | Static site framework |
| vitest | MIT | Unit tests |
| @playwright/test | Apache-2.0 | Cross-viewport smoke tests |
| typescript | Apache-2.0 | Type checking |
