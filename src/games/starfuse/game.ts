/*
 * Starfuse — Canvas 2D game controller (no engine), implementing the GameModule
 * contract. Reuses the shared juice utilities (Particles, Shaker, easings) and
 * services (ctx.audio incl. playPitched, ctx.save).
 */
import type { GameModule, GameInstance, GameContext, SaveService } from '../types';
import {
  newGrid,
  slideTraced,
  spawn,
  canMove,
  maxTile,
  type Grid,
  type Dir,
  type TileMove,
} from './board';
import { TIERS, MAX_TIER, SUN_TIER, drawTile } from './tiers';
import { scoreForMove } from './scoring';
import { shouldSpawnWell, pickWell, applyWellExpiry, type WellState } from './wells';
import { bestMove } from './ai';
import { SFX, fusionFreq } from './sfx';
import { Particles, Shaker, easeOutCubic, prefersReducedMotion } from '../../juice';

const LW = 360;
const LH = 480;
const BX = 20;
const BY = 96;
const BS = 320;
const GAP = 10;
const SLIDE_MS = 120;
const SWIPE = 30;

const COL = {
  ticket: '#fff4dc',
  dim: '#c9b9a6',
  joystick: '#ff3d6e',
  phosphor: '#4df0d0',
  marquee: '#ffc21a',
  socket: 'rgba(255,244,220,0.06)',
  panel: '#33204f',
};

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Snapshot {
  grid: Grid;
  score: number;
  moveCount: number;
  well: WellState | null;
}

