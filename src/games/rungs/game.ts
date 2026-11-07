/*
 * Rungs — the daily word ladder. Plain TypeScript + DOM/CSS (no canvas, no engine),
 * implementing the GameModule contract. The ladder is a neon sign built rung by
 * rung: the start word sits at the bottom, the goal word glows at the top, and each
 * accepted word lights up a new rung with the changed letter in marquee gold.
 *
 * Daily selection, validation, par/hints (BFS over the shipped dictionary),
 * streaks and share text all live in sibling pure modules; this file is the UI and
 * the glue. Nothing here touches localStorage directly — it all goes through ctx.save.
 */
import type { GameModule, GameInstance, GameContext, SaveService } from '../types';
import { PUZZLES, dictFor } from './data';
import { selectPuzzle, type Puzzle } from './daily';
import { checkStep, STEP_MESSAGES } from './validate';
import { shortestPath } from './graph';
import { EMPTY_STATS, applyResult, currentStreak, solvedToday, type Stats } from './streaks';
import { shareText } from './share';
import { SFX, rungFreq } from './sfx';
import { prefersReducedMotion } from '../../juice';
import { SITE_NAME, SITE_URL } from '../../config/site';

const MAX_HINTS = 2;
const KB_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

interface Rung {
  word: string;
  hinted: boolean;
  changed: number; // index of the changed letter vs the previous rung
}

interface StoredResult {
  day: number;
  number: number;
  steps: number;
  par: number;
  hints: boolean[];
}

type Mode = 'daily' | 'practice';

