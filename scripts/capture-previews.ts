/*
 * capture-previews.ts — record a short gameplay preview for every game.
 *
 *   npm run capture              # all games
 *   npm run capture stackdown    # just one (or several) by slug
 *
 * For each game it drives the dev-only capture harness (src/pages/capture/[slug].astro)
 * with Playwright, running the game's own attract() self-play, and writes into
 * public/previews/:
 *   - <slug>.webm   a looping gameplay clip (plus <slug>.mp4 when ffmpeg is present)
 *   - <slug>.jpg    a poster frame (also the reduced-motion still)
 *   - <slug>.og.png a 1200×630 branded Open Graph share image
 * and records what exists in src/previews.manifest.json, which the site reads to
 * decide whether to show a live preview or the placeholder.
 *
 * How it runs: it starts `astro dev` with CAPTURE=1 (so the harness routes exist),
 * captures, then shuts the server down. Nothing here ships to production — a normal
 * `npm run build` has CAPTURE unset, so the capture routes are never emitted.
 *
 * ffmpeg is optional. With it, clips are trimmed past the boot frames to a clean
 * ~7s loop and an .mp4 (H.264) is produced for broad browser support. Without it,
 * the raw WebM is kept as-is. Install ffmpeg and re-run to upgrade the clips.
 */
import { chromium, type Browser, type Page } from '@playwright/test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'public', 'previews');
const MANIFEST = join(ROOT, 'src', 'previews.manifest.json');
const PORT = Number(process.env.CAPTURE_PORT ?? 4330);
const ORIGIN = `http://localhost:${PORT}`;

// Timings (ms): how long the game plays before the poster, and the clip window.
const WARMUP = 1500; // let attract get lively before we grab the poster
const CLIP_MS = 8500; // raw recording window; trimmed to ~7s when ffmpeg is present
const TRIM_START = 2.0; // seconds of boot/intro to drop when trimming
const TRIM_LEN = 7.0; // seconds of final loop
const OG_WARMUP = 2000;

interface GameInfo {
  slug: string;
  w: number;
  h: number;
  aspect: string;
}
interface PreviewEntry {
  webm: boolean;
  mp4: boolean;
  poster: boolean;
  og: boolean;
  w: number;
  h: number;
}

const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore', shell: true }).status === 0;

function log(msg: string): void {
  process.stdout.write(`[capture] ${msg}\n`);
}

