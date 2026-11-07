/*
 * The tier ladder — original celestial bodies — plus the code that draws each
 * one. Tier values are 1..13; a fusion makes tier t+1 and scores 2^(t+1).
 */
export interface Tier {
  name: string;
  color: string;
  glow: boolean;
}

export const TIERS: Record<number, Tier> = {
  1: { name: 'Dust', color: '#9b8c7a', glow: false },
  2: { name: 'Pebble', color: '#b4a079', glow: false },
  3: { name: 'Rock', color: '#8a8f98', glow: false },
  4: { name: 'Moonlet', color: '#c9c2b6', glow: false },
  5: { name: 'Moon', color: '#e6e6ea', glow: false },
  6: { name: 'Ice planet', color: '#8fd3ff', glow: false },
  7: { name: 'Rocky planet', color: '#d98a5b', glow: false },
  8: { name: 'Ringed planet', color: '#e0b870', glow: false },
  9: { name: 'Gas giant', color: '#d9815b', glow: false },
  10: { name: 'Sun', color: '#ffd23a', glow: true },
  11: { name: 'Blue giant', color: '#7fb3ff', glow: true },
  12: { name: 'Nebula', color: '#c06cff', glow: true },
  13: { name: 'Black hole', color: '#16101f', glow: true },
};

export const MAX_TIER = 13;
export const SUN_TIER = 10;

function hex(c: string): string {
  return c;
}

/**
 * Draw the celestial body for `tier` centred at (cx, cy) with the given radius.
 * `time` (seconds) drives subtle idle animation; `pop` (0..1+) scales it.
 */
export function drawTile(
  ctx: CanvasRenderingContext2D,
  tier: number,
  cx: number,
  cy: number,
  radius: number,
  time: number,
  pop = 1,
): void {
  const t = TIERS[tier];
  if (!t) return;
  const r = radius * pop;
  ctx.save();
  ctx.translate(cx, cy);

  if (t.glow) {
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 24;
  }

  if (tier <= 4) {
    // Rocky blob with a few bumps, slowly rotating.
    ctx.rotate(time * 0.3 + tier);
    ctx.fillStyle = hex(t.color);
    ctx.beginPath();
    const bumps = 7;
    for (let i = 0; i <= bumps; i++) {
      const a = (i / bumps) * Math.PI * 2;
      const rr = r * (0.82 + ((i * 37) % 10) / 40);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  } else if (tier === 5) {
    // Moon with craters.
    ctx.fillStyle = hex(t.color);
    circle(ctx, 0, 0, r);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    circle(ctx, -r * 0.3, -r * 0.2, r * 0.22);
    circle(ctx, r * 0.25, r * 0.3, r * 0.16);
    circle(ctx, r * 0.1, -r * 0.4, r * 0.1);
  } else if (tier === 8 || tier === 9) {
    // Planet with a ring (ringed planet / gas giant).
    ctx.fillStyle = hex(t.color);
    circle(ctx, 0, 0, r);
    if (tier === 9) {
      // bands
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(-r, -r * 0.3, r * 2, r * 0.18);
      ctx.fillRect(-r, r * 0.15, r * 2, r * 0.14);
    }
    ctx.save();
    ctx.rotate(-0.4 + Math.sin(time * 0.5) * 0.05);
    ctx.strokeStyle = tier === 8 ? '#fff4dc' : '#ffd9a0';
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.5, r * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (tier === 12) {
    // Nebula: soft overlapping clouds.
    for (let i = 0; i < 4; i++) {
      const a = time * 0.3 + (i * Math.PI) / 2;
      const g = ctx.createRadialGradient(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, 0, 0, 0, r);
      g.addColorStop(0, 'rgba(192,108,255,0.5)');
      g.addColorStop(1, 'rgba(192,108,255,0)');
      ctx.fillStyle = g;
      circle(ctx, 0, 0, r);
    }
  } else if (tier === 13) {
    // Black hole: dark disc + spinning accretion ring.
    ctx.save();
    ctx.rotate(time * 1.2);
    ctx.strokeStyle = '#4df0d0';
    ctx.lineWidth = Math.max(2, r * 0.18);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.3, r * 0.5, 0, 0, Math.PI * 1.6);
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.fillStyle = hex(t.color);
    circle(ctx, 0, 0, r);
  } else {
    // Default luminous sphere (Moon-ish, ice, rocky, Sun, blue giant).
    ctx.fillStyle = hex(t.color);
    circle(ctx, 0, 0, r);
    if (t.glow) {
      // corona shimmer
      ctx.globalAlpha = 0.3 + Math.sin(time * 3) * 0.1;
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 3;
      circle(ctx, 0, 0, r * 1.12, true);
      ctx.globalAlpha = 1;
    } else {
      // subtle terminator shading
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.arc(r * 0.35, 0, r, Math.PI * 0.5, Math.PI * 1.5, true);
      ctx.fill();
    }
  }

  ctx.restore();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stroke = false): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (stroke) ctx.stroke();
  else ctx.fill();
}
