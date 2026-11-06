# Design system: arcade cabinet

## The idea in one paragraph

Roomble feels like walking onto an arcade floor at night. Every game lives in its own cabinet: a
screen with a slightly curved CRT glass, scanlines and a soft phosphor glow, framed by a chunky bezel
and topped with an illuminated marquee. The site around the cabinets is quiet and solid, like the
carpet and walls of the arcade, so the screens do the shouting. The memorable thing is the screens
themselves: they are always showing real gameplay, the way cabinets run "attract mode" when nobody is
playing.

Subject: a browser arcade of original games. Audience: casual players on phones in spare moments and
on desktops during breaks, roughly 13 to 45. Primary job: get someone from landing to playing in one
tap, then keep them coming back.

## Colour

| Token | Hex | Use |
|---|---|---|
| `--cabinet` | `#1E1033` | Page background. Deep violet, flat, never a gradient |
| `--bezel` | `#33204F` | Raised surfaces: cabinet frames, panels, menus |
| `--carpet` | `#2A1745` | Alternate section background; carries the carpet pattern (see Texture) |
| `--marquee` | `#FFC21A` | Primary actions, marquee lights, "new best", key highlights |
| `--joystick` | `#FF3D6E` | Secondary accent: destructive actions, live badges, the coin slot detail |
| `--phosphor` | `#4DF0D0` | CRT glow, focus rings, scores and timers on the site UI |
| `--ticket` | `#FFF4DC` | Body text and headings on dark surfaces |
| `--ticket-dim` | `#C9B9A6` | Secondary text |

Rules: no gradients as decoration. Glow is allowed only for things that are "lit" (screens, marquee
bulbs, phosphor numbers) and is done with layered `box-shadow`/`text-shadow` in the element's own
colour. Each game may define its own in-game palette, but its title screen, HUD frame and buttons
use these tokens so the collection reads as one family.

## Type

| Role | Family | Notes |
|---|---|---|
| Display | **Bungee** (and Bungee Shade for the logo only) | Arcade signage face. Headings, game titles, marquee. Bungee is uppercase by design; that is the signage, not an eyebrow label |
| UI and body | **Chakra Petch** | Readable, slightly technical. Buttons, descriptions, menus, body copy. Sentence case |
| Numbers and HUD | **VT323** | CRT terminal digits for scores, timers, high-score tables, in-game HUD only |

Type scale (1.25 ratio, base 17px on mobile / 18px desktop): 14, 17, 21, 27, 33, 42, 52, 66.
Body line-height 1.55, line length under 70 characters. Headings tight (1.05 to 1.15).
Use the type actively: game titles on the marquee are set big, with the chasing-bulb treatment
behind them; score numbers count up with a phosphor glow.

## Texture and the CRT treatment

- **CRT overlay** (screens only, never site chrome): faint horizontal scanlines (2px period, ~8%
  opacity), subtle vignette, gentle barrel curvature on the glass via an SVG/CSS mask, and a soft
  inner glow. One shared component: `<CrtScreen>`.
- **Carpet pattern**: the classic arcade carpet, reinterpreted as a low-contrast repeating SVG of
  small original shapes (stars, zigzags, coins) at ~6% opacity on `--carpet` sections. Original
  artwork, drawn in code.
- **Marquee bulbs**: a row of dots around the logo marquee that chase slowly. This is the only
  ambient animation on the site chrome.
- Reduced motion: scanlines stay (static), bulbs stop chasing, flicker is removed.

## Signature moments (the only orchestrated motion)

1. **Power-on.** When a game page opens, the cabinet screen does a 400ms CRT power-on: a bright
   horizontal line expands to full screen with a phosphor flash. Once per page load.
2. **Attract mode hero.** The homepage hero is one big cabinet cycling through real gameplay clips,
   with the current game's title on its marquee and a Play button. Swapping clips uses a quick
   channel-change static burst.

Everything else moves only in response to the player: button presses depress like real arcade
buttons (translateY + shadow shrink), menus open with a short ease-out, scores count up.

## Layout

