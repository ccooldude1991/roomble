# Rungs (daily word puzzle)

- Slug: `rungs`
- Category: daily
- Engine: plain TypeScript + DOM/CSS (no canvas needed)
- Orientation: any
- Marquee colour: `--ticket`
- Daily: yes. Also linked from the homepage daily panel and `/daily`

## Pitch
Climb from one word to another, changing one letter at a time, with every step a real word. One
puzzle a day, the same for everyone. Beat par, keep your streak, share your climb.

## Core loop
Given a start word and an end word of the same length (4 letters most days, 5 letters on weekends),
the player enters a chain of words. Each new word must differ from the previous by exactly one
letter in the same position, and must be in the dictionary. Reach the end word to finish.

- Par = shortest possible path length (computed with BFS at build time)
- Mistakes: invalid words don't count against you, they just shake and explain why
  ("Not in the word list" / "Change exactly one letter")
- Hints: up to 2 per day, each reveals the next word on one optimal path; hints are shown in the
  share result
- Practice mode: unlimited random puzzles, not counted towards streaks

## Puzzle generation (offline, build time)
- `scripts/build-rungs.ts` builds the word graph from a public-domain word list (e.g. ENABLE),
  filtered to common words using a permissive frequency list; log sources in `docs/CREDITS.md`
- Generate a year of puzzles in a JSON file: start/end pairs with par between 4 and 8, avoiding
  obscure words as start/end and avoiding repeats
- Daily puzzle chosen by date in Singapore time (UTC+8), configurable in `src/config/site.ts`
- Puzzle number shown ("Rungs #142")
- The answers file is not secret-critical, but don't ship the full solution paths in plain JSON;
  compute hints client-side from the graph

## Results and streaks
Saved via `ctx.save`: streak, max streak, played, distribution of (steps - par), last played date.
Results screen shows a mini ladder visual and a stats panel.

## Share
Copy-to-clipboard text (and Web Share API on mobile), spoiler-free, for example:
```
Rungs #142  5/4 par
🟩🟩🟨🟩🟩
roomble.example/rungs
```
Emoji in the share text are fine because that's user-shared content, not site UI.
(Use `SITE_URL` and `SITE_NAME` from config, never hardcode.)

## Controls
Desktop: type letters, Enter submit, Backspace delete, Esc pause/menu.
Mobile: custom on-screen keyboard (on-brand arcade keys, large hit areas), no native keyboard pop-up.
Keys used in the target word are subtly highlighted after the first move.

## Visuals
The ladder is drawn vertically like a neon sign being built rung by rung: start word at the bottom,
end word at the top, each accepted word lights up as a new rung with the changed letter glowing in
`--marquee`. The CRT screen frame stays; inside it is calmer than the arcade games.

## Juice
Accepted word: rung lights with a bulb-on flicker and click. Invalid: horizontal shake + short buzz.
Solve: the whole ladder lights bottom-to-top in sequence, then confetti made of letter tiles. Beat
par: extra flourish.

## Audio
Key clicks, accept chime (pitch rises per rung), invalid buzz, solve fanfare.

## Attract mode
Plays back a solved practice ladder being typed.

## Ads hooks
No interstitials. A display slot is allowed on the results screen (outside the CRT frame).

## Done when
Checklist passes, plus: BFS par calculation unit-tested, one-letter-change validator tested, date
rollover tested across time zones, streak logic tested (missed day resets, same day doesn't double
count), share text tested.