async function waitForServer(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${ORIGIN}/`);
      if (res.ok || res.status === 404) return; // server is answering
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`dev server did not start on ${ORIGIN}`);
}

function startDevServer(): ChildProcess {
  log(`starting dev server on ${ORIGIN} (CAPTURE=1)`);
  const child = spawn('npm', ['run', 'dev', '--', '--port', String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, CAPTURE: '1', BASE_PATH: '/', SITE_URL: ORIGIN },
    stdio: 'ignore',
    shell: true,
  });
  return child;
}

function stopDevServer(child: ChildProcess): void {
  if (child.pid === undefined) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    try {
      child.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  }
}

async function fetchGameList(page: Page): Promise<GameInfo[]> {
  await page.goto(`${ORIGIN}/capture/__list`, { waitUntil: 'load' });
  const json = await page.locator('#games').textContent();
  if (!json) throw new Error('capture __list returned no game data');
  return JSON.parse(json) as GameInfo[];
}

async function waitForAttract(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const w = window as unknown as { __captureReady?: boolean; __captureError?: string };
      return w.__captureReady === true || !!w.__captureError;
    },
    { timeout: 25_000 },
  );
  const err = await page.evaluate(
    () => (window as unknown as { __captureError?: string }).__captureError,
  );
  if (err) throw new Error(`attract() failed: ${err}`);
}

function runFfmpeg(args: string[]): boolean {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
    stdio: 'ignore',
    shell: true,
  });
  return r.status === 0;
}

/** Trim the raw webm to a clean loop and (with ffmpeg) also emit an mp4. */
function finishClip(raw: string, slug: string): { webm: boolean; mp4: boolean } {
  const webmOut = join(OUT, `${slug}.webm`);
  const mp4Out = join(OUT, `${slug}.mp4`);
  if (!hasFfmpeg) {
    renameSync(raw, webmOut);
    return { webm: true, mp4: false };
  }
  const even = 'scale=trunc(iw/2)*2:trunc(ih/2)*2';
  const trimmedWebm = runFfmpeg([
    '-ss', String(TRIM_START), '-t', String(TRIM_LEN), '-i', raw,
    '-an', '-vf', even, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', webmOut,
  ]);
  const mp4 = runFfmpeg([
    '-ss', String(TRIM_START), '-t', String(TRIM_LEN), '-i', raw,
    '-an', '-vf', even, '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', '-crf', '24', mp4Out,
  ]);
  if (!trimmedWebm) renameSync(raw, webmOut); // fall back to the raw clip
  else rmSync(raw, { force: true });
  return { webm: true, mp4 };
}

async function captureGame(
  browser: Browser,
  tmp: string,
  game: GameInfo,
): Promise<PreviewEntry> {
  const { slug, w, h } = game;
  log(`${slug}: recording ${w}×${h}`);

  // --- loop + poster ---
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    recordVideo: { dir: tmp, size: { width: w, height: h } },
  });
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/capture/${slug}`, { waitUntil: 'load' });
  await waitForAttract(page);
  await page.waitForTimeout(WARMUP);
  await page
    .locator('#stage')
    .screenshot({ path: join(OUT, `${slug}.jpg`), type: 'jpeg', quality: 82 });
  await page.waitForTimeout(CLIP_MS);
  const video = page.video();
  await ctx.close(); // flushes the video file
  const rawPath = video ? await video.path() : '';

  const clip = rawPath && existsSync(rawPath) ? finishClip(rawPath, slug) : { webm: false, mp4: false };

  // --- Open Graph share image ---
  const ogCtx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const ogPage = await ogCtx.newPage();
  await ogPage.goto(`${ORIGIN}/capture/og/${slug}`, { waitUntil: 'load' });
  await waitForAttract(ogPage);
  await ogPage.waitForTimeout(OG_WARMUP);
  await ogPage.screenshot({ path: join(OUT, `${slug}.og.png`), type: 'png' });
  await ogCtx.close();

  return { webm: clip.webm, mp4: clip.mp4, poster: true, og: true, w, h };
}

async function main(): Promise<void> {
  const filter = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  mkdirSync(OUT, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'roomble-capture-'));

  const server = startDevServer();
  let browser: Browser | undefined;
  try {
    await waitForServer();
    browser = await chromium.launch({ headless: true });
    const listPage = await browser.newPage();
    let games = await fetchGameList(listPage);
    await listPage.close();
    if (filter.length) games = games.filter((g) => filter.includes(g.slug));
    if (games.length === 0) throw new Error(`no games matched: ${filter.join(', ')}`);

    log(`${games.length} game(s); ffmpeg ${hasFfmpeg ? 'found (trim + mp4)' : 'not found (raw webm only)'}`);

    const manifest: Record<string, PreviewEntry> = existsSync(MANIFEST)
      ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, PreviewEntry>)
      : {};

    for (const game of games) {
      try {
        manifest[game.slug] = await captureGame(browser, tmp, game);
        log(`${game.slug}: done`);
      } catch (err) {
        log(`${game.slug}: FAILED — ${String(err)}`);
      }
    }

    // Stable key order so the committed manifest diffs cleanly.
    const ordered: Record<string, PreviewEntry> = {};
    for (const k of Object.keys(manifest).sort()) ordered[k] = manifest[k]!;
    writeFileSync(MANIFEST, JSON.stringify(ordered, null, 2) + '\n');
    log(`wrote ${MANIFEST}`);
  } finally {
    await browser?.close();
    stopDevServer(server);
    // Clean leftover raw videos.
    try {
      for (const f of readdirSync(tmp)) rmSync(join(tmp, f), { force: true });
      rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
}

void main();