function create(el: HTMLElement, opts: { ctx?: GameContext; attract?: boolean }): GameInstance {
  const ctx = opts.ctx;
  const attract = opts.attract ?? false;
  const save: SaveService | undefined = ctx?.save;
  const reduced = ctx?.reducedMotion ?? prefersReducedMotion();
  const testHook =
    !attract &&
    typeof window !== 'undefined' &&
    !!(window as unknown as Record<string, unknown>).__rungsTest;

  // ---- DOM scaffold --------------------------------------------------------
  const root = document.createElement('div');
  root.className = 'rungs';
  root.innerHTML = TEMPLATE;
  injectStyles(root);
  el.appendChild(root);

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const idEl = $('.rungs__num');
  const parEl = $('.rungs__par');
  const goalRow = $('.rungs__goal .rungs__tiles');
  const goalLabel = $('.rungs__goal .rungs__goal-label');
  const ladder = $('.rungs__ladder');
  const kb = $('.rungs__kb');
  const hintBtn = $<HTMLButtonElement>('.rungs__hint');
  const menuBtn = $<HTMLButtonElement>('.rungs__menu');
  const toast = $('.rungs__toast');
  const overlay = $('.rungs__overlay');

  // ---- State ---------------------------------------------------------------
  let mode: Mode = 'daily';
  let puzzle: Puzzle = PUZZLES.puzzles[0]!;
  let number = 1;
  let today = 0;
  let dict = dictFor(4);
  let chain: Rung[] = [];
  let buffer = '';
  let hintsLeft = MAX_HINTS;
  let solved = false;
  let stats: Stats = save?.get<Stats>('stats', EMPTY_STATS) ?? EMPTY_STATS;

  const timers = new Set<ReturnType<typeof setTimeout>>();
  const after = (ms: number, fn: () => void): void => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };
  const clearTimers = (): void => {
    for (const t of timers) clearTimeout(t);
    timers.clear();
  };

  const currentWord = (): string => (chain.length ? chain[chain.length - 1]!.word : puzzle.start);

  // ---- Setup a puzzle ------------------------------------------------------

  function loadDaily(nowMs: number): void {
    const sel = selectPuzzle(nowMs, PUZZLES);
    mode = 'daily';
    puzzle = sel.puzzle;
    number = sel.number;
    today = sel.day;
    dict = dictFor(puzzle.len);
    resetChain();
    hintsLeft = MAX_HINTS;
    solved = false;
  }

  function loadPractice(): void {
    mode = 'practice';
    puzzle = PUZZLES.puzzles[Math.floor(Math.random() * PUZZLES.puzzles.length)]!;
    number = 0;
    dict = dictFor(puzzle.len);
    resetChain();
    hintsLeft = MAX_HINTS;
    solved = false;
  }

  function resetChain(): void {
    chain = [];
    buffer = '';
  }

  // ---- Actions -------------------------------------------------------------

  function typeLetter(ch: string): void {
    if (solved || attract) return;
    if (buffer.length >= puzzle.len) return;
    buffer += ch.toLowerCase();
    ctx?.audio.play(SFX.key);
    renderActive();
    syncKbTargets();
  }

  function backspace(): void {
    if (solved || attract || !buffer.length) return;
    buffer = buffer.slice(0, -1);
    ctx?.audio.play(SFX.back);
    renderActive();
  }

  function submit(): void {
    if (solved || attract) return;
    const prev = currentWord();
    if (buffer.length < puzzle.len) {
      flashToast(STEP_MESSAGES.length);
      shakeActive();
      return;
    }
    const err = checkStep(prev, buffer, dict);
    if (err) {
      flashToast(STEP_MESSAGES[err]);
      shakeActive();
      ctx?.audio.play(SFX.invalid);
      return;
    }
    acceptRung(buffer, false);
  }

  function acceptRung(word: string, hinted: boolean): void {
    const prev = currentWord();
    let changed = 0;
    for (let i = 0; i < word.length; i++) if (word[i] !== prev[i]) changed = i;
    chain.push({ word, hinted, changed });
    buffer = '';
    ctx?.audio.playPitched(SFX.accept, rungFreq(chain.length));
    render();
    syncKbTargets();
    if (word === puzzle.end) {
      onSolved();
    }
  }

  function useHint(): void {
    if (solved || attract || hintsLeft <= 0) return;
    const path = shortestPath(currentWord(), puzzle.end, dict);
    if (!path || path.length < 2) return;
    hintsLeft--;
    renderHintBtn();
    ctx?.audio.play(SFX.hint);
    acceptRung(path[1]!, true);
  }

  function onSolved(): void {
    solved = true;
    const steps = chain.length;
    const hints = chain.map((r) => r.hinted);

    if (mode === 'daily' && !attract) {
      stats = applyResult(stats, today, steps, puzzle.par);
      save?.set('stats', stats);
      const result: StoredResult = { day: today, number, steps, par: puzzle.par, hints };
      save?.set('last-result', result);
    }

    ctx?.audio.play(SFX.solve);
    ctx?.emit?.({ type: 'milestone', name: 'solved' });
    lightUpLadderThen(() => showResults({ steps, par: puzzle.par, hints, perfect: steps === puzzle.par }));
    publishTelemetry();
  }

  // ---- Solve animation -----------------------------------------------------

  function lightUpLadderThen(done: () => void): void {
    const rows = Array.from(ladder.querySelectorAll<HTMLElement>('.rungs__row'));
    if (reduced || !rows.length) {
      done();
      return;
    }
    // Bottom (start) to top (goal), in sequence.
    const ordered = rows.reverse();
    ordered.forEach((row, n) => after(n * 110, () => row.classList.add('is-flash')));
    after(ordered.length * 110 + 350, done);
  }

  function confetti(): void {
    if (reduced) return;
    const letters = (puzzle.start + puzzle.end).toUpperCase().split('');
    const rect = root.getBoundingClientRect();
    const pieces: { el: HTMLElement; x: number; y: number; vx: number; vy: number; rot: number; vr: number }[] = [];
    for (let i = 0; i < 36; i++) {
      const span = document.createElement('span');
      span.className = 'rungs__confetti';
      span.textContent = letters[i % letters.length] ?? 'A';
      span.style.color = [
        'var(--marquee)',
        'var(--phosphor)',
        'var(--joystick)',
        'var(--ticket)',
      ][i % 4]!;
      root.appendChild(span);
      pieces.push({
        el: span,
        x: rect.width / 2,
        y: rect.height * 0.5,
        vx: (Math.random() - 0.5) * 420,
        vy: -Math.random() * 360 - 120,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 480,
      });
    }
    let t0 = performance.now();
    const G = 900;
    const tick = (now: number): void => {
      const dt = Math.min(0.05, (now - t0) / 1000);
      t0 = now;
      let alive = false;
      for (const p of pieces) {
        p.vy += G * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`;
        if (p.y < rect.height + 60) alive = true;
      }
      if (alive && confettiRunning) confettiRaf = requestAnimationFrame(tick);
      else for (const p of pieces) p.el.remove();
    };
    confettiRunning = true;
    confettiRaf = requestAnimationFrame(tick);
  }
  let confettiRaf = 0;
  let confettiRunning = false;

  // ---- Rendering -----------------------------------------------------------

  function render(): void {
    idEl.textContent = mode === 'practice' ? 'practice' : `#${number}`;
    parEl.textContent = `par ${puzzle.par}`;
    renderGoal();
    renderLadder();
    renderHintBtn();
    publishTelemetry();
  }

  function renderGoal(): void {
    goalLabel.textContent = mode === 'practice' ? 'reach' : 'reach';
    goalRow.innerHTML = '';
    for (const ch of puzzle.end) goalRow.appendChild(tile(ch, { goal: true }));
  }

  function renderLadder(): void {
    ladder.innerHTML = '';
    // Active input row at the top.
    ladder.appendChild(activeRow());
    // Accepted rungs, newest just under the active row, oldest toward the start.
    for (let i = chain.length - 1; i >= 0; i--) {
      const r = chain[i]!;
      ladder.appendChild(rungRow(r, i === chain.length - 1));
    }
    // Start word anchors the bottom.
    ladder.appendChild(wordRow(puzzle.start, { start: true }));
    renderActive();
    // Keep the active row (the climbing frontier) in view when the ladder is tall.
    ladder.scrollTop = 0;
  }

  function renderActive(): void {
    const row = ladder.querySelector<HTMLElement>('.rungs__active');
    if (!row) return;
    row.innerHTML = '';
    for (let i = 0; i < puzzle.len; i++) {
      const ch = buffer[i] ?? '';
      const t = tile(ch, { active: true });
      if (i === buffer.length && !solved) t.classList.add('is-caret');
      row.appendChild(t);
    }
  }

  function activeRow(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'rungs__row rungs__active';
    return row;
  }

  function rungRow(r: Rung, newest: boolean): HTMLElement {
    const row = document.createElement('div');
    row.className = 'rungs__row rungs__filled';
    if (newest) row.classList.add('is-new');
    if (r.hinted) row.classList.add('is-hinted');
    for (let i = 0; i < r.word.length; i++) {
      row.appendChild(tile(r.word[i]!, { changed: i === r.changed }));
    }
    return row;
  }

  function wordRow(word: string, kind: { start?: boolean }): HTMLElement {
    const row = document.createElement('div');
    row.className = 'rungs__row' + (kind.start ? ' rungs__start' : '');
    for (const ch of word) row.appendChild(tile(ch, {}));
    return row;
  }

  function tile(
    ch: string,
    o: { changed?: boolean; active?: boolean; goal?: boolean; start?: boolean },
  ): HTMLElement {
    const t = document.createElement('span');
    t.className = 'rungs__tile';
    if (o.changed) t.classList.add('is-changed');
    if (o.active) t.classList.add('is-active');
    if (o.goal) t.classList.add('is-goal');
    t.textContent = ch ? ch.toUpperCase() : '';
    return t;
  }

  function renderHintBtn(): void {
    hintBtn.textContent = `Hint · ${hintsLeft}`;
    hintBtn.disabled = hintsLeft <= 0 || solved;
  }

  // ---- Keyboard (on-screen) ------------------------------------------------

  function buildKeyboard(): void {
    kb.innerHTML = '';
    KB_ROWS.forEach((rowStr, idx) => {
      const row = document.createElement('div');
      row.className = 'rungs__kbrow';
      if (idx === 2) row.appendChild(wideKey('enter', 'Enter'));
      for (const ch of rowStr) {
        const k = document.createElement('button');
        k.type = 'button';
        k.className = 'rungs__key';
        k.dataset.key = ch;
        k.textContent = ch.toUpperCase();
        row.appendChild(k);
      }
      if (idx === 2) row.appendChild(wideKey('back', '⌫'));
      kb.appendChild(row);
    });
  }

  function wideKey(action: string, label: string): HTMLElement {
    const k = document.createElement('button');
    k.type = 'button';
    k.className = 'rungs__key rungs__key--wide';
    k.dataset.action = action;
    k.textContent = label;
    return k;
  }

  function syncKbTargets(): void {
    if (chain.length < 1) return; // only after the first move
    const targetSet = new Set(puzzle.end.split(''));
    kb.querySelectorAll<HTMLElement>('.rungs__key[data-key]').forEach((k) => {
      k.classList.toggle('is-target', targetSet.has(k.dataset.key ?? ''));
    });
  }

  const onKbPointer = (e: Event): void => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('.rungs__key');
    if (!target) return;
    e.preventDefault();
    if (target.dataset.action === 'enter') submit();
    else if (target.dataset.action === 'back') backspace();
    else if (target.dataset.key) typeLetter(target.dataset.key);
  };

  // ---- Physical keyboard (capture so typing never triggers shell shortcuts) -

  const onKey = (e: KeyboardEvent): void => {
    if (attract) return;
    if (overlay.hasAttribute('data-show')) return; // results open: let menu buttons work
    const k = e.key;
    if (/^[a-zA-Z]$/.test(k)) {
      e.preventDefault();
      e.stopPropagation();
      typeLetter(k);
    } else if (k === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      backspace();
    } else if (k === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      submit();
    } else if (k === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      openMenu();
    }
  };

  // ---- Menu / help ---------------------------------------------------------

  function openMenu(): void {
    if (solved) return;
    showOverlay(menuHtml(), { menu: true });
  }

  // ---- Results + overlays --------------------------------------------------

  function showResults(info: { steps: number; par: number; hints: boolean[]; perfect: boolean }): void {
    confetti();
    showOverlay(resultsHtml(info), { menu: false });
  }

  function showStoredResult(r: StoredResult): void {
    solved = true;
    render();
    // Rebuild the solved ladder silently so the backdrop shows the finished climb.
    showOverlay(
      resultsHtml({ steps: r.steps, par: r.par, hints: r.hints, perfect: r.steps === r.par, revisit: true }),
      { menu: false },
    );
  }

  function showOverlay(html: string, o: { menu: boolean }): void {
    overlay.innerHTML = html;
    overlay.toggleAttribute('data-show', true);
    overlay.querySelector('[data-close]')?.addEventListener('click', closeOverlay);
    overlay.querySelector('[data-practice]')?.addEventListener('click', () => {
      closeOverlay();
      startPractice();
    });
    overlay.querySelector('[data-share]')?.addEventListener('click', doShare);
    if (o.menu) {
      overlay.querySelector('[data-resume]')?.addEventListener('click', closeOverlay);
    }
  }

  function closeOverlay(): void {
    overlay.toggleAttribute('data-show', false);
    overlay.innerHTML = '';
  }

  function doShare(): void {
    const steps = chain.length || (save?.get<StoredResult>('last-result', null as unknown as StoredResult)?.steps ?? 0);
    const hints = chain.length ? chain.map((r) => r.hinted) : save?.get<StoredResult>('last-result', null as unknown as StoredResult)?.hints ?? [];
    const text = shareText({
      title: 'Rungs',
      number,
      steps,
      par: puzzle.par,
      hints,
      url: `${SITE_URL}${import.meta.env.BASE_URL}games/rungs`,
    });
    const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
    if (nav.share && isTouchLike()) {
      void nav.share({ text }).catch(() => copyText(text));
    } else {
      copyText(text);
    }
  }

  function copyText(text: string): void {
    const done = () => flashToast('Copied result');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text: string, done: () => void): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    root.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      done();
    } catch {
      flashToast('Copy failed');
    }
    ta.remove();
  }

  function startPractice(): void {
    clearTimers();
    loadPractice();
    render();
    buildKeyboard();
  }

  // ---- Toast + shake -------------------------------------------------------

  function flashToast(msg: string): void {
    toast.textContent = msg;
    toast.toggleAttribute('data-show', true);
    after(1600, () => toast.toggleAttribute('data-show', false));
  }

  function shakeActive(): void {
    if (reduced) return;
    const row = ladder.querySelector<HTMLElement>('.rungs__active');
    if (!row) return;
    row.classList.remove('is-shake');
    void row.offsetWidth; // reflow to restart the animation
    row.classList.add('is-shake');
  }

  // ---- Telemetry (gated; used by e2e only when __rungsTest is set) ----------

  function publishTelemetry(): void {
    if (attract) return;
    const win = window as unknown as { __rungs?: Record<string, unknown> };
    const cur = currentWord();
    let next: string | null = null;
    if (testHook && !solved) {
      const path = shortestPath(cur, puzzle.end, dict);
      next = path && path.length > 1 ? path[1]! : null;
    }
    win.__rungs = {
      number,
      par: puzzle.par,
      steps: chain.length,
      solved,
      over: solved,
      mode,
      start: puzzle.start,
      end: puzzle.end,
      current: cur,
      ...(testHook ? { next } : {}),
    };
  }

  // ---- Attract (self-playing solved ladder being typed) --------------------

  let attractRaf = 0;
  let attractState: { path: string[]; step: number; typed: number; phase: 'type' | 'hold'; t: number } | null = null;
  let attractLast = 0;

  function attractStart(): void {
    loadPractice();
    const path = shortestPath(puzzle.start, puzzle.end, dict) ?? [puzzle.start, puzzle.end];
    attractState = { path, step: 1, typed: 0, phase: 'type', t: 0 };
    render();
    attractLast = performance.now();
    attractRaf = requestAnimationFrame(attractFrame);
  }

  function attractFrame(now: number): void {
    const dt = (now - attractLast) / 1000;
    attractLast = now;
    const s = attractState;
    if (s) {
      s.t += dt;
      if (s.phase === 'type') {
        const word = s.path[s.step] ?? '';
        if (s.t > 0.12) {
          s.t = 0;
          if (s.typed < word.length) {
            buffer = word.slice(0, s.typed + 1);
            s.typed++;
            renderActive();
          } else {
            // commit the rung
            const prev = currentWord();
            let changed = 0;
            for (let i = 0; i < word.length; i++) if (word[i] !== prev[i]) changed = i;
            chain.push({ word, hinted: false, changed });
            buffer = '';
            renderLadder();
            s.step++;
            s.typed = 0;
            if (s.step >= s.path.length) s.phase = 'hold';
          }
        }
      } else if (s.t > 1.8) {
        chain = [];
        buffer = '';
        attractStart();
        return;
      }
    }
    attractRaf = requestAnimationFrame(attractFrame);
  }

  // ---- Wire up -------------------------------------------------------------

  buildKeyboard();

  if (attract) {
    render();
    attractStart();
  } else {
    loadDaily(Date.now());
    render();
    syncKbTargets();

    kb.addEventListener('pointerdown', onKbPointer);
    window.addEventListener('keydown', onKey, { capture: true });
    hintBtn.addEventListener('click', useHint);
    menuBtn.addEventListener('click', openMenu);

    ctx?.emit({ type: 'ready' });
    ctx?.emit({ type: 'start' });

    // Already solved today? Show the finished result instead of replaying.
    if (solvedToday(stats, today)) {
      const last = save?.get<StoredResult>('last-result', null as unknown as StoredResult);
      if (last && last.day === today) after(0, () => showStoredResult(last));
    }
    publishTelemetry();
  }

  // ---- GameInstance --------------------------------------------------------

  let paused = false;
  return {
    pause() {
      paused = true;
      if (attractRaf) cancelAnimationFrame(attractRaf);
      attractRaf = 0;
      confettiRunning = false;
      if (confettiRaf) cancelAnimationFrame(confettiRaf);
    },
    resume() {
      if (!paused) return;
      paused = false;
      if (attract) {
        attractLast = performance.now();
        attractRaf = requestAnimationFrame(attractFrame);
      }
    },
    destroy() {
      clearTimers();
      confettiRunning = false;
      if (attractRaf) cancelAnimationFrame(attractRaf);
      if (confettiRaf) cancelAnimationFrame(confettiRaf);
      kb.removeEventListener('pointerdown', onKbPointer);
      window.removeEventListener('keydown', onKey, { capture: true });
      root.remove();
      if (!attract) {
        const win = window as unknown as { __rungs?: unknown };
        delete win.__rungs;
      }
    },
  };

  // ---- HTML fragments ------------------------------------------------------

  function menuHtml(): string {
    return `
      <div class="rungs__card">
        <h2 class="rungs__card-title">Paused</h2>
        <ol class="rungs__rules">
          <li>Change one letter to make a new real word.</li>
          <li>Every step must be a word. Bad guesses just buzz — they don't count.</li>
          <li>Reach the goal word at the top. Beat par if you can.</li>
        </ol>
        <div class="rungs__card-btns">
          <button type="button" class="rungs__btn rungs__btn--primary" data-resume>Resume</button>
          <button type="button" class="rungs__btn" data-practice>Practice puzzle</button>
        </div>
      </div>`;
  }

  function resultsHtml(info: {
    steps: number;
    par: number;
    hints: boolean[];
    perfect: boolean;
    revisit?: boolean;
  }): string {
    const squares = Array.from({ length: info.steps }, (_, i) =>
      info.hints[i] ? '<i class="sq sq--hint"></i>' : '<i class="sq"></i>',
    ).join('');
    const title = info.perfect ? 'Perfect climb' : 'Solved';
    const sub =
      mode === 'practice'
        ? 'Practice — not counted'
        : `${SITE_NAME} · Rungs #${number} · ${info.steps}/${info.par}`;
    const streakPanel =
      mode === 'practice'
        ? ''
        : `<div class="rungs__stats">
             ${stat('streak', currentStreak(stats, today))}
             ${stat('max', stats.maxStreak)}
             ${stat('played', stats.played)}
           </div>
           ${histogram(info.par)}`;
    const shareBtn =
      mode === 'practice'
        ? ''
        : `<button type="button" class="rungs__btn rungs__btn--primary" data-share>Share result</button>`;
    const practiceBtn = `<button type="button" class="rungs__btn" data-practice>${
      mode === 'practice' ? 'New practice' : 'Practice puzzle'
    }</button>`;
    const note =
      mode === 'practice' ? '' : `<p class="rungs__note">New climb at midnight, Singapore time.</p>`;
    return `
      <div class="rungs__card">
        <h2 class="rungs__card-title ${info.perfect ? 'is-perfect' : ''}">${title}</h2>
        <p class="rungs__card-sub">${sub}</p>
        <div class="rungs__squares">${squares}</div>
        ${streakPanel}
        <div class="rungs__card-btns">
          ${shareBtn}
          ${practiceBtn}
        </div>
        ${note}
      </div>`;
  }

  function stat(label: string, value: number): string {
    return `<div class="rungs__stat"><span class="rungs__stat-num">${value}</span><span class="rungs__stat-label">${label}</span></div>`;
  }

  function histogram(par: number): string {
    const entries = Object.entries(stats.dist);
    if (!entries.length) return '';
    const max = Math.max(...entries.map(([, v]) => v), 1);
    const rows = [0, 1, 2, 3]
      .map((d) => {
        const v = stats.dist[String(d)] ?? 0;
        const w = Math.round((v / max) * 100);
        const label = d === 0 ? 'par' : `+${d}`;
        const hl = par >= 0 && d === Math.max(0, chain.length - par) ? ' is-current' : '';
        return `<div class="rungs__hbar${hl}"><span class="rungs__hbar-label">${label}</span><span class="rungs__hbar-track"><span class="rungs__hbar-fill" style="width:${w}%"></span></span><span class="rungs__hbar-val">${v}</span></div>`;
      })
      .join('');
    return `<div class="rungs__hist">${rows}</div>`;
  }
}

