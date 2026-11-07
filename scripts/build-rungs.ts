/*
 * build-rungs.ts — offline puzzle generator for Rungs (the daily word ladder).
 *
 * Run it by hand (not part of `npm run build`); it writes committed data files
 * that the game and its tests import, so the site build itself needs no network.
 *
 *   npm run build:rungs
 *
 * What it does:
 *   1. Downloads (and caches in scripts/data/, git-ignored) two public lists:
 *        - ENABLE word list (public domain) — the validity dictionary
 *        - a frequency list (OpenSubtitles 2018, en_50k) — to keep only words
 *          common enough that nobody meets an obscure word mid-climb
 *   2. Builds, per length (4 and 5), the dictionary = common valid words,
 *      reduced to the largest connected component of the one-letter-change graph
 *      so every puzzle is guaranteed solvable.
 *   3. Generates a year of daily puzzles aligned to RUNGS_EPOCH: weekdays are
 *      4-letter, weekends 5-letter (Singapore calendar), par between 4 and 8,
 *      no repeated pairs and limited endpoint reuse. Only start/end/par ship —
 *      never the solution paths; hints are computed client-side from the graph.
 *   4. Writes src/games/rungs/data/words.json and puzzles.json.
 *
 * Sources are logged in docs/CREDITS.md.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { get } from 'node:https';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const CACHE = join(HERE, 'data');
const OUT = join(ROOT, 'src', 'games', 'rungs', 'data');

// Must match RUNGS_EPOCH in src/config/site.ts (a date in DAILY_TIMEZONE).
const EPOCH = '2026-01-01';
const DAYS = 366; // one year of puzzles
const SEED = 0x526e6773; // "Rngs" — deterministic generation
const PAR_MIN = 4;
const PAR_MAX = 8;
const MAX_ENDPOINT_USES = 4; // how often a word may be a start/end across the year

const SOURCES = {
  enable: 'https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt',
  freq: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt',
};

// ---- download + cache -----------------------------------------------------

function download(url: string, dest: string, redir = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = get(url, { headers: { 'User-Agent': 'roomble-build' } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode ?? 0) && res.headers.location && redir < 4) {
        res.destroy();
        download(res.headers.location, dest, redir + 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`${url} → status ${res.statusCode}`));
        return;
      }
      const ws = createWriteStream(dest);
      res.pipe(ws);
      ws.on('finish', () => ws.close(() => resolve()));
      ws.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(60_000, () => {
      req.destroy();
      reject(new Error(`timeout: ${url}`));
    });
  });
}

async function cached(url: string, name: string): Promise<string> {
  mkdirSync(CACHE, { recursive: true });
  const dest = join(CACHE, name);
  if (!existsSync(dest) || statSync(dest).size === 0) {
    process.stdout.write(`  downloading ${name} … `);
    await download(url, dest);
    console.log(`${statSync(dest).size} bytes`);
  } else {
    console.log(`  using cached ${name}`);
  }
  return readFileSync(dest, 'utf8');
}

// ---- deterministic RNG ----------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- graph helpers --------------------------------------------------------

function neighborsOf(word: string, dict: Set<string>): string[] {
  const out: string[] = [];
  for (let i = 0; i < word.length; i++) {
    for (let c = 97; c < 123; c++) {
      const ch = String.fromCharCode(c);
      if (ch === word[i]) continue;
      const n = word.slice(0, i) + ch + word.slice(i + 1);
      if (dict.has(n)) out.push(n);
    }
  }
  return out;
}

/** Largest connected component of the one-letter-change graph. */
function giantComponent(words: string[]): string[] {
  const dict = new Set(words);
  const seen = new Set<string>();
  let best: string[] = [];
  for (const start of words) {
    if (seen.has(start)) continue;
    const comp: string[] = [];
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const w = stack.pop()!;
      comp.push(w);
      for (const n of neighborsOf(w, dict)) {
        if (!seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    if (comp.length > best.length) best = comp;
  }
  return best;
}

/** BFS distances from a source over the dictionary graph. */
function bfsDistances(source: string, dict: Set<string>): Map<string, number> {
  const dist = new Map<string, number>([[source, 0]]);
  let frontier = [source];
  let d = 0;
  while (frontier.length) {
    d++;
    const next: string[] = [];
    for (const w of frontier) {
      for (const n of neighborsOf(w, dict)) {
        if (!dist.has(n)) {
          dist.set(n, d);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

// ---- dictionary build -----------------------------------------------------

interface Dict {
  len: number;
  /** All words in the solvable graph, sorted alphabetically for shipping. */
  words: string[];
  /** Subset common enough to use as a puzzle start/end, most-common first. */
  endpoints: string[];
}

function buildDict(len: number, rank: Map<string, number>, enable: Set<string>): Dict {
  const candidates = [...rank.keys()].filter((w) => w.length === len && enable.has(w));
  const comp = giantComponent(candidates);
  const compSet = new Set(comp);
  // Endpoints: the more common ~70% of the component, so no climb starts or ends
  // on a word a casual player wouldn't know.
  const byRank = [...comp].sort((a, b) => (rank.get(a) ?? 1e9) - (rank.get(b) ?? 1e9));
  const endpoints = byRank.slice(0, Math.floor(byRank.length * 0.7));
  return {
    len,
    words: [...compSet].sort(),
    endpoints,
  };
}

// ---- puzzle generation ----------------------------------------------------

interface Puzzle {
  i: number;
  len: number;
  start: string;
  end: string;
  par: number;
}

// Day-of-week for a day number counted from the Unix epoch in Singapore time.
// 1970-01-01 (day 0) was a Thursday; 0 = Sunday … 6 = Saturday.
function dowFromSgDay(sgDay: number): number {
  return ((((sgDay + 4) % 7) + 7) % 7);
}
function isWeekend(sgDay: number): boolean {
  const d = dowFromSgDay(sgDay);
  return d === 0 || d === 6;
}

function generate(dicts: Record<number, Dict>, epochSgDay: number): Puzzle[] {
  const rnd = mulberry32(SEED);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]!;

  const usedPairs = new Set<string>();
  const uses = new Map<string, number>();
  const puzzles: Puzzle[] = [];

  for (let i = 0; i < DAYS; i++) {
    const len = isWeekend(epochSgDay + i) ? 5 : 4;
    const dict = dicts[len]!;
    const graph = new Set(dict.words);
    // Cycle target par 4..8 for variety; fall back to any par in range.
    const targetPar = PAR_MIN + (i % (PAR_MAX - PAR_MIN + 1));

    let placed: Puzzle | null = null;
    for (let attempt = 0; attempt < 400 && !placed; attempt++) {
      const start = pick(dict.endpoints);
      if ((uses.get(start) ?? 0) >= MAX_ENDPOINT_USES) continue;
      const dist = bfsDistances(start, graph);
      const wantExact = attempt < 250;
      const ends = dict.endpoints.filter((w) => {
        if (w === start) return false;
        const d = dist.get(w);
        if (d === undefined) return false;
        if (wantExact ? d !== targetPar : d < PAR_MIN || d > PAR_MAX) return false;
        if ((uses.get(w) ?? 0) >= MAX_ENDPOINT_USES) return false;
        return !usedPairs.has(pairKey(start, w));
      });
      if (!ends.length) continue;
      const end = pick(ends);
      placed = { i, len, start, end, par: dist.get(end)! };
    }
    if (!placed) throw new Error(`could not place puzzle #${i + 1} (len ${len})`);

    usedPairs.add(pairKey(placed.start, placed.end));
    uses.set(placed.start, (uses.get(placed.start) ?? 0) + 1);
    uses.set(placed.end, (uses.get(placed.end) ?? 0) + 1);
    puzzles.push(placed);
  }
  return puzzles;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// ---- main -----------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Rungs puzzle generator');
  const enableRaw = await cached(SOURCES.enable, 'enable1.txt');
  const freqRaw = await cached(SOURCES.freq, 'en_50k.txt');

  const enable = new Set(
    enableRaw
      .split(/\r?\n/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => /^[a-z]+$/.test(w)),
  );
  const rank = new Map<string, number>();
  for (const line of freqRaw.split(/\r?\n/)) {
    const w = line.split(/\s+/)[0]?.toLowerCase();
    if (w && /^[a-z]+$/.test(w) && !rank.has(w)) rank.set(w, rank.size);
  }
  console.log(`  enable: ${enable.size} words, frequency: ${rank.size} words`);

  const dicts: Record<number, Dict> = {
    4: buildDict(4, rank, enable),
    5: buildDict(5, rank, enable),
  };
  for (const len of [4, 5]) {
    const d = dicts[len]!;
    console.log(`  len ${len}: ${d.words.length} words, ${d.endpoints.length} endpoints`);
  }

  // Epoch as a Singapore day number (UTC+8, no DST).
  const epochSgDay = Math.floor((Date.parse(`${EPOCH}T00:00:00+08:00`) + 8 * 3600_000) / 86_400_000);
  const puzzles = generate(dicts, epochSgDay);

  const pars = puzzles.map((p) => p.par);
  const hist: Record<number, number> = {};
  for (const p of pars) hist[p] = (hist[p] ?? 0) + 1;
  console.log('  par distribution:', hist);

  mkdirSync(OUT, { recursive: true });
  const words = { 4: dicts[4]!.words, 5: dicts[5]!.words };
  writeFileSync(join(OUT, 'words.json'), JSON.stringify(words));
  writeFileSync(
    join(OUT, 'puzzles.json'),
    JSON.stringify({
      epoch: EPOCH,
      generated: new Date().toISOString().slice(0, 10),
      sources: SOURCES,
      puzzles: puzzles.map((p) => ({ i: p.i, len: p.len, start: p.start, end: p.end, par: p.par })),
    }),
  );
  console.log(`  wrote ${puzzles.length} puzzles → src/games/rungs/data/`);
  console.log('Done.');
}

main().catch((err) => {
  console.error('build-rungs failed:', err);
  process.exit(1);
});
