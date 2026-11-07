/*
 * Stackdown — Phaser 3 scene. Presentation, input and timing on top of the pure
 * logic modules (board / pieces / srs / scoring / ai). Handles DAS/ARR, gestures,
 * ghost/hold/next, lock delay, the charge Shockwave, scoring, levels and all the
 * juice (clears, shake, hit-stop, combos, danger, level-up, tetris stamp).
 */
import Phaser from 'phaser';
import type { GameContext } from '../types';
import { Board, WIDTH, VISIBLE_TOP, VISIBLE_ROWS, HEIGHT } from './board';
import {
  SevenBag,
  SPAWN,
  PIECE_COLORS,
  minos,
  type PieceType,
  type Matrix,
} from './pieces';
import { tryRotate, type Active, type RotState } from './srs';
import {
  resolveClear,
  levelForLines,
  gravityMs,
  hardDropPoints,
  softDropPoints,
  CHARGE_MAX,
} from './scoring';
import { bestPlacement } from './ai';
import { SFX, clearSound } from './sfx';

export const LOGICAL_W = 360;
export const LOGICAL_H = 640;

const CELL = 24;
const WELL_X = 60;
const WELL_Y = 100;
const WELL_W = WIDTH * CELL; // 240
const WELL_H = VISIBLE_ROWS * CELL; // 480

const C = {
  cabinet: '#1e1033',
  bezel: '#33204f',
  phosphor: '#4df0d0',
  marquee: '#ffc21a',
  joystick: '#ff3d6e',
  ticket: '#fff4dc',
  dim: '#c9b9a6',
  grid: 0x2a1745,
};

const DAS = 160;
const ARR = 40;
const LOCK_DELAY = 500;
const MAX_LOCK_RESETS = 15;
const CLEAR_MS = 90;

interface SceneData {
  ctx?: GameContext;
  attract: boolean;
  onGameOver?: (score: number, stats: Record<string, number>) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: number;
  size: number;
}

export class StackdownScene extends Phaser.Scene {
  // injected
  private ctx?: GameContext;
  private attract = false;
  private reduced = false;
  private onGameOver?: (score: number, stats: Record<string, number>) => void;

  // state
  private board = new Board();
  private bag = new SevenBag();
  private active!: Active;
  private holdType: PieceType | null = null;
  private canHold = true;
  private score = 0;
  private lines = 0;
  private level = 1;
  private combo = -1;
  private b2b = false;
  private charge = 0;
  private over = false;

  // timers
  private gravAcc = 0;
  private lockAcc = 0;
  private lockResets = 0;
  private grounded = false;
  private clearTimer = 0;
  private clearingRows: number[] = [];
  private pendingSpawn = false;

  // input
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private moveDir = 0;
  private dasAcc = 0;
  private dasCharged = false;
  private softHeld = false;

  // fx
  private shakeAmt = 0;
  private freeze = 0;
  private particles: Particle[] = [];
  private comboText!: Phaser.GameObjects.Text;
  private comboTimer = 0;
  private stamp!: Phaser.GameObjects.Text;
  private stampTimer = 0;
  private levelFlash = 0;
  private dangerPulse = 0;
  private bulbT = 0;

  // graphics / text
  private g!: Phaser.GameObjects.Graphics;
  private gFx!: Phaser.GameObjects.Graphics;
  private tScore!: Phaser.GameObjects.Text;
  private tLevel!: Phaser.GameObjects.Text;
  private tLines!: Phaser.GameObjects.Text;

  // touch buttons (hit rects in logical space)
  private touch = false;
  private btnHold = new Phaser.Geom.Rectangle(WELL_X, LOGICAL_H - 52, 112, 44);
  private btnShock = new Phaser.Geom.Rectangle(WELL_X + 128, LOGICAL_H - 52, 112, 44);

  // attract
  private aiPlan: { state: number; x: number } | null = null;
  private aiAcc = 0;

  constructor() {
    super('stackdown');
  }

  init(data: SceneData): void {
    this.ctx = data.ctx;
    this.attract = data.attract;
    this.onGameOver = data.onGameOver;
    this.reduced = data.ctx?.reducedMotion ?? false;
  }