function create(el: HTMLElement, opts: { ctx?: GameContext; attract?: boolean }): GameInstance {
  const ctx = opts.ctx;
  const attract = opts.attract ?? false;
  const save: SaveService | undefined = ctx?.save;
  const reduced = ctx?.reducedMotion ?? prefersReducedMotion();

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.background = '#06040d';
  el.appendChild(canvas);
  const g = canvas.getContext('2d')!;

  const particles = new Particles(240, reduced);
  const shaker = new Shaker({ maxOffset: 8, reducedMotion: reduced });

  // Settings (persisted)
  const wellsEnabled = attract ? true : (save?.get<boolean>('wells', true) ?? true);
  const bigSkyUnlocked = save?.get<boolean>('bigsky-unlocked', false) ?? false;
  const bigSky = !attract && bigSkyUnlocked && (save?.get<boolean>('bigsky', false) ?? false);
  const N = bigSky ? 5 : 4;
  const cell = (BS - GAP * (N + 1)) / N;
  const tileR = cell * 0.42;

  const discovered = new Set<number>(save?.get<number[]>('discovered', []) ?? []);

  // State
  let grid: Grid = newGrid(N);
  let score = 0;
  let moveCount = 0;
  let undosLeft = 1;
  let undoSnap: Snapshot | null = null;
  let well: WellState | null = null;
  let over = false;
  let bestTile = 0;

  // Animation
  let anim: { t: number; moves: TileMove[]; done: () => void } | null = null;
  const pops = new Map<string, number>(); // "r,c" -> remaining pop time
  const spawns = new Map<string, number>(); // "r,c" -> spawn-in time
  let banner: { text: string; timer: number } | null = null;
  let flare = 0;
  let time = 0;

  // UI state
  let settingsOpen = false;
  let confirmOpen = false;

  // Starfield
  const stars = Array.from({ length: 60 }, () => ({
    x: Math.random() * LW,
    y: Math.random() * LH,
    z: 0.2 + Math.random() * 0.8,
  }));

  // Fit / letterbox
  let scale = 1;
  let offX = 0;
  let offY = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize(): void {
    const rect = el.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    scale = Math.min(canvas.width / LW, canvas.height / LH);
    offX = (canvas.width - LW * scale) / 2;
    offY = (canvas.height - LH * scale) / 2;
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  const toLogical = (cx: number, cy: number): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return { x: ((cx - rect.left) * dpr - offX) / scale, y: ((cy - rect.top) * dpr - offY) / scale };
  };

  const undoRect: Rect = { x: LW - 96, y: 14, w: 40, h: 40 };
  const settingsRect: Rect = { x: LW - 50, y: 14, w: 40, h: 40 };
  const hit = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  const cellCenter = (r: number, c: number): { x: number; y: number } => ({
    x: BX + GAP + c * (cell + GAP) + cell / 2,
    y: BY + GAP + r * (cell + GAP) + cell / 2,
  });

  // ---- Game actions --------------------------------------------------------

  function reset(): void {
    grid = newGrid(N);
    score = 0;
    moveCount = 0;
    undosLeft = 1;
    undoSnap = null;
    well = null;
    over = false;
    bestTile = 0;
    anim = null;
    pops.clear();
    spawns.clear();
    banner = null;
    const s1 = spawn(grid);
    grid = s1.grid;
    const s2 = spawn(grid);
    grid = s2.grid;
    markDiscovered(1);
    markDiscovered(2);
    bestTile = maxTile(grid);
  }

  function snapshot(): Snapshot {
    return {
      grid: grid.map((row) => row.slice()),
      score,
      moveCount,
      well: well ? { ...well } : null,
    };
  }

  function move(dir: Dir): void {
    if (anim || over || settingsOpen || confirmOpen) return;
    const traced = slideTraced(grid, dir);
    if (!traced.moved) return;

    if (!attract) undoSnap = snapshot();
    ctx?.audio.play(SFX.slide);

    anim = {
      t: 0,
      moves: traced.moves,
      done: () => applyMove(traced.grid, traced.merges, traced.moves),
    };
  }

  function applyMove(nextGrid: Grid, merges: number[], moves: TileMove[]): void {
    grid = nextGrid;
    score += scoreForMove(merges);
    moveCount++;

    // Fusion pops + particles + musical tones.
    const mergedCells = new Set<string>();
    for (const m of moves) if (m.merged) mergedCells.add(`${m.to[0]},${m.to[1]}`);
    for (const key of mergedCells) {
      const [r, c] = key.split(',').map(Number) as [number, number];
      popCell(r, c);
      const tier = grid[r]![c]!;
      fuseFx(r, c, tier);
    }

    // Gravity well countdown / expiry.
    if (well) {
      well.movesLeft--;
      if (well.movesLeft <= 0) {
        const res = applyWellExpiry(grid, well);
        grid = res.grid;
        if (res.merges.length) {
          score += scoreForMove(res.merges);
          ctx?.audio.play(SFX.well);
          popCell(well.r, well.c);
          fuseFx(well.r, well.c, grid[well.r]![well.c]!);
        }
        well = null;
      }
    }
    if (wellsEnabled && !well && shouldSpawnWell(moveCount)) {
      well = pickWell(grid);
    }

    // Spawn a new tile.
    const sp = spawn(grid);
    grid = sp.grid;
    if (sp.pos) spawns.set(`${sp.pos[0]},${sp.pos[1]}`, 1);

    // Discoveries from this move's fusions.
    for (const tier of merges) markDiscovered(tier);
    bestTile = Math.max(bestTile, maxTile(grid));

    anim = null;
    if (!canMove(grid)) gameOver();
  }

  function fuseFx(r: number, c: number, tier: number): void {
    const { x, y } = cellCenter(r, c);
    particles.burst(x, y, {
      count: 14,
      speed: 150,
      colors: [TIERS[tier]?.color ?? '#fff', '#fff4dc'],
      life: 0.5,
    });
    ctx?.audio.playPitched(SFX.fusion, fusionFreq(tier));
    if (tier >= SUN_TIER) {
      shaker.add(0.6);
      flare = 0.5;
    }
  }

  function popCell(r: number, c: number): void {
    pops.set(`${r},${c}`, 0.18);
  }

  function markDiscovered(tier: number): void {
    if (discovered.has(tier)) return;
    discovered.add(tier);
    if (!attract) {
      save?.set('discovered', [...discovered]);
      if (tier >= 5) {
        banner = { text: `First ${TIERS[tier]?.name ?? ''}`, timer: 2 };
        ctx?.audio.play(SFX.discovery);
      }
      if (tier >= SUN_TIER && !bigSkyUnlocked) save?.set('bigsky-unlocked', true);
    }
  }

  function undo(): void {
    if (attract || anim || over || !undoSnap || undosLeft <= 0) return;
    grid = undoSnap.grid;
    score = undoSnap.score;
    moveCount = undoSnap.moveCount;
    well = undoSnap.well;
    undoSnap = null;
    undosLeft--;
  }

  function gameOver(): void {
    if (attract) {
      reset();
      return;
    }
    if (over) return;
    over = true;
    ctx?.audio.play(SFX.gameover);
    ctx?.emit({ type: 'gameover', score, stats: { bestTile, moves: moveCount } });
  }

  // ---- Input ---------------------------------------------------------------

  const keyDirs: Record<string, Dir> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    KeyA: 'left',
    KeyD: 'right',
    KeyW: 'up',
    KeyS: 'down',
  };

  const onKey = (e: KeyboardEvent): void => {
    if (attract) return;
    if (confirmOpen) {
      if (e.code === 'KeyY' || e.code === 'Enter') {
        confirmOpen = false;
        reset();
      } else if (e.code === 'KeyN') confirmOpen = false;
      return;
    }
    const dir = keyDirs[e.code];
    if (dir) {
      e.preventDefault();
      move(dir);
    } else if (e.code === 'KeyU') undo();
    else if (e.code === 'KeyR') confirmOpen = true;
  };

  let sx = 0;
  let sy = 0;
  let swiping = false;
  const onDown = (e: PointerEvent): void => {
    if (attract) return;
    const p = toLogical(e.clientX, e.clientY);
    if (confirmOpen) {
      handleConfirmTap(p.x, p.y);
      return;
    }
    if (settingsOpen) {
      handleSettingsTap(p.x, p.y);
      return;
    }
    if (hit(undoRect, p.x, p.y)) {
      undo();
      return;
    }
    if (hit(settingsRect, p.x, p.y)) {
      settingsOpen = true;
      return;
    }
    if (p.x >= BX && p.x <= BX + BS && p.y >= BY && p.y <= BY + BS) {
      sx = p.x;
      sy = p.y;
      swiping = true;
    }
  };
  const onUp = (e: PointerEvent): void => {
    if (!swiping) return;
    swiping = false;
    const p = toLogical(e.clientX, e.clientY);
    const dx = p.x - sx;
    const dy = p.y - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
    else move(dy > 0 ? 'down' : 'up');
  };

  function settingsRows(): Rect[] {
    return [
      { x: BX + 30, y: BY + 90, w: BS - 60, h: 48 }, // wells
      { x: BX + 30, y: BY + 150, w: BS - 60, h: 48 }, // big sky
      { x: BX + 110, y: BY + 220, w: 100, h: 44 }, // close
    ];
  }
  function handleSettingsTap(x: number, y: number): void {
    const [wellsR, bigR, closeR] = settingsRows();
    if (wellsR && hit(wellsR, x, y)) save?.set('wells', !(save?.get<boolean>('wells', true) ?? true));
    else if (bigR && bigSkyUnlocked && hit(bigR, x, y))
      save?.set('bigsky', !(save?.get<boolean>('bigsky', false) ?? false));
    else if (closeR && hit(closeR, x, y)) settingsOpen = false;
  }
  function handleConfirmTap(x: number, y: number): void {
    const yes: Rect = { x: BX + 40, y: BY + 150, w: 100, h: 48 };
    const no: Rect = { x: BX + 180, y: BY + 150, w: 100, h: 48 };
    if (hit(yes, x, y)) {
      confirmOpen = false;
      reset();
    } else if (hit(no, x, y)) confirmOpen = false;
  }

  window.addEventListener('keydown', onKey);
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);

  // ---- Loop + render -------------------------------------------------------

  let raf = 0;
  let last = performance.now();
  let running = true;
  let botTimer = 0;

  function frame(now: number): void {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    // starfield drift
    for (const s of stars) {
      s.x -= s.z * 12 * dt;
      if (s.x < 0) s.x += LW;
    }

    if (anim) {
      anim.t += dt * (1000 / SLIDE_MS);
      if (anim.t >= 1) {
        const done = anim.done;
        anim = null;
        done();
      }
    }

    for (const [k, v] of pops) {
      const nv = v - dt;
      if (nv <= 0) pops.delete(k);
      else pops.set(k, nv);
    }
    for (const [k, v] of spawns) {
      const nv = v - dt * 4;
      if (nv <= 0) spawns.delete(k);
      else spawns.set(k, nv);
    }
    if (banner) {
      banner.timer -= dt;
      if (banner.timer <= 0) banner = null;
    }
    if (flare > 0) flare = Math.max(0, flare - dt);
    particles.update(dt);

    if (attract && !anim && !over) {
      botTimer += dt;
      if (botTimer > 0.26) {
        botTimer = 0;
        const dir = bestMove(grid);
        if (dir) move(dir);
        else reset();
      }
    }

    render();
    raf = requestAnimationFrame(frame);
  }

  function render(): void {
    const sh = shaker.update(1 / 60);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#06040d';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.translate(offX + sh.x, offY + sh.y);
    g.scale(scale, scale);

    // Starfield
    for (const s of stars) {
      g.globalAlpha = 0.2 + s.z * 0.5;
      g.fillStyle = '#fff4dc';
      g.fillRect(s.x, s.y, s.z < 0.5 ? 1 : 2, s.z < 0.5 ? 1 : 2);
    }
    g.globalAlpha = 1;

    drawHud();

    // Board panel + sockets
    g.fillStyle = 'rgba(30,16,51,0.7)';
    roundRect(g, BX, BY, BS, BS, 12);
    g.fill();
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        const { x, y } = cellCenter(r, c);
        g.fillStyle = COL.socket;
        roundRect(g, x - cell / 2, y - cell / 2, cell, cell, 8);
        g.fill();
      }

    // Well highlight
    if (well) {
      const { x, y } = cellCenter(well.r, well.c);
      g.strokeStyle = COL.joystick;
      g.lineWidth = 3;
      g.globalAlpha = 0.5 + Math.sin(time * 6) * 0.3;
      roundRect(g, x - cell / 2 - 2, y - cell / 2 - 2, cell + 4, cell + 4, 10);
      g.stroke();
      g.globalAlpha = 1;
    }

    // Tiles (animated or static)
    if (anim) {
      const p = easeOutCubic(Math.min(1, anim.t));
      for (const m of anim.moves) {
        const from = cellCenter(m.from[0], m.from[1]);
        const to = cellCenter(m.to[0], m.to[1]);
        const x = from.x + (to.x - from.x) * p;
        const y = from.y + (to.y - from.y) * p;
        drawCelestial(m.tier, x, y, 1);
      }
    } else {
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++) {
          const v = grid[r]![c]!;
          if (v === 0) continue;
          const { x, y } = cellCenter(r, c);
          let s = 1;
          const popT = pops.get(`${r},${c}`);
          if (popT) s = 1 + Math.sin((popT / 0.18) * Math.PI) * 0.22;
          const spawnT = spawns.get(`${r},${c}`);
          if (spawnT) s = 1 - spawnT * 0.6;
          drawCelestial(v, x, y, s);
        }
    }

    particles.draw(g);

    drawCollection();

    if (flare > 0) {
      g.fillStyle = COL.marquee;
      g.globalAlpha = flare * 0.3;
      g.fillRect(0, 0, LW, LH);
      g.globalAlpha = 1;
    }

    if (banner) drawBanner();
    if (settingsOpen) drawSettings();
    if (confirmOpen) drawConfirm();

    if (!attract) {
      (window as unknown as { __starfuse?: object }).__starfuse = { score, bestTile, over };
    }
  }

  function drawCelestial(tier: number, x: number, y: number, s: number): void {
    drawTile(g, tier, x, y, tileR, time, s);
    g.shadowBlur = 0;
    // name label
    g.fillStyle = COL.dim;
    g.font = "11px 'Chakra Petch', sans-serif";
    g.textAlign = 'center';
    g.fillText(TIERS[tier]?.name ?? '', x, y + tileR + 12);
    g.textAlign = 'left';
  }

  function drawHud(): void {
    g.fillStyle = COL.phosphor;
    g.font = "28px 'VT323', monospace";
    g.textBaseline = 'top';
    g.fillText(`${score}`, BX, 16);
    g.fillStyle = COL.dim;
    g.font = "12px 'Chakra Petch', sans-serif";
    g.fillText(`best: ${bestTile ? TIERS[bestTile]?.name ?? '' : '—'}`, BX, 48);
    g.textBaseline = 'alphabetic';

    // Undo button
    drawIconButton(undoRect, undosLeft > 0 && !!undoSnap ? COL.phosphor : COL.dim, 'undo');
    // Settings button
    drawIconButton(settingsRect, COL.ticket, 'gear');
  }

  function drawIconButton(r: Rect, color: string, icon: 'undo' | 'gear'): void {
    g.fillStyle = COL.panel;
    roundRect(g, r.x, r.y, r.w, r.h, 8);
    g.fill();
    g.strokeStyle = color;
    g.lineWidth = 2;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    if (icon === 'undo') {
      g.beginPath();
      g.arc(cx, cy, 9, Math.PI * 0.4, Math.PI * 1.9);
      g.stroke();
      g.beginPath();
      g.moveTo(cx - 9, cy - 3);
      g.lineTo(cx - 11, cy + 4);
      g.lineTo(cx - 4, cy + 4);
      g.closePath();
      g.fillStyle = color;
      g.fill();
    } else {
      g.beginPath();
      g.arc(cx, cy, 6, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7);
        g.lineTo(cx + Math.cos(a) * 11, cy + Math.sin(a) * 11);
        g.stroke();
      }
    }
  }

  function drawCollection(): void {
    const total = MAX_TIER;
    const found = discovered.size;
    g.fillStyle = COL.dim;
    g.font = "12px 'Chakra Petch', sans-serif";
    g.textAlign = 'left';
    g.fillText(`Discovered ${found}/${total}`, BX, BY + BS + 18);
    const dotY = BY + BS + 34;
    const dotGap = (BS - 8) / total;
    for (let t = 1; t <= total; t++) {
      const x = BX + 4 + (t - 1) * dotGap;
      g.fillStyle = discovered.has(t) ? TIERS[t]?.color ?? '#fff' : 'rgba(255,244,220,0.12)';
      g.beginPath();
      g.arc(x, dotY, 4, 0, Math.PI * 2);
      g.fill();
    }
  }

  function drawBanner(): void {
    if (!banner) return;
    const a = Math.min(1, banner.timer);
    g.globalAlpha = a;
    g.fillStyle = COL.marquee;
    g.font = "22px 'Bungee', sans-serif";
    g.textAlign = 'center';
    g.fillText(banner.text, LW / 2, BY - 18);
    g.textAlign = 'left';
    g.globalAlpha = 1;
  }

  function drawSettings(): void {
    overlayPanel('Settings');
    const [wellsR, bigR, closeR] = settingsRows() as [Rect, Rect, Rect];
    const wellsOn = save?.get<boolean>('wells', true) ?? true;
    toggleRow(wellsR, 'Gravity wells', wellsOn ? 'On' : 'Off');
    if (bigSkyUnlocked) {
      const big = save?.get<boolean>('bigsky', false) ?? false;
      toggleRow(bigR, 'Big sky (5×5)', big ? 'On' : 'Off');
    } else {
      toggleRow(bigR, 'Big sky (5×5)', 'Locked');
    }
    g.fillStyle = COL.marquee;
    roundRect(g, closeR.x, closeR.y, closeR.w, closeR.h, 8);
    g.fill();
    g.fillStyle = '#1e1033';
    g.font = "16px 'Chakra Petch', sans-serif";
    g.textAlign = 'center';
    g.fillText('Close', closeR.x + closeR.w / 2, closeR.y + 28);
    g.textAlign = 'left';
    g.fillStyle = COL.dim;
    g.font = "11px 'Chakra Petch', sans-serif";
    g.fillText('Changes apply on the next game.', BX + 30, BY + 206);
  }

  function toggleRow(r: Rect, label: string, value: string): void {
    g.fillStyle = COL.panel;
    roundRect(g, r.x, r.y, r.w, r.h, 8);
    g.fill();
    g.fillStyle = COL.ticket;
    g.font = "15px 'Chakra Petch', sans-serif";
    g.textAlign = 'left';
    g.fillText(label, r.x + 12, r.y + 30);
    g.fillStyle = value === 'On' ? COL.phosphor : value === 'Locked' ? COL.dim : COL.joystick;
    g.textAlign = 'right';
    g.fillText(value, r.x + r.w - 12, r.y + 30);
    g.textAlign = 'left';
  }

  function drawConfirm(): void {
    overlayPanel('Restart this game?');
    const yes: Rect = { x: BX + 40, y: BY + 150, w: 100, h: 48 };
    const no: Rect = { x: BX + 180, y: BY + 150, w: 100, h: 48 };
    g.fillStyle = COL.joystick;
    roundRect(g, yes.x, yes.y, yes.w, yes.h, 8);
    g.fill();
    g.fillStyle = COL.panel;
    roundRect(g, no.x, no.y, no.w, no.h, 8);
    g.fill();
    g.fillStyle = '#1e1033';
    g.font = "16px 'Chakra Petch', sans-serif";
    g.textAlign = 'center';
    g.fillText('Restart', yes.x + yes.w / 2, yes.y + 30);
    g.fillStyle = COL.ticket;
    g.fillText('Cancel', no.x + no.w / 2, no.y + 30);
    g.textAlign = 'left';
  }

  function overlayPanel(title: string): void {
    g.fillStyle = 'rgba(6,4,13,0.8)';
    g.fillRect(BX, BY, BS, BS);
    g.fillStyle = COL.ticket;
    g.font = "20px 'Bungee', sans-serif";
    g.textAlign = 'center';
    g.fillText(title, LW / 2, BY + 50);
    g.textAlign = 'left';
  }

  // init
  reset();
  ctx?.emit({ type: 'ready' });
  ctx?.emit({ type: 'start' });
  last = performance.now();
  raf = requestAnimationFrame(frame);

  return {
    pause() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    },
    resume() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      particles.clear();
      canvas.remove();
    },
  };
}

function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

const meta: GameModule['meta'] = {
  slug: 'starfuse',
  title: 'Starfuse',
  tagline: 'Slide and fuse matching bodies, from dust to rocks to stars.',
  description:
    'Slide the whole board and fuse matching celestial bodies into bigger ones — dust into rocks, rocks into moons, on toward a star and beyond. Gravity wells appear every so often and pull matching neighbours together. Calm, satisfying and hard to put down.',
  howToPlay: [
    'Swipe or press a direction to slide every tile.',
    'Two matching bodies that meet fuse into the next tier.',
    'Keep fusing before the board fills up. One undo per game.',
  ],
  controls: {
    desktop: ['Arrows or WASD to slide', 'U to undo, R to restart', 'P or Esc to pause'],
    mobile: ['Swipe to slide', 'Undo and settings buttons above the board'],
  },
  orientation: 'portrait',
  category: 'puzzle',
};

const Starfuse: GameModule = {
  meta,
  async mount(el: HTMLElement, ctx: GameContext): Promise<GameInstance> {
    return create(el, { ctx });
  },
  async attract(el: HTMLElement): Promise<GameInstance> {
    return create(el, { attract: true });
  },
};

export default Starfuse;
