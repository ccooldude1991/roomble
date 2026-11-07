/*
 * Rooftop Rush — Phaser 3 scene.
 *
 * A one-button auto-runner. Built on Phaser 3 for the scene/loop/input/render,
 * with a deterministic fixed-step vertical integrator (rather than Arcade
 * Physics bodies) so world scrolling and the close-call slow-mo stay exact and
 * frame-rate independent. Terrain comes from the tested chunk stitcher; the
 * reach maths guarantees every gap is clearable.
 *
 * Reuses shared utilities: ctx.audio (incl. playPitched), ctx.save, and the
 * juice SlowMo + easings.
 */
import Phaser from 'phaser';
import type { GameContext, SaveService } from '../types';
import { SlowMo } from '../../juice';
import {
  LOGICAL_W,
  LOGICAL_H,
  TILE,
  GROUND_Y,
  RUNNER_X,
  RUNNER_W,
  RUNNER_H,
  RUNNER_SLIDE_H,
  GRAVITY,
  JUMP_V,
  DOUBLE_JUMP_V,
  MIN_JUMP_V,
  SLIDE_MS,
  COYOTE_MS,
  JUMP_BUFFER_MS,
  GLIDE_GRAVITY,
  SPEED_START,
  SPEED_MAX,
  SPEED_ACCEL,
  tierForSpeed,
} from './config';
import { pickChunk, breather, type Column } from './chunks';
import { computeScore, metresFromPx, nearMissBonus } from './scoring';
import { getEquipped, addCoins, COSMETICS } from './cosmetics';
import { decideAction, type TerrainView } from './ai';
import { SFX } from './sfx';

const RUNWAY_COLS = 10; // forgiving flat start
const LOW_H = 34;
const SIGN_BOTTOM = GROUND_Y - 26;
const NEARMISS = 16;
const PKG_Y = GROUND_Y - 72;
const PKG_R = 11;

type PowerKind = 'magnet' | 'glide' | 'shield';

interface Obstacle {
  worldX: number;
  kind: 'low' | 'high';
  passed: boolean;
  minClear: number;
  crashed: boolean;
}
interface Pickup {
  worldX: number;
  y: number;
  taken: boolean;
}
interface Power {
  worldX: number;
  y: number;
  kind: PowerKind;
  taken: boolean;
}

interface SceneData {
  ctx?: GameContext;
  attract: boolean;
  onGameOver?: (score: number, stats: Record<string, number>) => void;
}

const C = {
  sky: 0x140a24,
  far: 0x241544,
  mid: 0x33204f,
  near: 0x1e1033,
  roof: 0x3a2560,
  roofEdge: 0x4df0d0,
  window: 0xffc21a,
  ticket: '#fff4dc',
  phosphor: '#4df0d0',
  joystick: '#ff3d6e',
  marquee: '#ffc21a',
};

export class RooftopScene extends Phaser.Scene {
  private ctx?: GameContext;
  private attract = false;
  private reduced = false;
  private onGameOver?: (score: number, stats: Record<string, number>) => void;
  private save?: SaveService;

  // run state
  private speed = SPEED_START;
  private scrollX = 0;
  private packages = 0;
  private nearMissTotal = 0;
  private multiplier = 1;
  private score = 0;
  private over = false;
  private rngState = 1;

  // runner vertical
  private ry = GROUND_Y - RUNNER_H;
  private vy = 0;
  private height = RUNNER_H;
  private grounded = true;
  private airJumpUsed = false;
  private coyote = 0;
  private jumpBuffer = 0;
  private sliding = false;
  private slideTimer = 0;
  private runFrame = 0;

  // crash tumble
  private tumble = 0;

  // power-ups
  private glide = 0;
  private magnet = 0;
  private shield = false;

  // terrain + entities
  private ground = new Map<number, boolean>();
  private generatedCol = 0;
  private obstacles: Obstacle[] = [];
  private pickups: Pickup[] = [];
  private powers: Power[] = [];

  // fx
  private slowmo!: SlowMo;
  private shake = 0;
  private zoom = 1;
  private dust: Array<{ x: number; y: number; vx: number; vy: number; life: number }> = [];
  private trail: Array<{ x: number; y: number; life: number }> = [];
  private trailColor = '#4df0d0';
  private hintTimer = 0;