  create(): void {
    this.touch = !this.attract && this.sys.game.device.input.touch;

    this.g = this.add.graphics();
    this.gFx = this.add.graphics();

    const mk = (x: number, y: number, size: number, color: string, font = "'VT323'") =>
      this.add
        .text(x, y, '', { fontFamily: font, fontSize: `${size}px`, color })
        .setOrigin(0, 0);

    // HUD text
    this.add.text(WELL_X + WELL_W / 2, 12, 'SCORE', {
      fontFamily: "'Chakra Petch'",
      fontSize: '11px',
      color: C.dim,
    }).setOrigin(0.5, 0);
    this.tScore = mk(0, 24, 30, C.phosphor);
    this.tScore.setOrigin(0.5, 0);
    this.tScore.x = WELL_X + WELL_W / 2;

    this.tLevel = mk(WELL_X, 62, 18, C.ticket);
    this.tLines = mk(WELL_X + WELL_W, 62, 18, C.ticket);
    this.tLines.setOrigin(1, 0);

    this.comboText = this.add
      .text(WELL_X + WELL_W / 2, WELL_Y + 40, '', {
        fontFamily: "'VT323'",
        fontSize: '28px',
        color: C.marquee,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.stamp = this.add
      .text(WELL_X + WELL_W / 2, WELL_Y + WELL_H / 2, 'STACKDOWN', {
        fontFamily: "'Bungee'",
        fontSize: '34px',
        color: C.ticket,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.setupInput();
    this.reset();
  }

  private reset(): void {
    this.board.reset();
    this.bag = new SevenBag();
    this.holdType = null;
    this.canHold = true;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.b2b = false;
    this.charge = 0;
    this.over = false;
    this.gravAcc = 0;
    this.clearTimer = 0;
    this.clearingRows = [];
    this.pendingSpawn = false;
    this.particles = [];
    this.spawn();
  }

  // ---- Input ---------------------------------------------------------------

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys(
        'LEFT,RIGHT,UP,DOWN,X,Z,SPACE,C,E',
      ) as Record<string, Phaser.Input.Keyboard.Key>;
      // Stop Space/arrows from scrolling the page while focused.
      kb.addCapture('LEFT,RIGHT,UP,DOWN,SPACE');
    }

    // Pointer gestures on the whole scene.
    let sx = 0;
    let sy = 0;
    let st = 0;
    let lastSoftY = 0;
    let swiped = false;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.attract) return;
      // Touch buttons first.
      if (this.touch) {
        if (this.btnHold.contains(p.x, p.y)) {
          this.hold();
          return;
        }
        if (this.btnShock.contains(p.x, p.y)) {
          this.useShockwave();
          return;
        }
      }
      sx = p.x;
      sy = p.y;
      st = this.time.now;
      lastSoftY = p.y;
      swiped = false;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.attract || !p.isDown || swiped) return;
      const dx = p.x - sx;
      const dy = p.y - sy;
      // Horizontal drag moves per cell.
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= CELL) {
        const steps = Math.trunc(dx / CELL);
        for (let i = 0; i < Math.abs(steps); i++) this.move(Math.sign(steps));
        sx += steps * CELL;
      } else if (dy > CELL * 0.6) {
        // Slow drag down = soft drop, cell by cell.
        if (p.y - lastSoftY >= CELL) {
          this.softStep();
          lastSoftY = p.y;
        }
      }
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.attract) return;
      const dx = p.x - sx;
      const dy = p.y - sy;
      const dt = this.time.now - st;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (dt < 220 && adx < 14 && ady < 14) {
        this.rotate('cw'); // tap
      } else if (ady > 50 && ady > adx && dy < 0 && dt < 300) {
        this.hold(); // swipe up
      } else if (ady > 60 && ady > adx && dy > 0 && dt < 250) {
        this.hardDrop(); // quick swipe down
      }
    });
  }

  private handleKeys(delta: number): void {
    if (this.attract || !this.keys) return;
    const k = this.keys;
    const left = k.LEFT!.isDown;
    const right = k.RIGHT!.isDown;

    if (left !== right) {
      const dir = left ? -1 : 1;
      if (dir !== this.moveDir) {
        this.moveDir = dir;
        this.dasAcc = 0;
        this.dasCharged = false;
        this.move(dir);
      } else {
        this.dasAcc += delta;
        if (!this.dasCharged) {
          if (this.dasAcc >= DAS) {
            this.dasCharged = true;
            this.dasAcc = 0;
            this.move(dir);
          }
        } else {
          this.dasAcc += 0;
          while (this.dasAcc >= ARR) {
            this.move(dir);
            this.dasAcc -= ARR;
          }
        }
      }
    } else {
      this.moveDir = 0;
      this.dasCharged = false;
    }

    if (Phaser.Input.Keyboard.JustDown(k.UP!) || Phaser.Input.Keyboard.JustDown(k.X!))
      this.rotate('cw');
    if (Phaser.Input.Keyboard.JustDown(k.Z!)) this.rotate('ccw');
    if (Phaser.Input.Keyboard.JustDown(k.SPACE!)) this.hardDrop();
    if (Phaser.Input.Keyboard.JustDown(k.C!)) this.hold();
    if (Phaser.Input.Keyboard.JustDown(k.E!)) this.useShockwave();
    this.softHeld = k.DOWN!.isDown;
  }

  // ---- Piece actions -------------------------------------------------------

  private spawn(type?: PieceType): void {
    const t = type ?? this.bag.next();
    const matrix = SPAWN[t];
    const x = Math.floor((WIDTH - matrix.length) / 2) + (t === 'I' ? 0 : 0);
    const y = 0;
    this.active = { type: t, matrix, state: 0, x, y };
    this.grounded = false;
    this.lockAcc = 0;
    this.lockResets = 0;
    this.gravAcc = 0;
    this.aiPlan = null;

    if (this.board.collides(matrix, x, y)) {
      this.topOut();
    }
  }

  private move(dx: number): boolean {
    if (!this.board.collides(this.active.matrix, this.active.x + dx, this.active.y)) {
      this.active.x += dx;
      this.playMove();
      this.onPieceMoved();
      return true;
    }
    return false;
  }

  private rotate(dir: 'cw' | 'ccw'): void {
    const res = tryRotate(this.active, dir, (m, x, y) => this.board.collides(m, x, y));
    if (res) {
      this.active = res.next;
      this.play(SFX.rotate);
      this.onPieceMoved();
    }
  }

  private onPieceMoved(): void {
    // Lock-delay reset on successful move/rotate while grounded (capped).
    if (this.grounded && this.lockResets < MAX_LOCK_RESETS) {
      this.lockAcc = 0;
      this.lockResets++;
    }
  }

  private softStep(): void {
    if (!this.board.collides(this.active.matrix, this.active.x, this.active.y + 1)) {
      this.active.y += 1;
      this.score += softDropPoints(1);
    }
  }

  private hardDrop(): void {
    const d = this.board.dropDistance(this.active.matrix, this.active.x, this.active.y);
    this.active.y += d;
    this.score += hardDropPoints(d);
    if (d > 0 && !this.reduced) this.shakeAmt = Math.min(6, this.shakeAmt + 3);
    this.lockPiece();
  }

  private hold(): void {
    if (!this.canHold) return;
    this.play(SFX.hold);
    const current = this.active.type;
    if (this.holdType == null) {
      this.holdType = current;
      this.spawn();
    } else {
      const swap = this.holdType;
      this.holdType = current;
      this.spawn(swap);
    }
    this.canHold = false;
  }

  private useShockwave(): void {
    if (this.charge < CHARGE_MAX || this.over) return;
    this.board.shockwave(2);
    this.charge = 0;
    this.play(SFX.shockwave);
    if (!this.reduced) {
      this.shakeAmt = 10;
      this.levelFlash = 0.35;
      for (let gx = 0; gx < WIDTH; gx++) {
        for (let r = 0; r < 2; r++) {
          const sy = WELL_Y + (VISIBLE_ROWS - 1 - r) * CELL + CELL / 2;
          this.spawnParticles(WELL_X + gx * CELL + CELL / 2, sy, 0x4df0d0, 4);
        }
      }
    }
  }

  private lockPiece(): void {
    this.board.lock(this.active.matrix, this.active.x, this.active.y, PIECE_COLORS[this.active.type]);
    this.play(SFX.lock);
    this.canHold = true;

    const full = this.board.fullRows();
    if (full.length > 0) {
      this.resolveLines(full);
    } else {
      this.combo = -1;
      this.spawn();
    }
  }

  private resolveLines(rows: number[]): void {
    const n = rows.length;
    const res = resolveClear({ lines: n, level: this.level, b2b: this.b2b, combo: this.combo });
    this.score += res.points;
    this.b2b = res.b2b;
    this.combo = res.combo;

    const prevLevel = this.level;
    this.lines += n;
    this.level = levelForLines(this.lines);
    this.charge = Math.min(CHARGE_MAX, this.charge + n);

    this.play(clearSound(n));

    // Combo popup + rising pitch.
    if (this.combo > 0) {
      this.comboText.setText(`COMBO x${this.combo}`);
      this.comboTimer = 0.9;
      const p = [...SFX.combo];
      p[2] = 440 + this.combo * 70;
      this.play(p);
    }

    if (!this.reduced) {
      this.shakeAmt = Math.min(14, this.shakeAmt + (n >= 4 ? 12 : 3 + n * 2));
      for (const r of rows) {
        for (let gx = 0; gx < WIDTH; gx++) {
          this.spawnParticles(
            WELL_X + gx * CELL + CELL / 2,
            WELL_Y + (r - VISIBLE_TOP) * CELL + CELL / 2,
            Phaser.Display.Color.HexStringToColor(PIECE_COLORS.I).color,
            3,
            gx * 4, // left-to-right delay feel via initial x velocity bias
          );
        }
      }
    }

    if (n >= 4) {
      this.stampTimer = 0.8;
      this.levelFlash = Math.max(this.levelFlash, 0.4);
    }
    if (this.level > prevLevel) {
      this.play(SFX.levelUp);
      this.levelFlash = Math.max(this.levelFlash, 0.5);
    }

    // Freeze briefly (hit-stop) and flash the rows before removing them.
    this.freeze = this.reduced ? 0 : (n >= 4 ? 0.12 : 0.06);
    this.clearingRows = rows;
    this.clearTimer = this.reduced ? 1 : CLEAR_MS;
    this.pendingSpawn = true;
  }

  private topOut(): void {
    if (this.attract) {
      this.reset();
      return;
    }
    if (this.over) return;
    this.over = true;
    this.play(SFX.gameOver);
    this.onGameOver?.(this.score, { lines: this.lines, level: this.level });
  }

  // ---- Loop ----------------------------------------------------------------

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    // timers that always run
    this.bulbT += dt;
    if (this.comboTimer > 0) this.comboTimer -= dt;
    if (this.stampTimer > 0) this.stampTimer -= dt;
    if (this.levelFlash > 0) this.levelFlash = Math.max(0, this.levelFlash - dt);
    this.updateParticles(dt);

    if (this.over) {
      this.render();
      return;
    }

    // Clearing phase (rows flashing / hit-stop).
    if (this.clearTimer > 0) {
      this.clearTimer -= delta;
      if (this.clearTimer <= 0 && this.pendingSpawn) {
        this.board.removeRows(this.clearingRows);
        this.clearingRows = [];
        this.pendingSpawn = false;
        this.spawn();
      }
      this.render();
      return;
    }

    if (this.freeze > 0) {
      this.freeze -= dt;
      this.render();
      return;
    }

    // Attract AI or player input.
    if (this.attract) this.runAI(delta);
    else this.handleKeys(delta);

    // Gravity.
    const g = this.softHeld && !this.attract ? Math.min(gravityMs(this.level), 40) : gravityMs(this.level);
    this.gravAcc += delta;
    while (this.gravAcc >= g) {
      this.gravAcc -= g;
      this.step();
    }

    // Lock delay when grounded.
    if (this.grounded) {
      this.lockAcc += delta;
      if (this.lockAcc >= LOCK_DELAY) this.lockPiece();
    }

    // Danger read.
    const danger = this.board.highestFilledRow() <= VISIBLE_TOP + 4;
    this.dangerPulse = danger ? this.dangerPulse + dt : 0;

    this.render();
  }

  private step(): void {
    if (!this.board.collides(this.active.matrix, this.active.x, this.active.y + 1)) {
      this.active.y += 1;
      if (this.softHeld && !this.attract) this.score += softDropPoints(1);
      this.grounded = false;
      this.lockAcc = 0;
    } else {
      this.grounded = true;
    }
  }

  private runAI(delta: number): void {
    if (!this.aiPlan) {
      const p = bestPlacement(this.board, this.active.type);
      this.aiPlan = p ? { state: p.state, x: p.x } : null;
      if (!this.aiPlan) {
        this.hardDrop();
        return;
      }
    }
    this.aiAcc += delta;
    if (this.aiAcc < 90) return;
    this.aiAcc = 0;

    const plan = this.aiPlan;
    if (this.active.state !== plan.state) {
      this.rotate('cw');
    } else if (this.active.x !== plan.x) {
      this.move(Math.sign(plan.x - this.active.x));
    } else {
      this.hardDrop();
    }
  }

  // ---- FX helpers ----------------------------------------------------------

  private spawnParticles(x: number, y: number, color: number, count: number, vxBias = 0): void {
    if (this.reduced) return;
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 260) break;
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 180 + vxBias,
        vy: -Math.random() * 180 - 40,
        life: 0.5 + Math.random() * 0.4,
        max: 0.9,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += 520 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private playMove(): void {
    this.play(SFX.move);
  }

  private play(preset: number[]): void {
    this.ctx?.audio.play(preset);
  }

  // ---- Render --------------------------------------------------------------

  private render(): void {
    const g = this.g;
    g.clear();

    // camera shake offset
    let ox = 0;
    let oy = 0;
    if (this.shakeAmt > 0.1) {
      ox = (Math.random() - 0.5) * this.shakeAmt;
      oy = (Math.random() - 0.5) * this.shakeAmt;
      this.shakeAmt *= 0.86;
    } else {
      this.shakeAmt = 0;
    }

    // Well frame + grid
    g.fillStyle(0x06040d, 1);
    g.fillRect(WELL_X - 4 + ox, WELL_Y - 4 + oy, WELL_W + 8, WELL_H + 8);
    g.lineStyle(2, Phaser.Display.Color.HexStringToColor(C.phosphor).color, 0.5);
    g.strokeRect(WELL_X - 4 + ox, WELL_Y - 4 + oy, WELL_W + 8, WELL_H + 8);

    g.lineStyle(1, C.grid, 0.6);
    for (let c = 0; c <= WIDTH; c++)
      g.lineBetween(WELL_X + c * CELL + ox, WELL_Y + oy, WELL_X + c * CELL + ox, WELL_Y + WELL_H + oy);
    for (let r = 0; r <= VISIBLE_ROWS; r++)
      g.lineBetween(WELL_X + ox, WELL_Y + r * CELL + oy, WELL_X + WELL_W + ox, WELL_Y + r * CELL + oy);

    // Locked cells
    for (let r = VISIBLE_TOP; r < HEIGHT; r++) {
      for (let c = 0; c < WIDTH; c++) {
        const cell = this.board.grid[r]![c];
        if (cell !== 0) {
          const flashing = this.clearingRows.includes(r);
          this.drawCell(
            g,
            WELL_X + c * CELL + ox,
            WELL_Y + (r - VISIBLE_TOP) * CELL + oy,
            flashing ? '#ffffff' : (cell as string),
            1,
          );
        }
      }
    }

    if (!this.over && this.clearTimer <= 0) {
      // Ghost
      const d = this.board.dropDistance(this.active.matrix, this.active.x, this.active.y);
      for (const [c, r] of minos(this.active.matrix)) {
        const gy = this.active.y + d + r;
        if (gy >= VISIBLE_TOP)
          this.drawGhost(g, WELL_X + (this.active.x + c) * CELL + ox, WELL_Y + (gy - VISIBLE_TOP) * CELL + oy);
      }
      // Active piece
      for (const [c, r] of minos(this.active.matrix)) {
        const gy = this.active.y + r;
        if (gy >= VISIBLE_TOP)
          this.drawCell(
            g,
            WELL_X + (this.active.x + c) * CELL + ox,
            WELL_Y + (gy - VISIBLE_TOP) * CELL + oy,
            PIECE_COLORS[this.active.type],
            1,
          );
      }
    }

    this.drawHud(g, ox, oy);
    this.drawParticles();
    this.drawOverlays();

    // Update text
    this.tScore.setText(this.score.toLocaleString('en-US'));
    this.tLevel.setText(`LVL ${this.level}`);
    this.tLines.setText(`LINES ${this.lines}`);
    this.tScore.x = WELL_X + WELL_W / 2 + ox;

    // Lightweight telemetry for smoke tests / debugging (real game only).
    if (!this.attract) {
      (window as unknown as { __stackdown?: object }).__stackdown = {
        score: this.score,
        lines: this.lines,
        level: this.level,
        over: this.over,
      };
    }
  }

  private drawCell(g: Phaser.GameObjects.Graphics, x: number, y: number, color: string, alpha: number): void {
    const col = Phaser.Display.Color.HexStringToColor(color).color;
    g.fillStyle(col, alpha);
    g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    // bevel highlight
    g.fillStyle(0xffffff, 0.16 * alpha);
    g.fillRect(x + 1, y + 1, CELL - 2, 3);
    g.fillStyle(0x000000, 0.18 * alpha);
    g.fillRect(x + 1, y + CELL - 4, CELL - 2, 3);
  }

  private drawGhost(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.lineStyle(2, Phaser.Display.Color.HexStringToColor(PIECE_COLORS[this.active.type]).color, 0.35);
    g.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
  }

  private drawMini(g: Phaser.GameObjects.Graphics, type: PieceType, cx: number, cy: number, cell: number): void {
    const m = SPAWN[type];
    const cells = minos(m);
    const cols = m.length;
    const col = Phaser.Display.Color.HexStringToColor(PIECE_COLORS[type]).color;
    g.fillStyle(col, 1);
    const w = cols * cell;
    for (const [c, r] of cells) {
      g.fillRect(cx - w / 2 + c * cell + 1, cy - w / 2 + r * cell + 1, cell - 2, cell - 2);
    }
  }

  private drawHud(g: Phaser.GameObjects.Graphics, ox: number, oy: number): void {
    // Hold box
    g.lineStyle(1, Phaser.Display.Color.HexStringToColor(C.bezel).color, 1);
    g.fillStyle(0x06040d, 0.6);
    g.fillRect(8, 8, 52, 52);
    g.strokeRect(8, 8, 52, 52);
    if (this.holdType) this.drawMini(g, this.holdType, 34, 34, 9);

    // Next (3)
    const peek = this.bag.peek(3);
    for (let i = 0; i < 3; i++) {
      const bx = 300;
      const by = 8 + i * 30;
      g.fillStyle(0x06040d, 0.5);
      g.fillRect(bx, by, 52, 26);
      if (peek[i]) this.drawMini(g, peek[i]!, bx + 26, by + 13, 6);
    }

    // Charge meter (under the HUD band)
    const cw = WELL_W;
    const cx = WELL_X + ox;
    const cy = WELL_Y - 16 + oy;
    g.fillStyle(0x06040d, 0.8);
    g.fillRect(cx, cy, cw, 8);
    const ratio = this.charge / CHARGE_MAX;
    const full = ratio >= 1;
    g.fillStyle(
      Phaser.Display.Color.HexStringToColor(full ? C.marquee : C.phosphor).color,
      full ? 0.9 + Math.sin(this.bulbT * 8) * 0.1 : 0.8,
    );
    g.fillRect(cx, cy, cw * ratio, 8);

    // Touch buttons
    if (this.touch) {
      this.drawButton(g, this.btnHold, 'HOLD', false);
      this.drawButton(g, this.btnShock, 'SHOCK', this.charge >= CHARGE_MAX);
    }
  }

  private drawButton(g: Phaser.GameObjects.Graphics, rect: Phaser.Geom.Rectangle, _label: string, hot: boolean): void {
    g.fillStyle(Phaser.Display.Color.HexStringToColor(hot ? C.marquee : C.bezel).color, hot ? 0.9 : 0.8);
    g.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 8);
  }

  private drawParticles(): void {
    const g = this.gFx;
    g.clear();
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.max);
      g.fillStyle(p.color, alpha);
      g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }

  private drawOverlays(): void {
    const g = this.gFx;

    // Danger vignette (red pulse)
    if (this.dangerPulse > 0 && !this.reduced) {
      const a = 0.12 + Math.abs(Math.sin(this.dangerPulse * 6)) * 0.14;
      g.lineStyle(10, Phaser.Display.Color.HexStringToColor(C.joystick).color, a);
      g.strokeRect(5, 5, LOGICAL_W - 10, LOGICAL_H - 10);
    }
    // Level / shockwave flash
    if (this.levelFlash > 0) {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(C.phosphor).color, this.levelFlash * 0.4);
      g.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    }

    // Combo + stamp text alpha
    this.comboText.setAlpha(Math.max(0, Math.min(1, this.comboTimer / 0.9)));
    this.comboText.setScale(1 + (1 - Math.min(1, this.comboTimer / 0.9)) * 0.3);
    this.stamp.setAlpha(Math.max(0, Math.min(1, this.stampTimer / 0.8)));
    this.stamp.setScale(1 + (1 - Math.min(1, this.stampTimer / 0.8)) * 0.5);
  }

  // Public control used by the module wrapper for a clean restart in attract.
  restartGame(): void {
    this.reset();
  }
}
