/*
 * Brickquake — Phaser 3 scene.
 *
 * Phaser handles the scene/loop/input/rendering; the ball uses a manual,
 * substepped integrator with custom paddle-angle bounces (per the spec), which
 * guarantees no tunnelling at max speed, a minimum vertical speed, and the
 * where-you-hit-it exit angle. Pure logic (bricks/stages/physics/scoring) is
 * imported and unit-tested.
 */
import Phaser from 'phaser';
import type { GameContext } from '../types';
import {
  LOGICAL_W,
  LOGICAL_H,
  CELL_W,
  CELL_H,
  cellX,
  cellY,
  BALL_R,
  BALL_SPEED,
  BALL_SPEED_STEP,
  BALL_SPEED_MAX,
  MIN_VY,
  PADDLE_Y,
  PADDLE_H,
  PADDLE_W,
  PADDLE_W_WIDE,
  PADDLE_W_NARROW,
  LIVES,
} from './config';
import { hitBrick, crackLevel, brickValue, BRICK_COLORS, type Brick } from './bricks';
import { parseLayout, getStageLayout, isBossStage, bossVariant } from './stages';
import { paddleBounce, enforceMinVy, speedOf, substepCount } from './physics';
import { comboBonus, stageClearBonus } from './scoring';
import { POWERUPS, randomPowerType, type PowerType } from './powerups';
import { predictLandingX } from './ai';
import { SFX, brickFreq } from './sfx';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  stuck: boolean;
  stuckOff: number;
  trail: Array<{ x: number; y: number }>;
}
interface Cap {
  x: number;
  y: number;
  type: PowerType;
}
interface Laser {
  x: number;
  y: number;
}
interface Hazard {
  x: number;
  y: number;
}
interface Boss {
  variant: number;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  w: number;
  h: number;
  dir: number;
  regenT: number;
  hazardT: number;
  hitFlash: number;
}
interface SceneData {
  ctx?: GameContext;
  attract: boolean;
  onGameOver?: (score: number, stats: Record<string, number>) => void;
}

const COL = {
  bg: '#07040e',
  ticket: '#fff4dc',
  dim: '#c9b9a6',
  phosphor: '#4df0d0',
  marquee: '#ffc21a',
  joystick: '#ff3d6e',
};

const WIDE_MS = 12000;
const EFFECT_MS = 10000;
const BOSS_BASE_HP = 24;

export class BrickquakeScene extends Phaser.Scene {
  private ctx?: GameContext;
  private attract = false;
  private reduced = false;
  private onGameOver?: (score: number, stats: Record<string, number>) => void;

  private stageNum = 1;
  private lives = LIVES;
  private score = 0;
  private over = false;

  private bricks: Brick[] = [];
  private grid = new Map<string, Brick>();
  private balls: Ball[] = [];
  private caps: Cap[] = [];
  private lasers: Laser[] = [];
  private hazards: Hazard[] = [];
  private boss: Boss | null = null;

  private paddleX = LOGICAL_W / 2;
  private paddleHits = 0;
  private combo = 0;
  private stageStart = 0;

  // effect timers (ms)
  private wideT = 0;
  private narrowT = 0;
  private laserT = 0;
  private stickyT = 0;
  private fireT = 0;
  private slowT = 0;
  private fastT = 0;
  private laserCd = 0;
  private paddleSquash = 0;
  private shake = 0;
  private freeze = 0;
  private transition = 0;

