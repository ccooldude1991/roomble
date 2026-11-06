/*
 * Lightweight canvas particle system. Pre-allocated pool, no per-frame garbage.
 * Framework-agnostic: call update(dt) then draw(ctx). Under reduced motion,
 * burst() emits nothing.
 */
export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

export interface BurstOptions {
  count?: number;
  speed?: number;
  spread?: number; // 0..1, 1 = full circle
  angle?: number; // base direction, radians
  life?: number; // seconds
  size?: number;
  gravity?: number;
  colors?: string[];
}

export class Particles {
  #pool: Particle[];
  #reduced: boolean;

  constructor(max = 300, reducedMotion = false) {
    this.#reduced = reducedMotion;
    this.#pool = Array.from({ length: max }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 2,
      color: '#fff',
      gravity: 0,
    }));
  }

  burst(x: number, y: number, opts: BurstOptions = {}): void {
    if (this.#reduced) return;
    const count = opts.count ?? 12;
    const speed = opts.speed ?? 180;
    const spread = (opts.spread ?? 1) * Math.PI * 2;
    const base = opts.angle ?? 0;
    const life = opts.life ?? 0.6;
    const size = opts.size ?? 3;
    const gravity = opts.gravity ?? 0;
    const colors = opts.colors ?? ['#ffffff'];

    let emitted = 0;
    for (const p of this.#pool) {
      if (emitted >= count) break;
      if (p.active) continue;
      const a = base + (Math.random() - 0.5) * spread;
      const s = speed * (0.5 + Math.random() * 0.5);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.maxLife = life * (0.7 + Math.random() * 0.6);
      p.life = p.maxLife;
      p.size = size * (0.6 + Math.random() * 0.8);
      p.color = colors[(Math.random() * colors.length) | 0]!;
      p.gravity = gravity;
      emitted++;
    }
  }

  update(dt: number): void {
    for (const p of this.#pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.#pool) {
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const s = p.size * alpha;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    for (const p of this.#pool) p.active = false;
  }
}