Left-aligned content in a 1200px max container. Asymmetric, not a uniform card grid.

Homepage
```
+--------------------------------------------------------------+
|  [logo marquee]                         Daily  About  [sound] |
+--------------------------------------------------------------+
|  +------------------------------------+   Today's Rungs       |
|  |                                    |   puzzle #142         |
|  |   ATTRACT MODE CABINET (hero)      |   [Play today's]      |
|  |   live gameplay clips cycling      |                       |
|  |   [Play Stackdown]                 |   Your streak: 4      |
|  +------------------------------------+                       |
+--------------------------------------------------------------+
|  The floor                                                    |
|  +----------------+ +--------+ +--------+                    |
|  | featured       | | tile   | | tile   |   tiles are mini    |
|  | cabinet (2x)   | +--------+ +--------+   cabinets with     |
|  |                | +--------+ +--------+   live previews     |
|  +----------------+ | tile   | | tile   |                    |
|                     +--------+ +--------+                    |
|  [ad slot, reserved height, between sections only]           |
+--------------------------------------------------------------+
|  footer: about, privacy, terms, credits                       |
+--------------------------------------------------------------+
```
Mobile: hero cabinet full width, daily panel stacks below it, the floor becomes a 2-column grid with
the featured cabinet spanning both columns. Tiles keep their cabinet frame.

Game page
```
Desktop                                         Mobile
+-------------------------------+---------+     +------------------+
| marquee: game title           |         |     | marquee: title   |
| +---------------------------+ | how to  |     | +--------------+ |
| |                           | | play    |     | |  CRT screen  | |
| |      CRT game screen      | |         |     | |  (game)      | |
| |                           | | best    |     | +--------------+ |
| +---------------------------+ | score   |     | touch controls   |
| control panel: buttons strip  | [ad]    |     | (in-game layer)  |
+-------------------------------+---------+     | how to play      |
| description, more games row                |     | [ad: menus only] |
+--------------------------------------------+     | more games       |
                                                  +------------------+
```
During active play on mobile the page locks to the cabinet; everything else is reached via pause.

## Tiles (game cabinets on the floor)

Not identical cards. Each tile is a cabinet silhouette: marquee strip with the game's title in its
own colour, CRT screen showing the preview loop, and a control-panel strip with category and best
score. Each game gets its own marquee colour from its spec, so the floor looks like a row of
different machines. Hover/focus: the screen brightens and the marquee lights up; no lift, no
shadow change.

## Components to build (Phase 1)

`<Marquee>`, `<CrtScreen>`, `<Cabinet>` (frame + screen + control panel), `<ArcadeButton>`
(primary/secondary/icon), `<ScoreReadout>` (VT323, count-up), `<GameTile>`, `<AdSlot>`,
`<SoundToggle>`, `<RotatePrompt>`, `<Modal>` (pause/menus), `<Toast>`, pixel SVG icon set
(sound on/off, pause, play, fullscreen, share, back, settings).

Radii follow hierarchy: cabinet frames 14px, buttons 10px, small chips 6px. Buttons are arcade
buttons: thick bottom edge in a darker shade of their colour, pressed state removes it.

## Voice and copy

Plain, short, a little playful, always clear. Sentence case in the site UI. Arcade vernacular is
welcome in small doses, never at the expense of meaning.

| Do | Don't |
|---|---|
| "Play" / "Play again" | "Let's go!" / "Dive back in" |
| "New best: 12,480" | "Amazing!! You crushed it!!!" |
| "Paused" | "Taking a breather?" |
| "Sound off" | "Shhh 🤫" |
| "Couldn't load this game. Check your connection and try again." | "Oops! Something went wrong." |
| 404: "This cabinet's out of order. Head back to the floor." | "Page not found :(" |

Game descriptions: two to four sentences saying what you do and what makes it satisfying. No
superlatives.

## Self-review before reporting UI work

Take Playwright screenshots at 390x844 and 1440x900. Check: does anything look like a generic SaaS
template? Is there more than one place trying to be bold? Remove one decoration before shipping.