function isTouchLike(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

const TEMPLATE = `
  <div class="rungs__top">
    <div class="rungs__id"><span class="rungs__word">RUNGS</span><span class="rungs__num">#1</span></div>
    <div class="rungs__ctrls">
      <span class="rungs__par">par 4</span>
      <button type="button" class="rungs__hint">Hint · 2</button>
      <button type="button" class="rungs__menu" aria-label="Menu">?</button>
    </div>
  </div>
  <div class="rungs__goal"><span class="rungs__goal-label">reach</span><div class="rungs__tiles"></div></div>
  <div class="rungs__ladder"></div>
  <div class="rungs__kb"></div>
  <div class="rungs__toast" role="status"></div>
  <div class="rungs__overlay"></div>
`;

let stylesInjected = false;
function injectStyles(root: HTMLElement): void {
  // One stylesheet for every instance; it lives in <head> so it survives re-mounts.
  if (stylesInjected && document.getElementById('rungs-styles')) return;
  if (document.getElementById('rungs-styles')) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'rungs-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
  void root;
}

const STYLES = `
.rungs {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  gap: var(--sp-2);
  padding: clamp(8px, 2.5%, 16px);
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(255,194,26,0.06), transparent 60%),
    #0a0618;
  color: var(--ticket);
  font-family: var(--font-ui);
  overflow: hidden;
  -webkit-user-select: none; user-select: none;
}
.rungs__top { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); }
.rungs__id { display: flex; align-items: baseline; gap: var(--sp-2); }
.rungs__word { font-family: var(--font-display); font-size: var(--fs-1); color: var(--ticket); letter-spacing: 0.02em; }
.rungs__num { font-family: var(--font-hud); font-size: var(--fs-2); color: var(--phosphor); text-shadow: var(--glow-phosphor); }
.rungs__ctrls { display: flex; align-items: center; gap: var(--sp-2); }
.rungs__par { font-family: var(--font-hud); font-size: var(--fs-1); color: var(--ticket-dim); }
.rungs__hint, .rungs__menu {
  font-family: var(--font-ui); font-size: var(--fs-0);
  color: var(--cabinet); background: var(--marquee);
  border: none; border-radius: var(--r-chip);
  padding: 6px 10px; cursor: pointer; line-height: 1;
}
.rungs__menu { width: 32px; height: 32px; background: var(--bezel); color: var(--ticket); font-size: var(--fs-2); padding: 0; }
.rungs__hint:disabled { background: var(--bezel); color: var(--ticket-dim); cursor: default; }

.rungs__goal { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.rungs__goal-label { font-size: var(--fs-0); color: var(--ticket-dim); letter-spacing: 0.08em; }
.rungs__tiles { display: flex; gap: clamp(4px, 1.4%, 8px); justify-content: center; }

.rungs__ladder {
  flex: 1; min-height: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  gap: clamp(4px, 1.2%, 8px);
  overflow-y: auto; overflow-x: hidden;
  padding: var(--sp-2) 0;
}
.rungs__row { display: flex; gap: clamp(4px, 1.4%, 8px); justify-content: center; flex: 0 0 auto; }
.rungs__row.is-shake { animation: rungs-shake 0.32s ease; }
.rungs__filled.is-new { animation: rungs-on 0.4s ease; }
.rungs__filled.is-flash .rungs__tile { animation: rungs-flash 0.5s ease; }

.rungs__tile {
  display: flex; align-items: center; justify-content: center;
  width: clamp(34px, 11vw, 52px); height: clamp(40px, 13vw, 60px);
  font-family: var(--font-display); font-size: clamp(var(--fs-2), 6vw, var(--fs-4));
  color: var(--ticket);
  background: rgba(255,244,220,0.04);
  border: 1px solid rgba(255,244,220,0.12);
  border-radius: var(--r-chip);
}
.rungs__tile.is-changed { color: var(--marquee); border-color: var(--marquee); text-shadow: var(--glow-marquee); box-shadow: inset 0 0 12px rgba(255,194,26,0.2); }
.rungs__tile.is-goal { color: var(--marquee); border-color: var(--marquee-edge); border-style: dashed; }
.rungs__tile.is-active { background: rgba(77,240,208,0.05); border-color: rgba(77,240,208,0.3); }
.rungs__tile.is-caret { border-color: var(--phosphor); box-shadow: inset 0 -3px 0 var(--phosphor); animation: rungs-caret 1s steps(1) infinite; }
.rungs__filled.is-hinted .rungs__tile.is-changed { color: var(--phosphor); border-color: var(--phosphor); text-shadow: var(--glow-phosphor); box-shadow: inset 0 0 12px rgba(77,240,208,0.2); }
.rungs__start .rungs__tile { color: var(--ticket-dim); border-style: solid; }

.rungs__kb { display: flex; flex-direction: column; gap: clamp(4px, 1.2%, 7px); padding-top: var(--sp-1); }
.rungs__kbrow { display: flex; gap: clamp(3px, 1%, 6px); justify-content: center; }
.rungs__key {
  flex: 1 1 0; min-width: 0; max-width: 46px; height: clamp(38px, 9vw, 48px);
  font-family: var(--font-ui); font-size: var(--fs-1); font-weight: 600;
  color: var(--ticket); background: var(--bezel);
  border: none; border-bottom: 3px solid var(--bezel-edge);
  border-radius: var(--r-chip); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  padding: 0;
}
.rungs__key:active { transform: translateY(2px); border-bottom-width: 1px; }
.rungs__key.is-target { color: var(--marquee); box-shadow: inset 0 0 0 1px var(--marquee-edge); }
.rungs__key--wide { flex: 1.6 1 0; max-width: 72px; font-size: var(--fs-0); background: var(--carpet); }

.rungs__toast {
  position: absolute; left: 50%; bottom: clamp(140px, 42%, 220px); transform: translateX(-50%) translateY(8px);
  background: var(--joystick); color: var(--ticket);
  font-size: var(--fs-0); padding: 6px 12px; border-radius: var(--r-chip);
  opacity: 0; pointer-events: none; transition: opacity 0.18s ease, transform 0.18s ease; z-index: 5;
  white-space: nowrap;
}
.rungs__toast[data-show] { opacity: 1; transform: translateX(-50%) translateY(0); }

.rungs__overlay {
  position: absolute; inset: 0; z-index: 10;
  display: none; align-items: center; justify-content: center;
  padding: var(--sp-4);
  background: radial-gradient(90% 90% at 50% 40%, rgba(10,6,24,0.86), rgba(10,6,24,0.96));
  backdrop-filter: none;
}
.rungs__overlay[data-show] { display: flex; }
.rungs__card {
  width: min(360px, 100%); display: flex; flex-direction: column; gap: var(--sp-3);
  background: var(--bezel); border: var(--panel-border); border-radius: var(--r-cabinet);
  padding: var(--sp-5); text-align: center;
}
.rungs__card-title { margin: 0; font-family: var(--font-display); font-size: var(--fs-4); color: var(--phosphor); text-shadow: var(--glow-phosphor); }
.rungs__card-title.is-perfect { color: var(--marquee); text-shadow: var(--glow-marquee); }
.rungs__card-sub { margin: 0; font-size: var(--fs-0); color: var(--ticket-dim); }
.rungs__squares { display: flex; gap: 5px; justify-content: center; flex-wrap: wrap; }
.rungs__squares .sq { width: 18px; height: 18px; border-radius: 3px; background: var(--phosphor); box-shadow: var(--glow-phosphor); }
.rungs__squares .sq--hint { background: var(--marquee); box-shadow: var(--glow-marquee); }
.rungs__stats { display: flex; justify-content: space-around; gap: var(--sp-2); }
.rungs__stat { display: flex; flex-direction: column; }
.rungs__stat-num { font-family: var(--font-hud); font-size: var(--fs-4); color: var(--phosphor); }
.rungs__stat-label { font-size: var(--fs-0); color: var(--ticket-dim); }
.rungs__hist { display: flex; flex-direction: column; gap: 3px; }
.rungs__hbar { display: flex; align-items: center; gap: var(--sp-2); font-size: var(--fs-0); color: var(--ticket-dim); }
.rungs__hbar-label { width: 28px; text-align: right; font-family: var(--font-hud); }
.rungs__hbar-track { flex: 1; height: 12px; background: rgba(255,244,220,0.08); border-radius: 3px; overflow: hidden; }
.rungs__hbar-fill { display: block; height: 100%; background: var(--ticket-dim); border-radius: 3px; }
.rungs__hbar.is-current .rungs__hbar-fill { background: var(--marquee); }
.rungs__hbar-val { width: 16px; font-family: var(--font-hud); }
.rungs__card-btns { display: flex; flex-direction: column; gap: var(--sp-2); }
.rungs__btn {
  font-family: var(--font-ui); font-size: var(--fs-1);
  color: var(--ticket); background: var(--carpet);
  border: none; border-bottom: 3px solid var(--bezel-edge);
  border-radius: var(--r-button); padding: 10px 16px; cursor: pointer;
}
.rungs__btn--primary { color: var(--cabinet); background: var(--marquee); border-bottom-color: var(--marquee-edge); font-weight: 600; }
.rungs__btn:active { transform: translateY(2px); border-bottom-width: 1px; }
.rungs__rules { text-align: left; margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: var(--sp-2); color: var(--ticket-dim); font-size: var(--fs-0); }
.rungs__note { margin: 0; font-size: var(--fs-0); color: var(--ticket-dim); }

.rungs__confetti { position: absolute; top: 0; left: 0; font-family: var(--font-display); font-size: var(--fs-2); pointer-events: none; z-index: 9; will-change: transform; }

@keyframes rungs-on { 0% { opacity: 0.2; transform: translateY(6px) scale(0.96); } 40% { opacity: 1; } 100% { opacity: 1; transform: none; } }
@keyframes rungs-flash { 0%,100% { } 40% { filter: brightness(1.8); } }
@keyframes rungs-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(7px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(3px); } }
@keyframes rungs-caret { 0%,50% { border-color: var(--phosphor); } 51%,100% { border-color: rgba(77,240,208,0.25); } }

@media (prefers-reduced-motion: reduce) {
  .rungs__filled.is-new, .rungs__filled.is-flash .rungs__tile, .rungs__row.is-shake, .rungs__tile.is-caret { animation: none; }
}
`;

const meta: GameModule['meta'] = {
  slug: 'rungs',
  title: 'Rungs',
  tagline: 'Change one letter at a time from the start word to the end.',
  description:
    'Climb from a start word to an end word, changing one letter at a time, every step a real word. One puzzle a day, the same for everyone. Beat par, hold your streak, and share the shape of your climb.',
  howToPlay: [
    'Start from the word at the bottom.',
    'Change one letter to make a new real word — every rung must be a word.',
    'Reach the goal word at the top in as few steps as you can.',
  ],
  controls: {
    desktop: ['Type letters', 'Enter to submit a word', 'Backspace to edit, Esc for the menu'],
    mobile: ['Use the on-screen keyboard', 'Tap enter to submit'],
  },
  orientation: 'any',
  category: 'daily',
  daily: true,
};

const Rungs: GameModule = {
  meta,
  async mount(el: HTMLElement, ctx: GameContext): Promise<GameInstance> {
    return create(el, { ctx });
  },
  async attract(el: HTMLElement): Promise<GameInstance> {
    return create(el, { attract: true });
  },
};

export default Rungs;
