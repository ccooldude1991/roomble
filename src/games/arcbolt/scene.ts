/*
 * Arcbolt — Phaser 3 twin-stick arena shooter scene.
 *
 * Phaser runs the scene/loop/input/render; entities (bullets, enemies, particles,
 * enemy bullets, pickups) live in fixed-capacity pools (see pool.ts) so object
 * counts never grow across a run. Rendering is immediate-mode vector drawing into
 * one world Graphics plus a screen-fixed HUD Graphics. Waves, upgrades, scoring,
 * enemy stats and the attract bot come from the pure, unit-tested sibling modules.
 */
import Phaser from 'phaser';
import type { GameContext } from '../types';
import {
  LOGICAL_W,
  LOGICAL_H,
  ARENA_W,
  ARENA_H,
  PLAYER_R,
  PLAYER_SPEED,
  HULL_MAX,
  INVULN_AFTER_HIT,
  DASH_SPEED,
  DASH_TIME,
  DASH_IFRAME,
  BULLET_SPEED,
  BULLET_LIFE,
  EBULLET_SPEED,
  EBULLET_R,
  EBULLET_LIFE,
  MAX_BULLETS,
  MAX_ENEMIES,
  MAX_EBULLETS,
  MAX_PARTICLES_DESKTOP,
  MAX_PARTICLES_MOBILE,
  GRID_CELL,
  COLORS,
} from './config';
import { Pool } from './pool';
import { ENEMY_DEFS, enemyStats, type EnemyType } from './enemies';
import { composeWave, isBossWave, makeRng, type WavePlan } from './waves';
import { deriveStats, applyUpgrade, UPGRADES, pickThree, type Build, type UpgradeId } from './upgrades';
import {
  killScore,
  multiplierAfterKill,
  multiplierAfterHit,
  waveClearBonus,
  accuracyPct,
  MULT_MIN,
} from './scoring';
import { SFX, laserFreq } from './sfx';
import { nearestIndex, aimAtNearest, kiteDir } from './ai';
import {
  angleTo,
  dist,
  dist2,
  fromAngle,
  normalize,
  clamp,
  circlesOverlap,
  leadAngle,
  angleDelta,
} from './geometry';

const hex = (c: string): number => parseInt(c.replace('#', ''), 16);

interface Bullet {
  active: boolean;
  x: number; y: number; vx: number; vy: number;
  life: number; r: number; dmg: number;
  pierce: number; ricochet: number; homing: number;
  px: number; py: number; // previous pos for trail
}
interface EBullet { active: boolean; x: number; y: number; vx: number; vy: number; life: number; }
interface Particle {
  active: boolean;
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; angle: number; spin: number; len: number; color: number;
}
interface Pickup { active: boolean; x: number; y: number; vx: number; vy: number; value: number; }
interface Enemy {
  active: boolean;
  type: EnemyType; elite: boolean;
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number; r: number; value: number;
  t: number; state: number; angle: number; fireT: number; flash: number;
  small: boolean; // splitter child
}

interface SceneData {
  ctx?: GameContext;
  attract: boolean;
  onGameOver?: (score: number, stats: Record<string, number>) => void;
}

type Phase = 'spawning' | 'fighting' | 'upgrade' | 'dead';

export class ArcboltScene extends Phaser.Scene {
  private ctx?: GameContext;
  private attract = false;
  private reduced = false;
  private lowFx = false;
  private touchMode = false;
  private testHook = false;
  private onGameOver?: (score: number, stats: Record<string, number>) => void;

  // pools
  private bullets!: Pool<Bullet>;
  private ebullets!: Pool<EBullet>;
  private particles!: Pool<Particle>;
  private pickups!: Pool<Pickup>;
  private enemies!: Pool<Enemy>;

  // player
  private px = ARENA_W / 2;
  private py = ARENA_H / 2;
  private pvx = 0;
  private pvy = 0;
  private aim = 0;
  private hull = HULL_MAX;
  private invuln = 0;
  private dashT = 0;
  private dashCd = 0;
  private dashDx = 1;
  private dashDy = 0;
  private fireCdT = 0;

  // run state
  private build: Build = {};
  private wave = 0;
  private score = 0;
  private mult = MULT_MIN;
  private phase: Phase = 'spawning';
  private spawnQueue: WavePlan['spawns'] = [];
  private spawnTimer = 0;
  private waveStart = 0;
  private boss: Enemy | null = null;
  private bossMaxHp = 0;
  private over = false;
  private shotsFired = 0;
  private shotsHit = 0;
  private rng = makeRng(Date.now() & 0xffffffff);

  // fx / time
  private timeScale = 1;
  private freezeMs = 0;
  private warnPulse = 0;
  private ghosts: Array<{ x: number; y: number; life: number }> = [];
  private bolts: Array<{ x1: number; y1: number; x2: number; y2: number; life: number }> = [];
  private shocks: Array<{ x: number; y: number; r: number; life: number }> = [];

  // upgrade cards
  private offered: UpgradeId[] = [];
  private cardAnim = 0;

  // input
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private mouseDown = false;
  private autoFire = true;
  private stickL: { id: number; ox: number; oy: number; x: number; y: number } | null = null;
  private stickR: { id: number; ox: number; oy: number; x: number; y: number } | null = null;
  private dashBtnRect = { x: LOGICAL_W - 96, y: LOGICAL_H - 150, w: 64, h: 64 };

  // bot
  private botDashT = 0;

