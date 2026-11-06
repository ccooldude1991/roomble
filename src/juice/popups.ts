/*
 * Floating number/text popups for canvas games ("+100", "COMBO x3"). They rise
 * and fade. Under reduced motion they still appear but hold still and fade fast.
 */
import { easeOutCubic } from './easings';

interface Popup {
  active: boolean;
  text: string;
  x: number;
  y: number;
  startY: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class Popups {
  #pool: Popup[];
  #reduced: boolean;
  #font: string;

  constructor(opts: { max?: number; reducedMotion?: boolean; font?: string } = {}) {
    this.#reduced = opts.reducedMotion ?? false;
    this.#font = opts.font ?? "'VT323', monospace";
    this.#pool = Array.from({ length: opts.max ?? 24 }, () => ({
      active: false,
      text: '',
      x: 0,
      y: 0,
      startY: 0,
      life: 0,
      maxLife: 1,
      color: '#fff',
      size: 24,
    }));
  }

  spawn(
    text: string,
    x: number,
    y: number,
    opts: { color?: string; size?: number; life?: number } = {},
  ): void {
    const p = this.#pool.find((q) => !q.active);
    if (!p) return;
    p.active = true;
    p.text = text;
    p.x = x;
    p.y = y;
    p.startY = y;
    p.maxLife = opts.life ?? (this.#reduced ? 0.6 : 1);
    p.life = p.maxLife;
    p.color = opts.color ?? '#fff4dc';
    p.size = opts.size ?? 24;
  }

  update(dt: number): void {
    for (const p of this.#pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this.#pool) {
      if (!p.active) continue;
      const t = 1 - p.life / p.maxLife;
      const rise = this.#reduced ? 0 : easeOutCubic(t) * 40;
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      ctx.font = `${p.size}px ${this.#font}`;
      ctx.fillText(p.text, p.x, p.startY - rise);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  clear(): void {
    for (const p of this.#pool) p.active = false;
  }
}