  private g!: Phaser.GameObjects.Graphics;
  private tScore!: Phaser.GameObjects.Text;
  private tStage!: Phaser.GameObjects.Text;
  private tLives!: Phaser.GameObjects.Text;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('brickquake');
  }

  init(data: SceneData): void {
    this.ctx = data.ctx;
    this.attract = data.attract;
    this.onGameOver = data.onGameOver;
    this.reduced = data.ctx?.reducedMotion ?? false;
  }

  create(): void {
    this.g = this.add.graphics();
    this.tScore = this.add.text(12, 10, '', { fontFamily: "'VT323'", fontSize: '24px', color: COL.phosphor });
    this.tStage = this.add
      .text(LOGICAL_W / 2, 10, '', { fontFamily: "'VT323'", fontSize: '22px', color: COL.marquee })
      .setOrigin(0.5, 0);
    this.tLives = this.add
      .text(LOGICAL_W - 12, 10, '', { fontFamily: "'VT323'", fontSize: '24px', color: COL.joystick })
      .setOrigin(1, 0);

    const kb = this.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('LEFT,RIGHT,A,D,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
      kb.addCapture('LEFT,RIGHT,SPACE');
    }

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.attract) return;
      // Bottom-third drag or anywhere with mouse: move paddle to pointer x.
      this.paddleX = Phaser.Math.Clamp(p.x, this.paddleW() / 2, LOGICAL_W - this.paddleW() / 2);
    });
    this.input.on('pointerdown', () => {
      if (this.attract) return;
      this.launchOrFire();
    });

    this.startStage(1);
  }

  // ---- Stage setup ---------------------------------------------------------

  private startStage(n: number): void {
    this.stageNum = n;
    this.bricks = [];
    this.grid.clear();
    this.caps = [];
    this.lasers = [];
    this.hazards = [];
    this.boss = null;
    this.paddleHits = 0;
    this.combo = 0;
    this.wideT = this.narrowT = this.laserT = this.stickyT = this.fireT = this.slowT = this.fastT = 0;
    this.stageStart = this.time.now;
    this.transition = 0;

    if (isBossStage(n)) {
      const v = bossVariant(n);
      const mult = 1 + Math.floor(n / 20);
      this.boss = {
        variant: v,
        hp: BOSS_BASE_HP * mult + v * 6,
        maxHp: BOSS_BASE_HP * mult + v * 6,
        x: LOGICAL_W / 2,
        y: 150,
        w: 180,
        h: 90,
        dir: 1,
        regenT: 5,
        hazardT: 2,
        hitFlash: 0,
      };
      this.ctx?.audio.play(SFX.bossRoar);
    } else {
      for (const b of parseLayout(getStageLayout(n))) {
        this.bricks.push(b);
        this.grid.set(`${b.row},${b.col}`, b);
      }
    }
    this.resetBall();
  }

  private resetBall(): void {
    this.balls = [
      {
        x: this.paddleX,
        y: PADDLE_Y - BALL_R - 2,
        vx: 0,
        vy: 0,
        stuck: true,
        stuckOff: 0,
        trail: [],
      },
    ];
  }

  private paddleW(): number {
    if (this.wideT > 0) return PADDLE_W_WIDE;
    if (this.narrowT > 0) return PADDLE_W_NARROW;
    return PADDLE_W;
  }

  private ballSpeed(): number {
    const mod = this.slowT > 0 ? 0.6 : this.fastT > 0 ? 1.4 : 1;
    return Math.min(BALL_SPEED_MAX, (BALL_SPEED + this.paddleHits * BALL_SPEED_STEP) * mod);
  }

  private launchOrFire(): void {
    const stuck = this.balls.find((b) => b.stuck);
    if (stuck) {
      const v = paddleBounce(stuck.stuckOff, this.ballSpeed());
      stuck.vx = v.vx;
      stuck.vy = v.vy;
      stuck.stuck = false;
      this.ctx?.audio.play(SFX.paddle);
      return;
    }
    if (this.laserT > 0 && this.laserCd <= 0) {
      this.lasers.push({ x: this.paddleX - this.paddleW() / 2 + 6, y: PADDLE_Y });
      this.lasers.push({ x: this.paddleX + this.paddleW() / 2 - 6, y: PADDLE_Y });
      this.laserCd = 220;
      this.ctx?.audio.play(SFX.laser);
    }
  }

  // ---- Loop ----------------------------------------------------------------

  update(_t: number, delta: number): void {
    const dtMs = Math.min(40, delta);
    const dt = dtMs / 1000;

    if (this.freeze > 0) {
      this.freeze -= dtMs;
      this.render();
      return;
    }

    // timers
    for (const k of ['wideT', 'narrowT', 'laserT', 'stickyT', 'fireT', 'slowT', 'fastT'] as const) {
      if (this[k] > 0) this[k] = Math.max(0, this[k] - dtMs);
    }
    if (this.laserCd > 0) this.laserCd -= dtMs;
    if (this.paddleSquash > 0) this.paddleSquash = Math.max(0, this.paddleSquash - dt);
    if (this.shake > 0.1) this.shake *= 0.86;
    else this.shake = 0;

    if (this.transition > 0) {
      this.transition -= dtMs;
      if (this.transition <= 0) this.startStage(this.stageNum + 1);
      this.render();
      return;
    }

    if (this.over) {
      this.render();
      return;
    }

    if (this.attract) this.runBot(dt);
    else this.handleKeys(dt);

    // keep stuck ball on paddle
    for (const b of this.balls)
      if (b.stuck) {
        b.x = this.paddleX + b.stuckOff * (this.paddleW() / 2);
        b.y = PADDLE_Y - BALL_R - 2;
      }

    this.updateBalls(dt);
    this.updateCaps(dt);
    this.updateLasers(dt);
    if (this.boss) this.updateBoss(dt);
    this.updateHazards(dt);

    // stage clear?
    if (!this.boss && this.bricks.every((b) => !b.alive || b.type === 'steel') && this.transition <= 0) {
      this.clearStage();
    }

    this.score = Math.max(0, Math.round(this.score));
    this.render();
  }

  private handleKeys(dt: number): void {
    if (!this.keys) return;
    const spd = 420 * dt;
    if (this.keys.LEFT!.isDown || this.keys.A!.isDown) this.paddleX -= spd;
    if (this.keys.RIGHT!.isDown || this.keys.D!.isDown) this.paddleX += spd;
    this.paddleX = Phaser.Math.Clamp(this.paddleX, this.paddleW() / 2, LOGICAL_W - this.paddleW() / 2);
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE!)) this.launchOrFire();
  }

  private runBot(dt: number): void {
    const ball = this.balls.find((b) => !b.stuck) ?? this.balls[0];
    if (!ball) return;
    if (ball.stuck) {
      this.launchOrFire();
      return;
    }
    const target = predictLandingX(ball.x, ball.y, ball.vx, ball.vy, PADDLE_Y);
    // lag so it occasionally misses
    this.paddleX += (target - this.paddleX) * Math.min(1, dt * 6);
    this.paddleX = Phaser.Math.Clamp(this.paddleX, this.paddleW() / 2, LOGICAL_W - this.paddleW() / 2);
    if (this.laserT > 0) this.launchOrFire();
  }

  // ---- Ball physics (manual, substepped) -----------------------------------

  private updateBalls(dt: number): void {
    const pw = this.paddleW();
    for (const ball of this.balls) {
      if (ball.stuck) continue;
      const spd = speedOf(ball);
      const steps = substepCount(spd, dt);
      const sdt = dt / steps;
      for (let s = 0; s < steps; s++) {
        ball.x += ball.vx * sdt;
        ball.y += ball.vy * sdt;

        // walls
        if (ball.x < BALL_R) {
          ball.x = BALL_R;
          ball.vx = Math.abs(ball.vx);
        } else if (ball.x > LOGICAL_W - BALL_R) {
          ball.x = LOGICAL_W - BALL_R;
          ball.vx = -Math.abs(ball.vx);
        }
        if (ball.y < BALL_R + 40) {
          ball.y = BALL_R + 40;
          ball.vy = Math.abs(ball.vy);
        }

        // paddle
        if (
          ball.vy > 0 &&
          ball.y + BALL_R >= PADDLE_Y - PADDLE_H / 2 &&
          ball.y < PADDLE_Y + PADDLE_H &&
          ball.x >= this.paddleX - pw / 2 - BALL_R &&
          ball.x <= this.paddleX + pw / 2 + BALL_R
        ) {
          const offset = (ball.x - this.paddleX) / (pw / 2);
          if (this.stickyT > 0) {
            ball.stuck = true;
            ball.stuckOff = Phaser.Math.Clamp(offset, -1, 1);
            ball.vx = ball.vy = 0;
          } else {
            const v = paddleBounce(offset, this.ballSpeed());
            ball.vx = v.vx;
            ball.vy = v.vy;
          }
          ball.y = PADDLE_Y - PADDLE_H / 2 - BALL_R - 1;
          this.paddleHits++;
          this.combo = 0;
          this.paddleSquash = 0.12;
          this.ctx?.audio.play(SFX.paddle);
        }

        // bricks / boss
        if (this.boss) this.ballVsBoss(ball);
        else this.ballVsBricks(ball);

        const v = enforceMinVy({ vx: ball.vx, vy: ball.vy }, MIN_VY);
        ball.vx = v.vx;
        ball.vy = v.vy;
      }

      // trail
      if (!this.reduced) {
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 8) ball.trail.shift();
      }
    }

    // lost balls
    this.balls = this.balls.filter((b) => b.y < LOGICAL_H + 20);
    if (this.balls.length === 0) this.loseLife();
  }

  private ballVsBricks(ball: Ball): void {
    const col = Math.floor((ball.x - cellX(0)) / CELL_W);
    const row = Math.floor((ball.y - cellY(0)) / CELL_H);
    for (let r = row - 1; r <= row + 1; r++)
      for (let c = col - 1; c <= col + 1; c++) {
        const brick = this.grid.get(`${r},${c}`);
        if (!brick || !brick.alive) continue;
        const bx = cellX(c);
        const by = cellY(r);
        if (
          ball.x + BALL_R > bx + 1 &&
          ball.x - BALL_R < bx + CELL_W - 1 &&
          ball.y + BALL_R > by + 1 &&
          ball.y - BALL_R < by + CELL_H - 1
        ) {
          const fire = this.fireT > 0;
          if (!fire) {
            // reflect on the axis of least penetration
            const penX = Math.min(ball.x + BALL_R - bx, bx + CELL_W - (ball.x - BALL_R));
            const penY = Math.min(ball.y + BALL_R - by, by + CELL_H - (ball.y - BALL_R));
            if (penX < penY) ball.vx = -ball.vx;
            else ball.vy = -ball.vy;
          }
          this.damageBrick(brick, fire);
          return;
        }
      }
  }

  private damageBrick(brick: Brick, fire: boolean): void {
    const res = hitBrick(brick, fire);
    if (res.destroyed) {
      this.grid.delete(`${brick.row},${brick.col}`);
      this.combo++;
      this.score += brickValue(brick.type) + comboBonus(this.combo);
      this.breakFx(brick);
      if (brick.type === 'mystery') this.dropCap(brick, randomPowerType());
      else if (Math.random() < 0.12) this.dropCap(brick, randomPowerType());
      if (res.explosive) this.explode(brick.row, brick.col);
    } else {
      this.ctx?.audio.play(SFX.crack);
    }
  }

  private explode(row: number, col: number): void {
    this.ctx?.audio.play(SFX.explode);
    this.shake = Math.min(14, this.shake + 6);
    const queue: Array<[number, number]> = [[row, col]];
    while (queue.length) {
      const [r, c] = queue.shift()!;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nb = this.grid.get(`${r + dr},${c + dc}`);
          if (!nb || !nb.alive || nb.type === 'steel') continue;
          const wasExpl = nb.type === 'explosive';
          nb.alive = false;
          this.grid.delete(`${nb.row},${nb.col}`);
          this.score += brickValue(nb.type);
          this.breakFx(nb);
          if (wasExpl) queue.push([nb.row, nb.col]);
        }
    }
  }

  private ballVsBoss(ball: Ball): void {
    const boss = this.boss!;
    if (
      ball.x + BALL_R > boss.x - boss.w / 2 &&
      ball.x - BALL_R < boss.x + boss.w / 2 &&
      ball.y + BALL_R > boss.y - boss.h / 2 &&
      ball.y - BALL_R < boss.y + boss.h / 2
    ) {
      // reflect downward off the boss body
      ball.vy = Math.abs(ball.vy);
      ball.y = boss.y + boss.h / 2 + BALL_R + 1;
      boss.hp = Math.max(0, boss.hp - 1);
      boss.hitFlash = 0.15;
      if (!this.reduced) this.freeze = 40; // hit-stop on boss hits
      this.ctx?.audio.playPitched(SFX.brick, 300);
      this.shake = Math.min(12, this.shake + 3);
      if (boss.hp <= 0) this.clearStage();
    }
  }

  // ---- Power-ups -----------------------------------------------------------

  private dropCap(brick: Brick, type: PowerType): void {
    this.caps.push({ x: cellX(brick.col) + CELL_W / 2, y: cellY(brick.row) + CELL_H / 2, type });
  }

  private updateCaps(dt: number): void {
    const pw = this.paddleW();
    for (const cap of this.caps) cap.y += 140 * dt;
    this.caps = this.caps.filter((cap) => {
      if (
        cap.y > PADDLE_Y - 14 &&
        cap.y < PADDLE_Y + 16 &&
        cap.x > this.paddleX - pw / 2 &&
        cap.x < this.paddleX + pw / 2
      ) {
        this.applyPower(cap.type);
        return false;
      }
      return cap.y < LOGICAL_H + 10;
    });
  }

  private applyPower(type: PowerType): void {
    this.ctx?.audio.play(SFX.power);
    switch (type) {
      case 'multiball':
        this.spawnMultiball();
        break;
      case 'wide':
        this.wideT = WIDE_MS;
        this.narrowT = 0;
        break;
      case 'narrow':
        this.narrowT = EFFECT_MS;
        this.wideT = 0;
        break;
      case 'laser':
        this.laserT = EFFECT_MS;
        break;
      case 'sticky':
        this.stickyT = EFFECT_MS;
        break;
      case 'fireball':
        this.fireT = EFFECT_MS;
        break;
      case 'slow':
        this.slowT = EFFECT_MS;
        this.fastT = 0;
        break;
      case 'fast':
        this.fastT = EFFECT_MS;
        this.slowT = 0;
        break;
      case 'extralife':
        this.lives++;
        break;
    }
  }

  private spawnMultiball(): void {
    const src = this.balls.find((b) => !b.stuck) ?? this.balls[0];
    if (!src) return;
    const spd = Math.max(speedOf(src), this.ballSpeed());
    for (const a of [-0.5, 0.5]) {
      this.balls.push({
        x: src.x,
        y: src.y,
        vx: Math.sin(a) * spd,
        vy: -Math.abs(Math.cos(a) * spd),
        stuck: false,
        stuckOff: 0,
        trail: [],
      });
    }
  }

  private updateLasers(dt: number): void {
    for (const l of this.lasers) l.y -= 520 * dt;
    this.lasers = this.lasers.filter((l) => {
      if (l.y < 40) return false;
      if (this.boss) {
        const boss = this.boss;
        if (Math.abs(l.x - boss.x) < boss.w / 2 && l.y < boss.y + boss.h / 2) {
          boss.hp = Math.max(0, boss.hp - 1);
          boss.hitFlash = 0.1;
          if (boss.hp <= 0) this.clearStage();
          return false;
        }
        return true;
      }
      const col = Math.floor((l.x - cellX(0)) / CELL_W);
      const row = Math.floor((l.y - cellY(0)) / CELL_H);
      const brick = this.grid.get(`${row},${col}`);
      if (brick && brick.alive && brick.type !== 'steel') {
        this.damageBrick(brick, false);
        return false;
      }
      return true;
    });
  }

  // ---- Boss ----------------------------------------------------------------

  private updateBoss(dt: number): void {
    const boss = this.boss!;
    boss.x += boss.dir * (40 + boss.variant * 10) * dt;
    if (boss.x < boss.w / 2 + 10) {
      boss.x = boss.w / 2 + 10;
      boss.dir = 1;
    } else if (boss.x > LOGICAL_W - boss.w / 2 - 10) {
      boss.x = LOGICAL_W - boss.w / 2 - 10;
      boss.dir = -1;
    }
    if (boss.hitFlash > 0) boss.hitFlash -= dt;

    boss.regenT -= dt;
    if (boss.regenT <= 0) {
      boss.regenT = 6;
      boss.hp = Math.min(boss.maxHp, boss.hp + 2); // regenerate armour plates
    }
    boss.hazardT -= dt;
    if (boss.hazardT <= 0) {
      boss.hazardT = 1.6 - boss.variant * 0.2;
      this.hazards.push({ x: boss.x + (Math.random() - 0.5) * boss.w, y: boss.y + boss.h / 2 });
    }
  }

  private updateHazards(dt: number): void {
    const pw = this.paddleW();
    for (const h of this.hazards) h.y += 120 * dt;
    this.hazards = this.hazards.filter((h) => {
      if (
        h.y > PADDLE_Y - 12 &&
        h.y < PADDLE_Y + 14 &&
        h.x > this.paddleX - pw / 2 &&
        h.x < this.paddleX + pw / 2
      ) {
        this.loseLife();
        return false;
      }
      return h.y < LOGICAL_H + 10;
    });
  }

  // ---- Life / stage flow ---------------------------------------------------

  private loseLife(): void {
    if (this.over || this.transition > 0) return;
    this.lives--;
    this.ctx?.audio.play(SFX.lifeLost);
    this.shake = this.reduced ? 0 : 10;
    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.resetBall();
    }
  }

  private clearStage(): void {
    if (this.transition > 0) return;
    const elapsed = (this.time.now - this.stageStart) / 1000;
    this.score += stageClearBonus(elapsed, this.lives);
    this.ctx?.audio.play(SFX.clear);
    this.shake = this.reduced ? 0 : 8;
    this.transition = 900;
    // shatter current bricks into particles
    for (const b of this.bricks) if (b.alive) this.breakFx(b);
    this.balls = [];
    this.caps = [];
    this.hazards = [];
    this.boss = null;
  }

  private gameOver(): void {
    if (this.attract) {
      this.stageNum = 1;
      this.lives = LIVES;
      this.score = 0;
      this.startStage(1);
      return;
    }
    if (this.over) return;
    this.over = true;
    this.onGameOver?.(this.score, { stage: this.stageNum });
  }

  // ---- FX ------------------------------------------------------------------

  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; c: string }> = [];

  private breakFx(brick: Brick): void {
    this.ctx?.audio.playPitched(SFX.brick, brickFreq(brick.row));
    if (this.reduced) return;
    const x = cellX(brick.col) + CELL_W / 2;
    const y = cellY(brick.row) + CELL_H / 2;
    const c = BRICK_COLORS[brick.type];
    for (let i = 0; i < 8; i++)
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 220,
        vy: (Math.random() - 0.5) * 220,
        life: 0.5,
        c,
      });
  }

  // ---- Render --------------------------------------------------------------

  private render(): void {
    const g = this.g;
    g.clear();
    const ox = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const oy = this.shake ? (Math.random() - 0.5) * this.shake : 0;

    // particles
    for (const p of this.particles) {
      p.life -= 1 / 60;
      p.x += p.vx / 60;
      p.y += p.vy / 60;
      p.vy += 6;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    // bricks
    for (const b of this.bricks) {
      if (!b.alive) continue;
      const x = cellX(b.col) + ox;
      const y = cellY(b.row) + oy;
      g.fillStyle(Phaser.Display.Color.HexStringToColor(BRICK_COLORS[b.type]).color, 1);
      g.fillRect(x + 1, y + 1, CELL_W - 2, CELL_H - 2);
      g.fillStyle(0xffffff, 0.14);
      g.fillRect(x + 1, y + 1, CELL_W - 2, 3);
      const cr = crackLevel(b);
      if (cr > 0) {
        g.lineStyle(1, 0x000000, 0.5);
        g.lineBetween(x + 4, y + CELL_H / 2, x + CELL_W - 4, y + CELL_H / 2 + (cr > 0.5 ? 4 : 0));
      }
      if (b.type === 'steel') {
        g.fillStyle(0xffffff, 0.1);
        g.fillRect(x + 3, y + 3, 3, 3);
        g.fillRect(x + CELL_W - 6, y + CELL_H - 6, 3, 3);
      }
    }

    if (this.boss) this.drawBoss(g, ox, oy);

    // particles draw
    for (const p of this.particles) {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(p.c).color, Math.max(0, p.life / 0.5));
      g.fillRect(p.x + ox, p.y + oy, 3, 3);
    }

    // caps
    for (const cap of this.caps) {
      const def = POWERUPS[cap.type];
      g.fillStyle(Phaser.Display.Color.HexStringToColor(def.color).color, 1);
      roundRect(g, cap.x - 11 + ox, cap.y - 8 + oy, 22, 16, 5);
      g.fill();
    }

    // lasers
    g.fillStyle(Phaser.Display.Color.HexStringToColor(COL.joystick).color, 1);
    for (const l of this.lasers) g.fillRect(l.x - 1 + ox, l.y - 10 + oy, 2, 10);

    // hazards
    g.fillStyle(Phaser.Display.Color.HexStringToColor(COL.joystick).color, 0.9);
    for (const h of this.hazards) g.fillRect(h.x - 6 + ox, h.y - 6 + oy, 12, 12);

    // balls + trails
    for (const ball of this.balls) {
      for (let i = 0; i < ball.trail.length; i++) {
        const t = ball.trail[i]!;
        g.fillStyle(0x4df0d0, ((i + 1) / ball.trail.length) * 0.4);
        g.fillRect(t.x - 3 + ox, t.y - 3 + oy, 6, 6);
      }
      g.fillStyle(this.fireT > 0 ? 0xff8a3d : 0xfff4dc, 1);
      g.fillCircle(ball.x + ox, ball.y + oy, BALL_R);
    }

    // paddle
    const pw = this.paddleW();
    const squashY = this.paddleSquash > 0 ? 1 + Math.sin((this.paddleSquash / 0.12) * Math.PI) * 0.5 : 1;
    g.fillStyle(
      Phaser.Display.Color.HexStringToColor(this.laserT > 0 ? COL.joystick : COL.marquee).color,
      1,
    );
    roundRect(
      g,
      this.paddleX - pw / 2 + ox,
      PADDLE_Y - (PADDLE_H * squashY) / 2 + oy,
      pw,
      PADDLE_H * squashY,
      6,
    );
    g.fill();

    if (this.transition > 0) {
      g.fillStyle(0x000000, Math.min(0.5, (900 - this.transition) / 900));
      g.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    }

    // HUD text
    this.tScore.setText(`${this.score}`);
    this.tStage.setText(isBossStage(this.stageNum) ? `BOSS ${this.stageNum}` : `STAGE ${this.stageNum}`);
    this.tLives.setText('*'.repeat(Math.max(0, this.lives)));

    if (!this.attract) {
      (window as unknown as { __brickquake?: object }).__brickquake = {
        score: this.score,
        lives: this.lives,
        stage: this.stageNum,
        over: this.over,
      };
    }
  }

  private drawBoss(g: Phaser.GameObjects.Graphics, ox: number, oy: number): void {
    const boss = this.boss!;
    const colors = [COL.joystick, COL.marquee, COL.phosphor, '#c06cff'];
    const base = Phaser.Display.Color.HexStringToColor(colors[boss.variant] ?? COL.joystick).color;
    const bx = boss.x - boss.w / 2 + ox;
    const by = boss.y - boss.h / 2 + oy;
    // body built of brick cells (pixel creature)
    const cols = 9;
    const rows = 4;
    const cw = boss.w / cols;
    const ch = boss.h / rows;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if ((r === 0 || r === rows - 1) && (c === 0 || c === cols - 1)) continue; // rounded corners
        g.fillStyle(base, boss.hitFlash > 0 ? 1 : 0.85);
        g.fillRect(bx + c * cw + 1, by + r * ch + 1, cw - 2, ch - 2);
      }
    // eyes
    g.fillStyle(0x07040e, 1);
    g.fillRect(bx + cw * 2.5, by + ch, cw, ch);
    g.fillRect(bx + cw * 5.5, by + ch, cw, ch);
    // health bar
    const hbW = boss.w;
    g.fillStyle(0x000000, 0.6);
    g.fillRect(bx, by - 12, hbW, 6);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(COL.joystick).color, 1);
    g.fillRect(bx, by - 12, hbW * (boss.hp / boss.maxHp), 6);
  }
}

function roundRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, h / 2, w / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.lineTo(x + w - rr, y);
  g.arc(x + w - rr, y + rr, rr, -Math.PI / 2, 0);
  g.lineTo(x + w, y + h - rr);
  g.arc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2);
  g.lineTo(x + rr, y + h);
  g.arc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI);
  g.lineTo(x, y + rr);
  g.arc(x + rr, y + rr, rr, Math.PI, -Math.PI / 2);
  g.closePath();
}