  private g!: Phaser.GameObjects.Graphics;
  private hudG!: Phaser.GameObjects.Graphics;
  private tScore!: Phaser.GameObjects.Text;
  private tWave!: Phaser.GameObjects.Text;
  private tMult!: Phaser.GameObjects.Text;
  private tBanner!: Phaser.GameObjects.Text;
  private cardTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('arcbolt');
  }

  init(data: SceneData): void {
    this.ctx = data.ctx;
    this.attract = data.attract;
    this.onGameOver = data.onGameOver;
    this.reduced = data.ctx?.reducedMotion ?? false;
    const w = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {};
    this.touchMode =
      (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) ||
      w.__arcboltForceTouch === true; // test-only: exercise the twin-stick path
    this.lowFx = this.reduced || this.touchMode;
    this.testHook =
      !this.attract &&
      typeof window !== 'undefined' &&
      !!(window as unknown as Record<string, unknown>).__arcboltTest;
  }

  create(): void {
    const maxP = this.lowFx ? MAX_PARTICLES_MOBILE : MAX_PARTICLES_DESKTOP;
    this.bullets = new Pool<Bullet>(MAX_BULLETS, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, r: 3, dmg: 1, pierce: 0, ricochet: 0, homing: 0, px: 0, py: 0,
    }));
    this.ebullets = new Pool<EBullet>(MAX_EBULLETS, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 }));
    this.particles = new Pool<Particle>(maxP, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, angle: 0, spin: 0, len: 6, color: 0xffffff,
    }));
    this.pickups = new Pool<Pickup>(60, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, value: 5 }));
    this.enemies = new Pool<Enemy>(MAX_ENEMIES, () => ({
      active: false, type: 'drifter', elite: false, x: 0, y: 0, vx: 0, vy: 0,
      hp: 1, maxHp: 1, r: 10, value: 10, t: 0, state: 0, angle: 0, fireT: 0, flash: 0, small: false,
    }));

    this.cameras.main.setBounds(0, 0, ARENA_W, ARENA_H);
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.g = this.add.graphics();
    this.hudG = this.add.graphics().setScrollFactor(0);

    const font = (size: number, color: string) => ({ fontFamily: "'VT323'", fontSize: `${size}px`, color });
    this.tScore = this.add.text(12, 8, '', font(26, COLORS.phosphor)).setScrollFactor(0);
    this.tMult = this.add.text(12, 34, '', font(20, COLORS.marquee)).setScrollFactor(0);
    this.tWave = this.add.text(LOGICAL_W / 2, 8, '', font(22, COLORS.ticket)).setOrigin(0.5, 0).setScrollFactor(0);
    this.tBanner = this.add
      .text(LOGICAL_W / 2, LOGICAL_H / 2 - 40, '', { fontFamily: "'Bungee'", fontSize: '34px', color: COLORS.marquee })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5);

    this.setupInput();

    this.px = ARENA_W / 2;
    this.py = ARENA_H / 2;
    this.hull = this.stats().hullMax;
    this.startWave(1);

    this.ctx?.emit({ type: 'start' });
  }

  private stats() {
    return deriveStats(this.build);
  }

  private enemyColor(e: Enemy): string {
    if (e.state === 99) return COLORS.joystick;
    return ENEMY_DEFS[e.type].color;
  }

  // ---- Input ---------------------------------------------------------------

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,F,ONE,TWO,THREE') as Record<
        string,
        Phaser.Input.Keyboard.Key
      >;
      kb.addCapture('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT');
      kb.on('keydown-SPACE', () => this.tryDash());
      kb.on('keydown-SHIFT', () => this.tryDash());
      kb.on('keydown-F', () => (this.autoFire = !this.autoFire));
      kb.on('keydown-ONE', () => this.chooseUpgrade(0));
      kb.on('keydown-TWO', () => this.chooseUpgrade(1));
      kb.on('keydown-THREE', () => this.chooseUpgrade(2));
    }

    this.input.addPointer(2); // allow up to 3 simultaneous pointers (twin-stick + spare)

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onPointerUp(p));
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (this.attract) return;
    if (this.phase === 'upgrade') {
      this.pickCardAt(p.x, p.y);
      return;
    }
    if (this.phase === 'dead') return;

    // Sticks for a touch device or a genuine touch event; mouse-aim otherwise.
    if (!this.touchMode && !p.wasTouch) {
      this.mouseDown = true;
      return;
    }
    // Touch twin-stick: dash button first, then right/left halves.
    if (this.inRect(p.x, p.y, this.dashBtnRect)) {
      this.tryDash();
      return;
    }
    if (p.x > LOGICAL_W / 2) {
      this.stickR = { id: p.id, ox: p.x, oy: p.y, x: p.x, y: p.y };
    } else {
      this.stickL = { id: p.id, ox: p.x, oy: p.y, x: p.x, y: p.y };
    }
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (this.attract) return;
    if (this.stickL && p.id === this.stickL.id) {
      this.stickL.x = p.x;
      this.stickL.y = p.y;
    }
    if (this.stickR && p.id === this.stickR.id) {
      this.stickR.x = p.x;
      this.stickR.y = p.y;
    }
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    if (!this.touchMode && !p.wasTouch) this.mouseDown = false;
    if (this.stickL && p.id === this.stickL.id) this.stickL = null;
    if (this.stickR && p.id === this.stickR.id) this.stickR = null;
  }

  private inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // ---- Wave flow -----------------------------------------------------------

  private startWave(n: number): void {
    this.wave = n;
    this.phase = 'spawning';
    this.waveStart = this.time.now;
    this.boss = null;
    const plan = composeWave(n, this.rng);
    if (plan.boss) {
      this.spawnBoss(n);
      this.phase = 'fighting';
    } else {
      this.spawnQueue = plan.spawns.slice();
      this.spawnTimer = 0;
    }
    this.banner(isBossWave(n) ? 'Boss wave' : `Wave ${n}`, 1200);
  }

  private banner(text: string, ms: number): void {
    this.tBanner.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.tBanner, alpha: 0, duration: ms, ease: 'Quad.easeIn' });
  }

  private spawnFromQueue(): void {
    // Drip-feed a few at a time from arena edges.
    let budget = 3;
    while (budget-- > 0 && this.spawnQueue.length) {
      const spec = this.spawnQueue.shift()!;
      this.spawnEnemy(spec.type, spec.elite, this.edgePoint());
    }
    if (!this.spawnQueue.length) this.phase = 'fighting';
  }

  private edgePoint(): { x: number; y: number } {
    // A point on the arena edge, biased away from the player.
    for (let tries = 0; tries < 8; tries++) {
      const side = Math.floor(this.rng() * 4);
      let x = 0;
      let y = 0;
      if (side === 0) { x = this.rng() * ARENA_W; y = 20; }
      else if (side === 1) { x = this.rng() * ARENA_W; y = ARENA_H - 20; }
      else if (side === 2) { x = 20; y = this.rng() * ARENA_H; }
      else { x = ARENA_W - 20; y = this.rng() * ARENA_H; }
      if (dist2(x, y, this.px, this.py) > 220 * 220) return { x, y };
    }
    return { x: 20, y: 20 };
  }

  private spawnEnemy(type: EnemyType, elite: boolean, at: { x: number; y: number }, small = false): Enemy | null {
    const e = this.enemies.spawn();
    if (!e) return null;
    const st = enemyStats(type, elite);
    e.type = type;
    e.elite = elite;
    e.small = small;
    e.x = at.x;
    e.y = at.y;
    e.vx = 0;
    e.vy = 0;
    e.hp = small ? 1 : st.hp;
    e.maxHp = e.hp;
    e.r = small ? st.radius * 0.6 : st.radius;
    e.value = small ? Math.round(st.value * 0.4) : st.value;
    e.t = 0;
    e.state = 0;
    e.angle = this.rng() * Math.PI * 2;
    e.fireT = 1 + this.rng() * 1.5;
    e.flash = 0;
    return e;
  }

  private spawnBoss(n: number): void {
    const tier = Math.floor(n / 10);
    const e = this.spawnEnemy('spawner', true, { x: ARENA_W / 2, y: 120 });
    if (!e) return;
    e.hp = 60 + tier * 40;
    e.maxHp = e.hp;
    e.r = 42 + tier * 4;
    e.value = 1000 * tier;
    e.state = 99; // boss marker
    this.boss = e;
    this.bossMaxHp = e.hp;
    this.ctx?.audio.play(SFX.boomBig);
  }

  // ---- Update --------------------------------------------------------------

  update(_t: number, delta: number): void {
    let dtMs = Math.min(40, delta);
    if (this.freezeMs > 0) {
      this.freezeMs -= dtMs;
      this.render();
      return;
    }
    dtMs *= this.timeScale;
    const dt = dtMs / 1000;
    // ease slow-mo back to normal
    if (this.timeScale < 1) this.timeScale = Math.min(1, this.timeScale + delta / 1000 * 1.2);

    if (this.phase === 'dead') {
      this.render();
      return;
    }
    if (this.phase === 'upgrade') {
      this.cardAnim = Math.min(1, this.cardAnim + dt * 4);
      if (this.attract) this.chooseUpgrade(Math.floor(this.rng() * 3));
      this.render();
      return;
    }

    if (this.phase === 'spawning') {
      this.spawnTimer -= dtMs;
      if (this.spawnTimer <= 0) {
        this.spawnFromQueue();
        this.spawnTimer = 420;
      }
    }

    if (this.attract) this.botControl(dt);
    else this.playerControl(dt);

    this.updatePlayer(dt);
    this.updateFiring(dt);
    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.updateEBullets(dt);
    this.updatePickups(dt);
    this.updateFx(dt);

    // camera follow
    this.cameras.main.scrollX = clamp(this.px - LOGICAL_W / 2, 0, ARENA_W - LOGICAL_W);
    this.cameras.main.scrollY = clamp(this.py - LOGICAL_H / 2, 0, ARENA_H - LOGICAL_H);

    // wave cleared?
    if (this.phase === 'fighting' && this.enemies.activeCount() === 0 && this.spawnQueue.length === 0) {
      this.onWaveCleared();
    }

    this.render();
    this.publish();
  }

  // ---- Player control ------------------------------------------------------

  private playerControl(dt: number): void {
    let mx = 0;
    let my = 0;
    const k = this.keys;
    if (k) {
      if (k.A.isDown || k.LEFT.isDown) mx -= 1;
      if (k.D.isDown || k.RIGHT.isDown) mx += 1;
      if (k.W.isDown || k.UP.isDown) my -= 1;
      if (k.S.isDown || k.DOWN.isDown) my += 1;
    }

    // gamepad
    const pad = navigator.getGamepads?.().find((p) => p);
    if (pad) {
      const dz = 0.25;
      const lx = pad.axes[0] ?? 0;
      const ly = pad.axes[1] ?? 0;
      if (Math.abs(lx) > dz) mx += lx;
      if (Math.abs(ly) > dz) my += ly;
      const rx = pad.axes[2] ?? 0;
      const ry = pad.axes[3] ?? 0;
      if (Math.hypot(rx, ry) > dz) {
        this.aim = Math.atan2(ry, rx);
        this.wantFire = true;
      }
      if (pad.buttons[5]?.pressed || pad.buttons[7]?.pressed) this.tryDash();
    }

    // touch left stick
    if (this.stickL) {
      const dx = this.stickL.x - this.stickL.ox;
      const dy = this.stickL.y - this.stickL.oy;
      const m = Math.hypot(dx, dy);
      if (m > 6) {
        const s = Math.min(1, m / 48);
        mx += (dx / m) * s;
        my += (dy / m) * s;
      }
    }

    const mv = normalize(mx, my);
    const mag = Math.min(1, Math.hypot(mx, my));
    this.pvx = mv.x * PLAYER_SPEED * mag;
    this.pvy = mv.y * PLAYER_SPEED * mag;

    // aim: mouse (if no gamepad aim/touch), or touch right stick
    this.wantFire = this.wantFire || this.autoFire || this.mouseDown;
    if (this.stickR) {
      const dx = this.stickR.x - this.stickR.ox;
      const dy = this.stickR.y - this.stickR.oy;
      if (Math.hypot(dx, dy) > 6) {
        this.aim = Math.atan2(dy, dx);
        this.wantFire = true;
      }
    } else if (!pad && !this.touchMode && this.input.activePointer) {
      // mouse aim toward world pointer
      const pr = this.input.activePointer;
      this.aim = angleTo(this.px, this.py, pr.worldX, pr.worldY);
    }

    if (this.testHook) {
      // Auto-aim at nearest enemy and always fire, so the smoke test can verify the
      // kill/score pipeline without pixel-perfect aiming.
      const list: Array<{ x: number; y: number }> = [];
      this.enemies.forEach((e) => list.push({ x: e.x, y: e.y }));
      this.aim = aimAtNearest(this.px, this.py, list, this.aim);
      this.wantFire = true;
    }

    void dt;
  }

  private wantFire = false;

  private botControl(dt: number): void {
    const threats: Array<{ x: number; y: number }> = [];
    this.enemies.forEach((e) => threats.push({ x: e.x, y: e.y }));
    const dir = kiteDir(this.px, this.py, threats, ARENA_W, ARENA_H);
    this.pvx = dir.x * PLAYER_SPEED;
    this.pvy = dir.y * PLAYER_SPEED;
    this.aim = aimAtNearest(this.px, this.py, threats, this.aim);
    this.wantFire = threats.length > 0;
    this.botDashT -= dt;
    if (this.botDashT <= 0 && threats.length) {
      this.tryDash();
      this.botDashT = 2 + this.rng() * 2;
    }
  }

  private tryDash(): void {
    if (this.phase === 'dead' || this.phase === 'upgrade') return;
    if (this.dashCd > 0 || this.dashT > 0) return;
    const d = normalize(this.pvx, this.pvy);
    if (d.x === 0 && d.y === 0) {
      const a = fromAngle(this.aim);
      d.x = a.x;
      d.y = a.y;
    }
    this.dashDx = d.x;
    this.dashDy = d.y;
    this.dashT = DASH_TIME;
    this.invuln = Math.max(this.invuln, DASH_IFRAME);
    this.dashCd = this.stats().dashCd;
    this.ctx?.audio.play(SFX.dash);
  }

  private updatePlayer(dt: number): void {
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.invuln > 0) this.invuln -= dt;

    if (this.dashT > 0) {
      this.dashT -= dt;
      this.px += this.dashDx * DASH_SPEED * dt;
      this.py += this.dashDy * DASH_SPEED * dt;
      if (!this.lowFx || this.ghosts.length < 8) this.ghosts.push({ x: this.px, y: this.py, life: 0.3 });
    } else {
      this.px += this.pvx * dt;
      this.py += this.pvy * dt;
    }
    this.px = clamp(this.px, PLAYER_R, ARENA_W - PLAYER_R);
    this.py = clamp(this.py, PLAYER_R, ARENA_H - PLAYER_R);
  }

  // ---- Firing --------------------------------------------------------------

  private updateFiring(dt: number): void {
    if (this.fireCdT > 0) this.fireCdT -= dt;
    const s = this.stats();
    if (this.wantFire && this.fireCdT <= 0 && this.phase !== 'upgrade' && this.phase !== 'dead') {
      this.fireVolley(this.px, this.py, this.aim, s.bulletCount, s.spreadArc, s);
      this.fireCdT = s.fireCd;
      this.ctx?.audio.playPitched(SFX.laser, laserFreq());
    }
    this.updateDrones(dt, s);
    this.wantFire = false;
  }

  private droneT: number[] = [];
  private updateDrones(dt: number, s: ReturnType<typeof deriveStats>): void {
    while (this.droneT.length < s.drones) this.droneT.push(0);
    for (let i = 0; i < s.drones; i++) {
      this.droneT[i] = (this.droneT[i] ?? 0) - dt;
      if ((this.droneT[i] ?? 0) <= 0) {
        const pos = this.dronePos(i, s.drones);
        const list: Array<{ x: number; y: number }> = [];
        this.enemies.forEach((e) => list.push({ x: e.x, y: e.y }));
        if (list.length) {
          const a = aimAtNearest(pos.x, pos.y, list, 0);
          this.fireVolley(pos.x, pos.y, a, 1, 0, s, true);
          this.droneT[i] = s.fireCd * 1.6;
        } else {
          this.droneT[i] = 0.2;
        }
      }
    }
  }

  private dronePos(i: number, count: number): { x: number; y: number } {
    const a = (this.time.now / 700) + (i / Math.max(1, count)) * Math.PI * 2;
    return { x: this.px + Math.cos(a) * 34, y: this.py + Math.sin(a) * 34 };
  }

  private fireVolley(
    x: number,
    y: number,
    aim: number,
    count: number,
    arc: number,
    s: ReturnType<typeof deriveStats>,
    silent = false,
  ): void {
    const start = aim - arc / 2;
    const step = count > 1 ? arc / (count - 1) : 0;
    for (let i = 0; i < count; i++) {
      const a = count > 1 ? start + step * i : aim;
      const b = this.bullets.spawn();
      if (!b) break;
      const v = fromAngle(a);
      b.x = x; b.y = y; b.px = x; b.py = y;
      b.vx = v.x * BULLET_SPEED;
      b.vy = v.y * BULLET_SPEED;
      b.life = BULLET_LIFE;
      b.r = s.bulletR;
      b.dmg = s.bulletDamage;
      b.pierce = s.pierce;
      b.ricochet = s.ricochet;
      b.homing = s.homing;
      this.shotsFired++;
    }
    if (!silent) {
      // muzzle flash
      this.spawnParticles(x + Math.cos(aim) * 10, y + Math.sin(aim) * 10, 2, hex(COLORS.phosphor), 90, aim, 0.5);
    }
  }

  // ---- Bullets -------------------------------------------------------------

  private updateBullets(dt: number): void {
    this.bullets.forEach((b) => {
      b.life -= dt;
      if (b.life <= 0) { b.active = false; return; }
      b.px = b.x; b.py = b.y;
      if (b.homing > 0) {
        const list: Enemy[] = [];
        this.enemies.forEach((e) => list.push(e));
        if (list.length) {
          const pts = list.map((e) => ({ x: e.x, y: e.y }));
          const ni = nearestIndex(b.x, b.y, pts);
          if (ni >= 0) {
            const want = angleTo(b.x, b.y, list[ni]!.x, list[ni]!.y);
            const cur = Math.atan2(b.vy, b.vx);
            const na = cur + clamp(angleDelta(cur, want), -b.homing * dt, b.homing * dt);
            const sp = Math.hypot(b.vx, b.vy);
            b.vx = Math.cos(na) * sp;
            b.vy = Math.sin(na) * sp;
          }
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // wall ricochet / cull
      if (b.x < 0 || b.x > ARENA_W) {
        if (b.ricochet > 0) { b.vx = -b.vx; b.ricochet--; b.x = clamp(b.x, 0, ARENA_W); }
        else { b.active = false; return; }
      }
      if (b.y < 0 || b.y > ARENA_H) {
        if (b.ricochet > 0) { b.vy = -b.vy; b.ricochet--; b.y = clamp(b.y, 0, ARENA_H); }
        else { b.active = false; return; }
      }

      // enemy collisions
      let consumed = false;
      this.enemies.forEach((e) => {
        if (consumed || !b.active) return;
        if (!circlesOverlap(b.x, b.y, b.r, e.x, e.y, e.r)) return;
        // shielder blocks shots that hit its front (facing the player)
        if (e.type === 'shielder' && !e.small) {
          const facing = angleTo(e.x, e.y, this.px, this.py);
          const hitFrom = angleTo(e.x, e.y, b.x, b.y);
          if (Math.abs(angleDelta(facing, hitFrom)) < 1.2) {
            // sparks off the shield
            this.spawnParticles(b.x, b.y, 2, hex('#6fe3ff'), 80, hitFrom, 0.35);
            b.active = false;
            consumed = true;
            return;
          }
        }
        this.hitEnemy(e, b.dmg, b.vx, b.vy);
        this.shotsHit++;
        if (b.pierce > 0) { b.pierce--; } else { b.active = false; consumed = true; }
      });
    });
  }

  // ---- Enemies -------------------------------------------------------------

  private updateEnemies(dt: number): void {
    this.enemies.forEach((e) => {
      e.t += dt;
      if (e.flash > 0) e.flash -= dt;
      const toP = angleTo(e.x, e.y, this.px, this.py);
      const d = dist(e.x, e.y, this.px, this.py);

      if (e.state === 99) {
        this.updateBoss(e, dt, toP);
      } else {
        switch (e.type) {
          case 'drifter':
            this.seek(e, toP, e.small ? enemyStats('drifter', false).speed * 1.3 : ENEMY_DEFS.drifter.speed, dt);
            break;
          case 'darter':
            this.updateDarter(e, toP, dt);
            break;
          case 'splitter':
            this.seek(e, toP, ENEMY_DEFS.splitter.speed, dt);
            break;
          case 'orbiter':
            this.updateOrbiter(e, toP, d, dt);
            break;
          case 'shielder':
            this.seek(e, toP, ENEMY_DEFS.shielder.speed, dt);
            break;
          case 'spawner':
            this.updateSpawner(e, dt);
            break;
        }
      }

      // separation + bounds
      e.x = clamp(e.x, e.r, ARENA_W - e.r);
      e.y = clamp(e.y, e.r, ARENA_H - e.r);

      // contact with player
      if (this.invuln <= 0 && this.dashT <= 0 && circlesOverlap(e.x, e.y, e.r, this.px, this.py, PLAYER_R)) {
        this.playerHit();
      }
    });
  }

  private seek(e: Enemy, toP: number, speed: number, dt: number): void {
    const sp = e.elite ? speed * 1.15 : speed;
    e.vx = Math.cos(toP) * sp;
    e.vy = Math.sin(toP) * sp;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }

  private updateDarter(e: Enemy, toP: number, dt: number): void {
    // state 0 = telegraph, 1 = charge
    if (e.state === 0) {
      e.fireT -= dt;
      // creep slowly and face player while winding up
      e.angle = toP;
      e.x += Math.cos(toP) * 18 * dt;
      e.y += Math.sin(toP) * 18 * dt;
      if (e.fireT <= 0) {
        e.state = 1;
        e.fireT = 0.55;
        const sp = (e.elite ? 1.2 : 1) * 360;
        e.vx = Math.cos(e.angle) * sp;
        e.vy = Math.sin(e.angle) * sp;
      }
    } else {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.fireT -= dt;
      if (e.fireT <= 0) {
        e.state = 0;
        e.fireT = 0.9 + this.rng() * 0.6;
      }
    }
  }

  private updateOrbiter(e: Enemy, toP: number, d: number, dt: number): void {
    const want = 180;
    const radial = d > want ? 1 : d < want - 40 ? -1 : 0;
    const tangential = e.elite ? 1.2 : 1;
    const sp = ENEMY_DEFS.orbiter.speed;
    e.vx = (Math.cos(toP) * radial + Math.cos(toP + Math.PI / 2) * tangential) * sp;
    e.vy = (Math.sin(toP) * radial + Math.sin(toP + Math.PI / 2) * tangential) * sp;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.fireT -= dt;
    if (e.fireT <= 0) {
      e.fireT = 1.6;
      this.enemyShoot(e.x, e.y, leadAngle(e.x, e.y, this.px, this.py, this.pvx, this.pvy, EBULLET_SPEED));
    }
  }

  private updateSpawner(e: Enemy, dt: number): void {
    e.fireT -= dt;
    if (e.fireT <= 0) {
      e.fireT = 3.2;
      if (this.enemies.activeCount() < MAX_ENEMIES - 4) {
        this.spawnEnemy('drifter', false, { x: e.x + (this.rng() - 0.5) * 30, y: e.y + (this.rng() - 0.5) * 30 });
      }
    }
  }

  private updateBoss(e: Enemy, dt: number, toP: number): void {
    // slow drift toward a point above the player, periodic radial bursts
    const tx = clamp(this.px, 120, ARENA_W - 120);
    const ty = clamp(this.py - 160, 100, ARENA_H - 120);
    e.x += (tx - e.x) * 0.6 * dt;
    e.y += (ty - e.y) * 0.6 * dt;
    e.fireT -= dt;
    if (e.fireT <= 0) {
      e.fireT = 1.8;
      const n = 14;
      for (let i = 0; i < n; i++) this.enemyShoot(e.x, e.y, (i / n) * Math.PI * 2 + e.t);
    }
    // occasional aimed burst
    e.t += 0;
    void toP;
  }

  private enemyShoot(x: number, y: number, a: number): void {
    const b = this.ebullets.spawn();
    if (!b) return;
    const v = fromAngle(a);
    b.x = x; b.y = y;
    b.vx = v.x * EBULLET_SPEED;
    b.vy = v.y * EBULLET_SPEED;
    b.life = EBULLET_LIFE;
    this.ctx?.audio.play(SFX.eshot);
  }

  private hitEnemy(e: Enemy, dmg: number, bvx: number, bvy: number): void {
    e.hp -= dmg;
    e.flash = 0.08;
    const kb = e.state === 99 ? 0 : 60;
    const kn = normalize(bvx, bvy);
    e.x += kn.x * kb * 0.02;
    e.y += kn.y * kb * 0.02;
    this.ctx?.audio.play(SFX.hit);
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy): void {
    e.active = false;
    const gained = killScore(e.value, this.mult);
    this.score += gained;
    this.mult = multiplierAfterKill(this.mult);

    const size = e.state === 99 ? 3 : e.elite ? 2 : e.r > 13 ? 1 : 0;
    this.explode(e.x, e.y, hex(this.enemyColor(e)), size);

    // chain lightning
    const chain = this.stats().chain;
    if (chain > 0 && e.state !== 99) this.doChain(e.x, e.y, chain);

    // splitter children
    if (e.type === 'splitter' && !e.small) {
      for (let i = 0; i < 2; i++) {
        const a = this.rng() * Math.PI * 2;
        this.spawnEnemy('splitter', false, { x: e.x + Math.cos(a) * 14, y: e.y + Math.sin(a) * 14 }, true);
      }
    }
    // pickup drop
    if (e.state !== 99 && this.rng() < 0.16) {
      const pk = this.pickups.spawn();
      if (pk) { pk.x = e.x; pk.y = e.y; pk.vx = (this.rng() - 0.5) * 40; pk.vy = (this.rng() - 0.5) * 40; pk.value = 25; }
    }

    if (e.state === 99) {
      this.boss = null;
      this.ctx?.audio.play(SFX.boomBig);
    }

    // hit-stop on elite/boss kills; slow-mo when it's the last enemy of a wave
    if ((e.elite || e.state === 99) && !this.reduced) this.freezeMs = e.state === 99 ? 140 : 70;
    if (this.phase === 'fighting' && this.enemies.activeCount() === 0 && !this.reduced) this.timeScale = 0.35;
  }

  private doChain(x: number, y: number, count: number): void {
    const targets: Enemy[] = [];
    this.enemies.forEach((e) => targets.push(e));
    targets.sort((a, b) => dist2(x, y, a.x, a.y) - dist2(x, y, b.x, b.y));
    let fx = x;
    let fy = y;
    for (let i = 0; i < Math.min(count, targets.length); i++) {
      const t = targets[i]!;
      if (dist2(fx, fy, t.x, t.y) > 180 * 180) break;
      this.bolts.push({ x1: fx, y1: fy, x2: t.x, y2: t.y, life: 0.18 });
      this.hitEnemy(t, 1, t.x - fx, t.y - fy);
      fx = t.x; fy = t.y;
    }
  }

  // ---- Enemy bullets / pickups --------------------------------------------

  private updateEBullets(dt: number): void {
    this.ebullets.forEach((b) => {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -20 || b.x > ARENA_W + 20 || b.y < -20 || b.y > ARENA_H + 20) {
        b.active = false;
        return;
      }
      if (this.invuln <= 0 && this.dashT <= 0 && circlesOverlap(b.x, b.y, EBULLET_R, this.px, this.py, PLAYER_R)) {
        b.active = false;
        this.playerHit();
      }
    });
  }

  private updatePickups(dt: number): void {
    const mag = this.stats().magnetRadius;
    this.pickups.forEach((p) => {
      if (mag > 0 && dist2(p.x, p.y, this.px, this.py) < mag * mag) {
        const a = angleTo(p.x, p.y, this.px, this.py);
        p.vx += Math.cos(a) * 600 * dt;
        p.vy += Math.sin(a) * 600 * dt;
      }
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (circlesOverlap(p.x, p.y, 6, this.px, this.py, PLAYER_R + 4)) {
        p.active = false;
        this.score += killScore(p.value, this.mult);
        this.ctx?.audio.play(SFX.pickup);
      }
    });
  }

  // ---- Damage / death ------------------------------------------------------

  private playerHit(): void {
    this.hull -= 1;
    this.mult = multiplierAfterHit(this.mult);
    this.invuln = INVULN_AFTER_HIT;
    this.explode(this.px, this.py, hex(COLORS.joystick), 1);
    if (!this.reduced) this.cameras.main.shake(180, 0.012);
    this.ctx?.audio.play(SFX.boomSmall);
    if (this.hull <= 1 && this.hull > 0) {
      this.warnPulse = 1;
      this.ctx?.audio.play(SFX.warn);
    }
    if (this.hull <= 0) this.die();
  }

  private die(): void {
    if (this.phase === 'dead') return;
    this.explode(this.px, this.py, hex(COLORS.phosphor), 3);
    if (this.attract) {
      this.resetRun();
      return;
    }
    this.phase = 'dead';
    this.over = true;
    this.ctx?.audio.play(SFX.gameover);
    const stats = { wave: this.wave, accuracy: accuracyPct({ shotsFired: this.shotsFired, shotsHit: this.shotsHit }) };
    this.onGameOver?.(this.score, stats);
    this.publish();
  }

  private resetRun(): void {
    this.build = {};
    this.score = 0;
    this.mult = MULT_MIN;
    this.hull = this.stats().hullMax;
    this.wave = 0;
    this.over = false;
    this.phase = 'spawning';
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.bullets.clear();
    this.ebullets.clear();
    this.enemies.clear();
    this.particles.clear();
    this.pickups.clear();
    this.px = ARENA_W / 2;
    this.py = ARENA_H / 2;
    this.startWave(1);
  }

  // ---- Wave cleared / upgrades --------------------------------------------

  private onWaveCleared(): void {
    const secs = (this.time.now - this.waveStart) / 1000;
    this.score += waveClearBonus(this.wave, secs);
    this.ctx?.audio.play(SFX.waveClear);
    this.ebullets.clear();
    this.offered = pickThree(this.build, this.rng);
    this.cardAnim = 0;
    this.phase = 'upgrade';
    this.banner('Wave clear', 900);
  }

  private chooseUpgrade(i: number): void {
    if (this.phase !== 'upgrade') return;
    const id = this.offered[i];
    if (!id) return;
    const before = this.hull;
    this.build = applyUpgrade(this.build, id);
    // hull upgrade also repairs
    if (id === 'hull') this.hull = Math.min(this.stats().hullMax, before + 2);
    this.hull = Math.min(this.hull, this.stats().hullMax);
    this.ctx?.audio.play(SFX.upgrade);
    this.startWave(this.wave + 1);
  }

  private pickCardAt(x: number, y: number): void {
    const rects = this.cardRects();
    for (let i = 0; i < rects.length; i++) {
      if (this.inRect(x, y, rects[i]!)) {
        this.chooseUpgrade(i);
        return;
      }
    }
  }

  private cardRects(): Array<{ x: number; y: number; w: number; h: number }> {
    const w = 150;
    const h = 170;
    const gap = 20;
    const totalW = w * 3 + gap * 2;
    const x0 = (LOGICAL_W - totalW) / 2;
    const y = (LOGICAL_H - h) / 2;
    return [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y, w, h }));
  }

  // ---- FX ------------------------------------------------------------------

  private updateFx(dt: number): void {
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const gh = this.ghosts[i]!;
      gh.life -= dt;
      if (gh.life <= 0) this.ghosts.splice(i, 1);
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]!;
      b.life -= dt;
      if (b.life <= 0) this.bolts.splice(i, 1);
    }
    for (let i = this.shocks.length - 1; i >= 0; i--) {
      const s = this.shocks[i]!;
      s.life -= dt;
      s.r += dt * 260;
      if (s.life <= 0) this.shocks.splice(i, 1);
    }
    if (this.warnPulse > 0) this.warnPulse = Math.max(0, this.warnPulse - dt * 1.5);
    this.particles.forEach((p) => {
      p.life -= dt;
      if (p.life <= 0) { p.active = false; return; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.angle += p.spin * dt;
    });
  }

  private explode(x: number, y: number, color: number, size: number): void {
    const count = this.lowFx ? [6, 9, 12, 16][size]! : [10, 16, 24, 40][size]!;
    this.spawnParticles(x, y, count, color, 120 + size * 60, undefined, 0.5 + size * 0.2);
    this.shocks.push({ x, y, r: 6, life: 0.4 + size * 0.1 });
    if (!this.reduced && size >= 1) this.cameras.main.shake(80 + size * 60, 0.004 + size * 0.004);
    const sfx = size >= 3 ? SFX.boomBig : size >= 1 ? SFX.boomMed : SFX.boomSmall;
    this.ctx?.audio.play(sfx);
  }

  private spawnParticles(
    x: number,
    y: number,
    count: number,
    color: number,
    speed: number,
    dir: number | undefined,
    life: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles.spawn();
      if (!p) break;
      const a = dir !== undefined ? dir + (this.rng() - 0.5) * 0.8 : this.rng() * Math.PI * 2;
      const sp = speed * (0.4 + this.rng() * 0.8);
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.life = life * (0.6 + this.rng() * 0.6);
      p.maxLife = p.life;
      p.angle = a;
      p.spin = (this.rng() - 0.5) * 8;
      p.len = 4 + this.rng() * 6;
      p.color = color;
    }
  }

  // ---- Render --------------------------------------------------------------

  private render(): void {
    const g = this.g;
    g.clear();
    this.drawGrid(g);

    // pickups
    this.pickups.forEach((p) => {
      g.lineStyle(2, hex(COLORS.marquee), 1);
      g.strokeCircle(p.x, p.y, 5);
    });

    // enemy bullets
    g.fillStyle(hex(COLORS.joystick), 1);
    this.ebullets.forEach((b) => g.fillCircle(b.x, b.y, EBULLET_R));

    // bullets (with short trail)
    this.bullets.forEach((b) => {
      g.lineStyle(Math.max(1.5, b.r * 0.8), hex(COLORS.ticket), 0.5);
      g.lineBetween(b.px, b.py, b.x, b.y);
      g.fillStyle(hex(COLORS.phosphor), 1);
      g.fillCircle(b.x, b.y, b.r);
    });

    // particles
    this.particles.forEach((p) => {
      const t = Math.max(0, p.life / p.maxLife);
      g.lineStyle(2, p.color, t);
      const dx = Math.cos(p.angle) * p.len;
      const dy = Math.sin(p.angle) * p.len;
      g.lineBetween(p.x - dx, p.y - dy, p.x + dx, p.y + dy);
    });

    // chain bolts
    for (const b of this.bolts) {
      g.lineStyle(2, hex(COLORS.phosphor), Math.min(1, b.life * 5));
      g.lineBetween(b.x1, b.y1, b.x2, b.y2);
    }

    // enemies
    this.enemies.forEach((e) => this.drawEnemy(g, e));

    // dash ghosts
    for (const gh of this.ghosts) {
      g.lineStyle(2, hex(COLORS.player), Math.min(0.5, gh.life));
      g.strokeCircle(gh.x, gh.y, PLAYER_R);
    }

    // player
    this.drawPlayer(g);

    this.drawHud();
  }

  private drawGrid(g: Phaser.GameObjects.Graphics): void {
    const cam = this.cameras.main;
    const x0 = Math.floor(cam.scrollX / GRID_CELL) * GRID_CELL;
    const y0 = Math.floor(cam.scrollY / GRID_CELL) * GRID_CELL;
    g.lineStyle(1, hex(COLORS.grid), 1);
    for (let x = x0; x <= cam.scrollX + LOGICAL_W; x += GRID_CELL) {
      g.lineBetween(x, cam.scrollY, x, cam.scrollY + LOGICAL_H);
    }
    for (let y = y0; y <= cam.scrollY + LOGICAL_H; y += GRID_CELL) {
      g.lineBetween(cam.scrollX, y, cam.scrollX + LOGICAL_W, y);
    }
    // explosion shock rings warp/brighten the grid locally
    for (const s of this.shocks) {
      g.lineStyle(2, hex(COLORS.gridWarp), Math.min(0.8, s.life * 2));
      g.strokeCircle(s.x, s.y, s.r);
    }
    // arena border
    g.lineStyle(2, hex(COLORS.bezel ?? '#33204f'), 1);
    g.strokeRect(0, 0, ARENA_W, ARENA_H);
  }

  private drawPlayer(g: Phaser.GameObjects.Graphics): void {
    const blink = this.invuln > 0 && Math.floor(this.time.now / 60) % 2 === 0;
    const col = blink ? hex(COLORS.ticket) : hex(COLORS.player);
    g.lineStyle(2, col, 1);
    // triangle ship pointing at aim
    const a = this.aim;
    const pts = [0, 2.5, -2.5].map((o) => a + o);
    const r = PLAYER_R;
    g.beginPath();
    g.moveTo(this.px + Math.cos(pts[0]!) * (r + 4), this.py + Math.sin(pts[0]!) * (r + 4));
    g.lineTo(this.px + Math.cos(pts[1]!) * r, this.py + Math.sin(pts[1]!) * r);
    g.lineTo(this.px + Math.cos(pts[2]!) * r, this.py + Math.sin(pts[2]!) * r);
    g.closePath();
    g.strokePath();
    // drones
    const drones = this.stats().drones;
    for (let i = 0; i < drones; i++) {
      const pos = this.dronePos(i, drones);
      g.lineStyle(2, hex(COLORS.marquee), 1);
      g.strokeCircle(pos.x, pos.y, 4);
    }
  }

  private drawEnemy(g: Phaser.GameObjects.Graphics, e: Enemy): void {
    const flash = e.flash > 0;
    const col = flash ? 0xffffff : hex(this.enemyColor(e));
    g.lineStyle(e.elite || e.state === 99 ? 3 : 2, col, 1);
    const r = e.r;
    const x = e.x;
    const y = e.y;
    if (e.state === 99) {
      // boss: big rotating hexagon with inner ring
      this.polygon(g, x, y, r, 6, e.t * 0.6);
      g.lineStyle(2, hex(COLORS.joystick), 1);
      this.polygon(g, x, y, r * 0.55, 6, -e.t);
      return;
    }
    switch (e.type) {
      case 'drifter':
        this.polygon(g, x, y, r, 3, e.t);
        break;
      case 'darter': {
        // diamond; brighten during telegraph
        if (e.state === 0) { g.lineStyle(2, hex(COLORS.ticket), 0.6 + Math.sin(e.t * 20) * 0.4); }
        this.polygon(g, x, y, r, 4, e.angle);
        break;
      }
      case 'splitter':
        this.polygon(g, x, y, r, 5, e.t * 0.5);
        break;
      case 'orbiter':
        g.strokeCircle(x, y, r);
        g.lineBetween(x - r, y, x + r, y);
        break;
      case 'shielder': {
        this.polygon(g, x, y, r, 4, 0);
        // shield arc toward player
        const facing = angleTo(x, y, this.px, this.py);
        g.lineStyle(3, hex('#bfefff'), 1);
        g.beginPath();
        g.arc(x, y, r + 5, facing - 1.1, facing + 1.1);
        g.strokePath();
        break;
      }
      case 'spawner':
        this.polygon(g, x, y, r, 6, e.t * 0.3);
        g.strokeCircle(x, y, r * 0.5);
        break;
    }
    if (e.elite) {
      g.lineStyle(1, hex(COLORS.marquee), 0.6);
      g.strokeCircle(x, y, r + 4);
    }
  }

  private polygon(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, sides: number, rot: number): void {
    g.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = rot + (i / sides) * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();
  }

  private drawBossBar(e: Enemy): void {
    const hud = this.hudG;
    const w = LOGICAL_W - 80;
    const x = 40;
    const y = LOGICAL_H - 20;
    hud.fillStyle(0x000000, 0.4);
    hud.fillRect(x, y, w, 8);
    hud.fillStyle(hex(COLORS.joystick), 1);
    hud.fillRect(x, y, w * clamp(e.hp / this.bossMaxHp, 0, 1), 8);
  }

  // ---- HUD -----------------------------------------------------------------

  private drawHud(): void {
    const hud = this.hudG;
    hud.clear();

    // hull pips
    const max = this.stats().hullMax;
    for (let i = 0; i < max; i++) {
      const x = LOGICAL_W - 18 - i * 16;
      const filled = i < this.hull;
      hud.lineStyle(2, hex(COLORS.joystick), 1);
      if (filled) { hud.fillStyle(hex(COLORS.joystick), 1); hud.fillRect(x, 10, 11, 11); }
      else hud.strokeRect(x, 10, 11, 11);
    }

    // build strip (initials + level) bottom-left
    const ids = Object.keys(this.build) as UpgradeId[];
    // (kept minimal; drawn as text would need many objects — show as small bars)
    let bx = 12;
    const by = LOGICAL_H - 16;
    for (const id of ids) {
      const lvl = this.build[id] ?? 0;
      hud.fillStyle(hex(COLORS.phosphor), 0.9);
      for (let l = 0; l < lvl; l++) hud.fillRect(bx + l * 4, by, 3, 8);
      bx += Math.max(16, lvl * 4 + 8);
    }

    // low-hull warning vignette
    if (this.warnPulse > 0 || (this.hull <= 1 && !this.over && this.phase !== 'dead')) {
      const a = (this.warnPulse > 0 ? this.warnPulse : 0.3) * (0.5 + Math.sin(this.time.now / 120) * 0.5);
      hud.lineStyle(14, hex(COLORS.joystick), Math.min(0.5, a));
      hud.strokeRect(7, 7, LOGICAL_W - 14, LOGICAL_H - 14);
    }

    // touch sticks
    if (this.stickL) this.drawStick(hud, this.stickL, COLORS.phosphor);
    if (this.stickR) this.drawStick(hud, this.stickR, COLORS.marquee);

    // texts
    this.tScore.setText(`${this.score.toLocaleString('en-US')}`);
    this.tMult.setText(`x${this.mult.toFixed(1)}`);
    this.tWave.setText(this.phase === 'upgrade' ? 'Choose an upgrade' : `Wave ${this.wave}`);

    // boss bar
    if (this.boss && this.boss.active) this.drawBossBar(this.boss);

    // upgrade cards
    if (this.phase === 'upgrade') this.drawCards(hud);
    else this.hideCards();
  }

  private drawStick(hud: Phaser.GameObjects.Graphics, s: { ox: number; oy: number; x: number; y: number }, color: string): void {
    hud.lineStyle(2, hex(color), 0.5);
    hud.strokeCircle(s.ox, s.oy, 44);
    const dx = s.x - s.ox;
    const dy = s.y - s.oy;
    const m = Math.hypot(dx, dy);
    const cl = m > 44 ? 44 / m : 1;
    hud.fillStyle(hex(color), 0.5);
    hud.fillCircle(s.ox + dx * cl, s.oy + dy * cl, 18);
  }

  private drawCards(hud: Phaser.GameObjects.Graphics): void {
    const rects = this.cardRects();
    const scale = this.cardAnim;
    rects.forEach((r, i) => {
      const id = this.offered[i];
      if (!id) return;
      const def = UPGRADES[id];
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const w = r.w * scale;
      const h = r.h * scale;
      hud.fillStyle(hex(COLORS.bezel ?? '#33204f'), 0.96);
      hud.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);
      hud.lineStyle(2, hex(COLORS.marquee), 1);
      hud.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);

      let t = this.cardTexts[i];
      if (!t) {
        t = this.add
          .text(0, 0, '', { fontFamily: "'Chakra Petch'", fontSize: '15px', color: COLORS.ticket, align: 'center', wordWrap: { width: r.w - 20 } })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(6);
        this.cardTexts[i] = t;
      }
      const lvl = this.build[id] ?? 0;
      t.setText(`${i + 1}.  ${def.name}\n\n${def.desc}\n\nLv ${lvl} / ${def.max}`)
        .setPosition(cx, cy)
        .setAlpha(scale)
        .setVisible(true);
    });
  }

  private hideCards(): void {
    for (const t of this.cardTexts) t?.setVisible(false);
  }

  // ---- Telemetry -----------------------------------------------------------

  private publish(): void {
    if (this.attract) return;
    (window as unknown as { __arcbolt?: Record<string, unknown> }).__arcbolt = {
      score: this.score,
      wave: this.wave,
      hull: this.hull,
      mult: this.mult,
      over: this.over,
      phase: this.phase,
      enemies: this.enemies.activeCount(),
      bullets: this.bullets.activeCount(),
      particles: this.particles.activeCount(),
      ebullets: this.ebullets.activeCount(),
      touch: { left: !!this.stickL, right: !!this.stickR },
      pools: {
        bullets: this.bullets.capacity,
        enemies: this.enemies.capacity,
        particles: this.particles.capacity,
        ebullets: this.ebullets.capacity,
        pickups: this.pickups.capacity,
      },
    };
  }
}