  // graphics
  private g!: Phaser.GameObjects.Graphics;
  private gBg!: Phaser.GameObjects.Graphics;
  private tScore!: Phaser.GameObjects.Text;
  private tMult!: Phaser.GameObjects.Text;
  private tHint!: Phaser.GameObjects.Text;

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('rooftop-rush');
  }

  init(data: SceneData): void {
    this.ctx = data.ctx;
    this.attract = data.attract;
    this.onGameOver = data.onGameOver;
    this.reduced = data.ctx?.reducedMotion ?? false;
    this.save = data.ctx?.save;
  }

  create(): void {
    this.gBg = this.add.graphics();
    this.g = this.add.graphics();
    this.slowmo = new SlowMo({ reducedMotion: this.reduced });

    this.tScore = this.add
      .text(LOGICAL_W / 2, 14, '', { fontFamily: "'VT323'", fontSize: '30px', color: C.phosphor })
      .setOrigin(0.5, 0);
    this.tMult = this.add
      .text(LOGICAL_W - 14, 14, '', { fontFamily: "'VT323'", fontSize: '24px', color: C.marquee })
      .setOrigin(1, 0);
    this.tHint = this.add
      .text(LOGICAL_W / 2, 56, 'Rotate for a bigger view', {
        fontFamily: "'Chakra Petch'",
        fontSize: '16px',
        color: C.ticket,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const equipped = this.attract || !this.save ? COSMETICS[0]! : getEquipped(this.save);
    this.trailColor = equipped.color;

    this.setupInput();
    this.reset();
  }

  private rng = (): number => {
    // Small deterministic LCG so attract/runs are reproducible per instance.
    this.rngState = (this.rngState * 1664525 + 1013904223) >>> 0;
    return this.rngState / 0xffffffff;
  };

  private reset(): void {
    this.speed = SPEED_START;
    this.scrollX = 0;
    this.packages = 0;
    this.nearMissTotal = 0;
    this.multiplier = 1;
    this.score = 0;
    this.over = false;
    this.ry = GROUND_Y - RUNNER_H;
    this.vy = 0;
    this.height = RUNNER_H;
    this.grounded = true;
    this.airJumpUsed = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.sliding = false;
    this.slideTimer = 0;
    this.tumble = 0;
    this.glide = 0;
    this.magnet = 0;
    this.shield = false;
    this.rngState = (Date.now() & 0xffffffff) >>> 0;
    this.ground.clear();
    this.generatedCol = 0;
    this.obstacles = [];
    this.pickups = [];
    this.powers = [];
    this.dust = [];
    this.trail = [];
    this.hintTimer = this.attract ? 0 : 3;
    this.ensureGenerated(Math.ceil((LOGICAL_W * 2) / TILE));
  }

  // ---- Terrain generation --------------------------------------------------

  private ensureGenerated(uptoCol: number): void {
    while (this.generatedCol < uptoCol) {
      if (this.generatedCol < RUNWAY_COLS) {
        this.setColumn(this.generatedCol, { ground: true });
        this.generatedCol++;
        continue;
      }
      const tier = tierForSpeed(this.speed);
      const chunk = pickChunk(tier, this.rng);
      for (const col of chunk.cols) {
        this.setColumn(this.generatedCol, col);
        this.generatedCol++;
      }
      for (const col of breather(3)) {
        this.setColumn(this.generatedCol, col);
        this.generatedCol++;
      }
    }
  }

  private setColumn(i: number, col: Column): void {
    this.ground.set(i, col.ground);
    const worldX = i * TILE;
    if (col.obstacle)
      this.obstacles.push({ worldX, kind: col.obstacle, passed: false, minClear: Infinity, crashed: false });
    if (col.pkg) this.pickups.push({ worldX: worldX + TILE / 2, y: PKG_Y, taken: false });
    if (col.powerup) {
      const kinds: PowerKind[] = ['magnet', 'glide', 'shield'];
      this.powers.push({
        worldX: worldX + TILE / 2,
        y: PKG_Y,
        kind: kinds[Math.floor(this.rng() * kinds.length)]!,
        taken: false,
      });
    }
  }

  private groundAt(worldX: number): boolean {
    const col = Math.floor(worldX / TILE);
    if (col < 0) return true;
    this.ensureGenerated(col + 1);
    return this.ground.get(col) ?? true;
  }

  // ---- Input ---------------------------------------------------------------

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('SPACE,UP,W,DOWN,S') as Record<string, Phaser.Input.Keyboard.Key>;
      kb.addCapture('SPACE,UP,DOWN');
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.attract || this.over) return;
      if (p.x < LOGICAL_W / 2) this.startSlide();
      else this.requestJump();
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.x >= LOGICAL_W / 2) this.cutJump();
    });
  }

  private handleKeys(): void {
    if (!this.keys) return;
    const jumpDown =
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE!) ||
      Phaser.Input.Keyboard.JustDown(this.keys.UP!) ||
      Phaser.Input.Keyboard.JustDown(this.keys.W!);
    if (jumpDown) this.requestJump();
    const jumpUp =
      Phaser.Input.Keyboard.JustUp(this.keys.SPACE!) ||
      Phaser.Input.Keyboard.JustUp(this.keys.UP!) ||
      Phaser.Input.Keyboard.JustUp(this.keys.W!);
    if (jumpUp) this.cutJump();
    if (Phaser.Input.Keyboard.JustDown(this.keys.DOWN!) || Phaser.Input.Keyboard.JustDown(this.keys.S!))
      this.startSlide();
  }

  private requestJump(): void {
    this.jumpBuffer = JUMP_BUFFER_MS / 1000;
  }
  private cutJump(): void {
    if (this.vy < -MIN_JUMP_V) this.vy = -MIN_JUMP_V;
  }

  private doJump(): void {
    if (this.grounded || this.coyote > 0) {
      this.vy = -JUMP_V;
      this.grounded = false;
      this.coyote = 0;
      this.airJumpUsed = false;
      this.sliding = false;
      this.height = RUNNER_H;
      this.ctx?.audio.play(SFX.jump);
    } else if (!this.airJumpUsed) {
      this.vy = -DOUBLE_JUMP_V;
      this.airJumpUsed = true;
      this.ctx?.audio.play(SFX.double);
    }
  }

  private startSlide(): void {
    if (!this.grounded) return;
    this.sliding = true;
    this.slideTimer = SLIDE_MS / 1000;
    this.height = RUNNER_SLIDE_H;
    this.ctx?.audio.play(SFX.slide);
  }

  // ---- Loop ----------------------------------------------------------------

  update(_time: number, delta: number): void {
    const dt0 = Math.min(0.05, delta / 1000);

    if (this.over) {
      this.tumble += dt0;
      this.vy += GRAVITY * dt0;
      this.ry += this.vy * dt0;
      this.updateFx(dt0);
      this.render();
      return;
    }

    const ts = this.slowmo.timeScale(dt0);
    const dt = dt0 * ts;

    this.speed = Math.min(SPEED_MAX, this.speed + SPEED_ACCEL * dt0);
    this.scrollX += this.speed * dt;
    this.ensureGenerated(Math.ceil((this.scrollX + LOGICAL_W * 2) / TILE));

    if (this.attract) this.runBot();
    else this.handleKeys();

    // Timers
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt0;
    if (this.coyote > 0) this.coyote -= dt0;
    if (this.glide > 0) this.glide -= dt0;
    if (this.magnet > 0) this.magnet -= dt0;
    if (this.sliding) {
      this.slideTimer -= dt0;
      if (this.slideTimer <= 0) {
        this.sliding = false;
        this.height = RUNNER_H;
      }
    }

    // Buffered jump — ground/coyote jump, or a mid-air double jump.
    if (this.jumpBuffer > 0 && (this.grounded || this.coyote > 0 || !this.airJumpUsed)) {
      this.jumpBuffer = 0;
      this.doJump();
    }

    // Vertical integration
    const g = this.glide > 0 && this.vy > 0 ? GLIDE_GRAVITY : GRAVITY;
    this.vy += g * dt;
    this.ry += this.vy * dt;

    // Ground / landing
    const runnerWorldX = this.scrollX + RUNNER_X + RUNNER_W / 2;
    const groundHere = this.groundAt(runnerWorldX);
    const feet = this.ry + this.height;
    if (groundHere && this.vy >= 0 && feet >= GROUND_Y) {
      this.ry = GROUND_Y - this.height;
      this.vy = 0;
      if (!this.grounded) this.onLand();
      this.grounded = true;
      this.coyote = COYOTE_MS / 1000;
    } else {
      if (this.grounded) this.coyote = COYOTE_MS / 1000; // just left ground
      this.grounded = false;
    }

    // Fall into a gap
    if (this.ry > LOGICAL_H + 40) {
      this.crash('fell');
      return;
    }

    this.runFrame += this.speed * dt * 0.05;

    this.collisions();
    this.updatePickups(dt);
    this.score = computeScore({
      distancePx: this.scrollX,
      packages: this.packages,
      nearMissTotal: this.nearMissTotal,
    });

    // Camera zoom-out as speed rises
    const targetZoom = this.reduced ? 1 : 1 - ((this.speed - SPEED_START) / (SPEED_MAX - SPEED_START)) * 0.1;
    this.zoom += (targetZoom - this.zoom) * Math.min(1, dt0 * 3);

    this.trimBehind();
    this.updateFx(dt0);
    if (this.hintTimer > 0) this.hintTimer -= dt0;
    this.render();
  }

  private onLand(): void {
    this.airJumpUsed = false;
    this.ctx?.audio.play(SFX.land);
    if (!this.reduced) {
      for (let i = 0; i < 6; i++)
        this.dust.push({
          x: RUNNER_X,
          y: GROUND_Y,
          vx: -40 - Math.random() * 60,
          vy: -Math.random() * 60,
          life: 0.4,
        });
    }
  }

  private runBot(): void {
    const view = this.terrainView();
    const action = decideAction(view);
    if (action === 'jump') this.requestJump();
    else if (action === 'slide') this.startSlide();
  }

  private terrainView(): TerrainView {
    const lookPx = Math.max(120, this.speed * 0.55);
    const frontX = this.scrollX + RUNNER_X + RUNNER_W;
    let gapAhead = false;
    for (let x = frontX; x < frontX + lookPx; x += TILE / 2) {
      if (!this.groundAt(x)) {
        gapAhead = true;
        break;
      }
    }
    let lowAhead = false;
    let highAhead = false;
    for (const o of this.obstacles) {
      const sx = o.worldX - this.scrollX;
      if (sx > RUNNER_X && sx < RUNNER_X + lookPx) {
        if (o.kind === 'low') lowAhead = true;
        else highAhead = true;
      }
    }
    return {
      gapAhead,
      lowAhead,
      highAhead,
      grounded: this.grounded,
      overGap: !this.groundAt(this.scrollX + RUNNER_X + RUNNER_W / 2),
    };
  }

  // ---- Collisions + pickups ------------------------------------------------

  private runnerRect(): { l: number; r: number; t: number; b: number } {
    return { l: RUNNER_X, r: RUNNER_X + RUNNER_W, t: this.ry, b: this.ry + this.height };
  }

  private collisions(): void {
    const rr = this.runnerRect();
    for (const o of this.obstacles) {
      const sx = o.worldX - this.scrollX;
      const ol = sx;
      const or = sx + TILE;
      const overlapX = or > rr.l && ol < rr.r;
      if (overlapX && !o.crashed) {
        if (o.kind === 'low') {
          const top = GROUND_Y - LOW_H;
          const clear = top - rr.b; // >0 cleared above
          if (clear < 0) {
            if (!this.consumeShield()) return this.crash('hit');
            o.crashed = true;
          } else o.minClear = Math.min(o.minClear, clear);
        } else {
          const clear = rr.t - SIGN_BOTTOM; // >0 passed under
          if (clear < 0) {
            if (!this.consumeShield()) return this.crash('hit');
            o.crashed = true;
          } else o.minClear = Math.min(o.minClear, clear);
        }
      }
      if (!o.passed && or < rr.l) {
        o.passed = true;
        if (!o.crashed && o.minClear < NEARMISS && o.minClear >= 0) this.closeCall();
      }
    }
  }

  private closeCall(): void {
    this.multiplier = Math.min(9, this.multiplier + 1);
    this.nearMissTotal += nearMissBonus(this.multiplier);
    this.slowmo.request(0.4, 0.15);
    this.ctx?.audio.playPitched(SFX.closeCall, 480 + this.multiplier * 80);
  }

  private consumeShield(): boolean {
    if (!this.shield) return false;
    this.shield = false;
    this.multiplier = 1; // a hit resets the close-call chain
    this.shake = Math.max(this.shake, 6);
    return true;
  }

  private updatePickups(dt: number): void {
    const rr = this.runnerRect();
    const rcx = (rr.l + rr.r) / 2;
    const rcy = (rr.t + rr.b) / 2;
    for (const p of this.pickups) {
      if (p.taken) continue;
      let px = p.worldX - this.scrollX;
      // Magnet pull
      if (this.magnet > 0) {
        const dx = RUNNER_X - px;
        const dy = rcy - p.y;
        if (Math.hypot(dx, dy) < 140) {
          px += dx * Math.min(1, dt * 8);
          p.y += dy * Math.min(1, dt * 8);
          p.worldX = px + this.scrollX;
        }
      }
      if (Math.abs(px - rcx) < PKG_R + RUNNER_W / 2 && Math.abs(p.y - rcy) < PKG_R + this.height / 2) {
        p.taken = true;
        this.packages++;
        this.ctx?.audio.play(SFX.package);
      }
    }
    for (const pw of this.powers) {
      if (pw.taken) continue;
      const px = pw.worldX - this.scrollX;
      if (Math.abs(px - rcx) < 16 + RUNNER_W / 2 && Math.abs(pw.y - rcy) < 16 + this.height / 2) {
        pw.taken = true;
        this.activatePower(pw.kind);
      }
    }
  }

  private activatePower(kind: PowerKind): void {
    this.ctx?.audio.play(SFX.powerup);
    if (kind === 'glide') this.glide = 6;
    else if (kind === 'magnet') this.magnet = 6;
    else this.shield = true;
  }

  private crash(_why: string): void {
    if (this.attract) {
      this.reset();
      return;
    }
    if (this.over) return;
    this.over = true;
    this.vy = -260;
    this.tumble = 0;
    this.shake = this.reduced ? 0 : 14;
    this.ctx?.audio.play(SFX.crash);
    if (this.save) addCoins(this.save, this.packages);
    this.onGameOver?.(this.score, {
      metres: metresFromPx(this.scrollX),
      packages: this.packages,
    });
  }

  private trimBehind(): void {
    const minX = this.scrollX - TILE * 2;
    this.obstacles = this.obstacles.filter((o) => o.worldX + TILE > minX);
    this.pickups = this.pickups.filter((p) => p.worldX > minX && !p.taken);
    this.powers = this.powers.filter((p) => p.worldX > minX && !p.taken);
    const minCol = Math.floor(minX / TILE) - 2;
    for (const k of this.ground.keys()) if (k < minCol) this.ground.delete(k);
  }

  private updateFx(dt: number): void {
    for (const d of this.dust) {
      d.life -= dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 120 * dt;
    }
    this.dust = this.dust.filter((d) => d.life > 0);

    if (!this.reduced && !this.over) {
      this.trail.push({ x: RUNNER_X + RUNNER_W / 2, y: this.ry + this.height / 2, life: 0.35 });
    }
    for (const t of this.trail) t.life -= dt;
    this.trail = this.trail.filter((t) => t.life > 0);

    if (this.shake > 0.1) this.shake *= 0.86;
    else this.shake = 0;

    // Multiplier decays slowly if not reinforced (keeps close-call chains tense).
    // (kept as-is; reset happens on hit.)
  }

  // ---- Render --------------------------------------------------------------

  private render(): void {
    this.drawParallax();

    const g = this.g;
    g.clear();
    const ox = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const oy = this.shake ? (Math.random() - 0.5) * this.shake : 0;

    // Terrain (foreground rooftops)
    const startCol = Math.floor(this.scrollX / TILE) - 1;
    const endCol = startCol + Math.ceil(LOGICAL_W / TILE) + 3;
    g.fillStyle(C.roof, 1);
    for (let c = startCol; c <= endCol; c++) {
      if (!(this.ground.get(c) ?? true)) continue;
      const sx = c * TILE - this.scrollX + ox;
      g.fillStyle(C.roof, 1);
      g.fillRect(sx, GROUND_Y + oy, TILE + 1, LOGICAL_H - GROUND_Y);
      g.fillStyle(Phaser.Display.Color.HexStringToColor(C.phosphor).color, 0.9);
      g.fillRect(sx, GROUND_Y + oy, TILE + 1, 3);
    }

    // Obstacles
    for (const o of this.obstacles) {
      const sx = o.worldX - this.scrollX + ox;
      if (sx < -TILE || sx > LOGICAL_W) continue;
      if (o.kind === 'low') {
        g.fillStyle(Phaser.Display.Color.HexStringToColor(C.joystick).color, 1);
        g.fillRect(sx + 6, GROUND_Y - LOW_H + oy, TILE - 12, LOW_H);
        g.fillStyle(0xffffff, 0.15);
        g.fillRect(sx + 6, GROUND_Y - LOW_H + oy, TILE - 12, 3);
      } else {
        g.fillStyle(Phaser.Display.Color.HexStringToColor(C.marquee).color, 1);
        g.fillRect(sx + 4, 40 + oy, TILE - 8, SIGN_BOTTOM - 40);
        g.fillStyle(Phaser.Display.Color.HexStringToColor(C.phosphor).color, 0.8);
        g.fillRect(sx + 8, SIGN_BOTTOM - 10 + oy, TILE - 16, 4);
      }
    }

    // Pickups
    g.fillStyle(Phaser.Display.Color.HexStringToColor(C.marquee).color, 1);
    for (const p of this.pickups) {
      if (p.taken) continue;
      const sx = p.worldX - this.scrollX + ox;
      if (sx < -PKG_R || sx > LOGICAL_W) continue;
      g.fillRect(sx - PKG_R, p.y - PKG_R + oy, PKG_R * 2, PKG_R * 2);
      g.fillStyle(0x1e1033, 1);
      g.fillRect(sx - 3, p.y - 3 + oy, 6, 6);
      g.fillStyle(Phaser.Display.Color.HexStringToColor(C.marquee).color, 1);
    }

    // Power-ups
    for (const pw of this.powers) {
      if (pw.taken) continue;
      const sx = pw.worldX - this.scrollX + ox;
      if (sx < -16 || sx > LOGICAL_W) continue;
      const col =
        pw.kind === 'glide' ? C.phosphor : pw.kind === 'magnet' ? C.joystick : C.marquee;
      g.lineStyle(3, Phaser.Display.Color.HexStringToColor(col).color, 1);
      g.strokeCircle(sx, pw.y + oy, 12);
    }

    // Trail
    const trailCol = Phaser.Display.Color.HexStringToColor(this.trailColor).color;
    for (const t of this.trail) {
      g.fillStyle(trailCol, Math.max(0, t.life / 0.35) * 0.5);
      g.fillRect(t.x - 4 + ox, t.y - 4 + oy, 8, 8);
    }

    // Dust
    g.fillStyle(0xffffff, 0.3);
    for (const d of this.dust) g.fillRect(d.x + ox, d.y + oy, 3, 3);

    // Runner
    this.drawRunner(g, ox, oy);

    // Speed lines at high speed
    if (!this.reduced && this.speed > SPEED_MAX * 0.7) {
      g.fillStyle(0xffffff, 0.08);
      for (let i = 0; i < 5; i++) {
        const y = 40 + ((this.runFrame * 40 + i * 70) % (LOGICAL_H - 80));
        g.fillRect(((this.runFrame * 200 + i * 130) % LOGICAL_W), y, 40, 2);
      }
    }

    // Close-call flash
    if (this.slowmo.active) {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(C.phosphor).color, 0.1);
      g.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    }

    // HUD
    this.tScore.setText(`${metresFromPx(this.scrollX)}m`);
    this.tMult.setText(this.multiplier > 1 ? `x${this.multiplier}` : '');

    // First-run touch zone hint
    if (this.hintTimer > 0 && !this.attract) {
      g.fillStyle(0xffffff, 0.05);
      g.fillRect(0, 0, LOGICAL_W / 2, LOGICAL_H);
      g.fillStyle(0xffffff, 0.08);
      g.fillRect(LOGICAL_W / 2, 0, LOGICAL_W / 2, LOGICAL_H);
    }
    // Gentle "rotate for a bigger view" hint on portrait phones, first run only.
    const portraitDevice =
      typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
    this.tHint.setAlpha(this.hintTimer > 0 && !this.attract && portraitDevice ? 0.85 : 0);

    // Telemetry for smoke tests
    if (!this.attract) {
      (window as unknown as { __rooftop?: object }).__rooftop = {
        score: this.score,
        metres: metresFromPx(this.scrollX),
        over: this.over,
      };
    }
  }

  private drawRunner(g: Phaser.GameObjects.Graphics, ox: number, oy: number): void {
    const bodyCol = Phaser.Display.Color.HexStringToColor(this.trailColor).color;
    const x = RUNNER_X + ox;
    const y = this.ry + oy;
    g.fillStyle(bodyCol, 1);
    if (this.over) {
      // tumble
      const a = this.tumble * 12;
      const cx = x + RUNNER_W / 2;
      const cy = y + this.height / 2;
      for (let i = 0; i < 4; i++) {
        const ang = a + (i * Math.PI) / 2;
        g.fillRect(cx + Math.cos(ang) * 8 - 5, cy + Math.sin(ang) * 8 - 5, 10, 10);
      }
      return;
    }
    if (this.sliding) {
      g.fillRect(x, y, RUNNER_W + 6, this.height);
      g.fillStyle(0x1e1033, 1);
      g.fillRect(x + RUNNER_W - 6, y + 3, 5, 5); // eye
      return;
    }
    // body
    g.fillRect(x + 4, y + 10, RUNNER_W - 8, this.height - 18);
    // head
    g.fillRect(x + 5, y, RUNNER_W - 10, 12);
    g.fillStyle(0x1e1033, 1);
    g.fillRect(x + RUNNER_W - 9, y + 3, 4, 4); // eye
    g.fillStyle(bodyCol, 1);
    // legs (run cycle) or tucked (air)
    const legPhase = Math.sin(this.runFrame * 2);
    if (this.grounded) {
      g.fillRect(x + 4, y + this.height - 8, 6, 8 + legPhase * 2);
      g.fillRect(x + RUNNER_W - 10, y + this.height - 8, 6, 8 - legPhase * 2);
    } else {
      g.fillRect(x + 4, y + this.height - 10, 6, 8);
      g.fillRect(x + RUNNER_W - 10, y + this.height - 6, 6, 6);
    }
    // shield aura
    if (this.shield) {
      g.lineStyle(2, Phaser.Display.Color.HexStringToColor(C.phosphor).color, 0.8);
      g.strokeCircle(x + RUNNER_W / 2, y + this.height / 2, this.height * 0.8);
    }
  }

  private drawParallax(): void {
    const g = this.gBg;
    g.clear();
    g.fillStyle(C.sky, 1);
    g.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    // far skyline → near buildings (min height, height range)
    this.drawBuildings(g, 0.15, C.far, 70, 70);
    this.drawBuildings(g, 0.35, C.mid, 110, 70, true);
    this.drawBuildings(g, 0.6, C.near, 150, 80);
  }

  private drawBuildings(
    g: Phaser.GameObjects.Graphics,
    factor: number,
    color: number,
    minH: number,
    rangeH: number,
    windows = false,
  ): void {
    const scroll = this.scrollX * factor;
    const w = 64;
    const off = scroll % w;
    const base = Math.floor(scroll / w);
    for (let i = -1; i * w < LOGICAL_W + w; i++) {
      const idx = base + i;
      const bx = i * w - off;
      const seed = Math.abs(Math.sin(idx * 12.9898) * 43758.5) % 1; // stable per building
      const h = minH + seed * rangeH;
      const top = LOGICAL_H - h;
      g.fillStyle(color, 1);
      g.fillRect(bx, top, w - 6, h);
      if (windows) {
        g.fillStyle(C.window, 0.22);
        for (let wy = top + 8; wy < GROUND_Y - 10; wy += 16) {
          for (let wx = bx + 6; wx < bx + w - 12; wx += 14) {
            if ((idx + wy) % 3 === 0) g.fillRect(wx, wy, 6, 8);
          }
        }
        g.fillStyle(color, 1);
      }
    }
  }
}
