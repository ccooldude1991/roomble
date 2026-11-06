/*
 * cabinet-test — a tiny built-in game to verify the shell.
 *
 * Tap/click the bouncing ball to score; each hit speeds it up; the run ends when
 * a 30-second timer expires. It implements the full GameModule contract
 * (mount / pause / resume / destroy and attract) and exercises the shared juice
 * utilities, so navigating away and back must leave nothing running.
 *
 * Not shown on the public floor (hidden in the registry).
 */
import type { GameModule, GameInstance, GameContext } from '../types';
import { Shaker, Particles, Popups, prefersReducedMotion } from '../../juice';
import { SFX } from '../../services/audio';

const LW = 360;
const LH = 480;
const RUN_SECONDS = 30;

const meta: GameModule['meta'] = {
  slug: 'cabinet-test',
  title: 'Cabinet Test',
  tagline: 'Shell check: tap the ball before the timer runs out.',
  description:
    'A tiny built-in game used to verify the site shell — mounting and teardown, pause on blur, fullscreen, best-score persistence and the game-over flow. Not part of the public arcade.',
  howToPlay: [
    'Tap or click the moving ball to score.',
    'Each hit makes it a little faster.',
    'Rack up points before the timer runs out.',
  ],
  controls: {
    desktop: ['Click the ball', 'P or Esc to pause'],
    mobile: ['Tap the ball', 'Use the pause button'],
  },
  orientation: 'any',
  category: 'arcade',
};

interface GameHandle extends GameInstance {}

function create(
  el: HTMLElement,
  opts: { ctx?: GameContext; autopilot?: boolean },
): GameHandle {
  const reduced = opts.ctx?.reducedMotion ?? prefersReducedMotion();
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.background = '#06040d';
  el.appendChild(canvas);
  const ctx2d = canvas.getContext('2d')!;

  const shaker = new Shaker({ maxOffset: 10, reducedMotion: reduced });
  const particles = new Particles(200, reduced);
  const popups = new Popups({ reducedMotion: reduced });

  // World state
  let score = 0;
  let timeLeft = RUN_SECONDS;
  const ball = { x: LW / 2, y: LH / 2, vx: 150, vy: 120, r: 26 };
  const autoCursor = { x: LW / 2, y: LH - 40 };

  // Fit (letterbox) — maps logical LWxLH into the canvas, centred.
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
    scale = Math.min((w * dpr) / LW, (h * dpr) / LH);
    offX = (canvas.width - LW * scale) / 2;
    offY = (canvas.height - LH * scale) / 2;
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  function toLogical(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const px = (clientX - rect.left) * dpr;
    const py = (clientY - rect.top) * dpr;
    return { x: (px - offX) / scale, y: (py - offY) / scale };
  }

  function hit(x: number, y: number): boolean {
    const dx = x - ball.x;
    const dy = y - ball.y;
    if (dx * dx + dy * dy <= (ball.r + 8) * (ball.r + 8)) {
      score += 1;
      const speed = 1.06;
      ball.vx *= speed;
      ball.vy *= speed;
      // nudge away from the tap
      const ang = Math.atan2(ball.y - y, ball.x - x) || Math.random() * Math.PI * 2;
      const mag = Math.hypot(ball.vx, ball.vy);
      ball.vx = Math.cos(ang) * mag;
      ball.vy = Math.sin(ang) * mag;
      shaker.add(0.5);
      particles.burst(ball.x, ball.y, {
        count: 14,
        speed: 160,
        colors: ['#4df0d0', '#fff4dc', '#ffc21a'],
      });
      popups.spawn('+1', ball.x, ball.y - ball.r, { color: '#4df0d0', size: 28 });
      opts.ctx?.audio.play(SFX.toggle);
      return true;
    }
    return false;
  }

  const onPointer = (e: PointerEvent) => {
    const p = toLogical(e.clientX, e.clientY);
    hit(p.x, p.y);
  };
  if (!opts.autopilot) canvas.addEventListener('pointerdown', onPointer);

  // Loop
  let raf = 0;
  let last = performance.now();
  let running = true;
  let over = false;

  function step(dt: number): void {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.x < ball.r) {
      ball.x = ball.r;
      ball.vx = Math.abs(ball.vx);
      shaker.add(0.15);
    }
    if (ball.x > LW - ball.r) {
      ball.x = LW - ball.r;
      ball.vx = -Math.abs(ball.vx);
      shaker.add(0.15);
    }
    if (ball.y < ball.r) {
      ball.y = ball.r;
      ball.vy = Math.abs(ball.vy);
      shaker.add(0.15);
    }
    if (ball.y > LH - ball.r) {
      ball.y = LH - ball.r;
      ball.vy = -Math.abs(ball.vy);
      shaker.add(0.15);
    }
  }

  function autopilot(dt: number): void {
    // ease the cursor toward the ball, tap when close
    autoCursor.x += (ball.x - autoCursor.x) * Math.min(1, dt * 3);
    autoCursor.y += (ball.y - autoCursor.y) * Math.min(1, dt * 3);
    if (Math.hypot(autoCursor.x - ball.x, autoCursor.y - ball.y) < ball.r) {
      hit(ball.x, ball.y);
    }
  }

  function frame(now: number): void {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    step(dt);
    if (opts.autopilot) autopilot(dt);
    particles.update(dt);
    popups.update(dt);

    if (!opts.autopilot && !over) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        over = true;
        running = false;
        opts.ctx?.emit({ type: 'gameover', score });
      }
    }

    draw();
    raf = requestAnimationFrame(frame);
  }

  function draw(): void {
    const { x: sx, y: sy } = shaker.update(1 / 60);
    ctx2d.setTransform(1, 0, 0, 1, 0, 0);
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    ctx2d.fillStyle = '#06040d';
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);

    ctx2d.translate(offX + sx, offY + sy);
    ctx2d.scale(scale, scale);

    // subtle floor grid
    ctx2d.strokeStyle = 'rgba(255,244,220,0.05)';
    ctx2d.lineWidth = 1;
    for (let gx = 0; gx <= LW; gx += 40) {
      ctx2d.beginPath();
      ctx2d.moveTo(gx, 0);
      ctx2d.lineTo(gx, LH);
      ctx2d.stroke();
    }

    // ball with phosphor glow
    ctx2d.save();
    ctx2d.shadowColor = '#4df0d0';
    ctx2d.shadowBlur = 24;
    ctx2d.fillStyle = '#4df0d0';
    ctx2d.beginPath();
    ctx2d.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.restore();

    particles.draw(ctx2d);
    popups.draw(ctx2d);

    // HUD
    ctx2d.fillStyle = '#4df0d0';
    ctx2d.font = "28px 'VT323', monospace";
    ctx2d.textBaseline = 'top';
    ctx2d.fillText(`SCORE ${score}`, 12, 10);
    if (!opts.autopilot) {
      ctx2d.textAlign = 'right';
      ctx2d.fillText(`${Math.ceil(timeLeft)}`, LW - 12, 10);
      ctx2d.textAlign = 'left';
    } else {
      ctx2d.fillStyle = 'rgba(255,244,220,0.5)';
      ctx2d.fillText('ATTRACT', LW - 92, 10);
    }
    ctx2d.textBaseline = 'alphabetic';
  }

  opts.ctx?.emit({ type: 'ready' });
  opts.ctx?.emit({ type: 'start' });
  last = performance.now();
  raf = requestAnimationFrame(frame);

  return {
    pause() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    },
    resume() {
      if (running || over) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointer);
      particles.clear();
      popups.clear();
      canvas.remove();
    },
  };
}

const CabinetTest: GameModule = {
  meta,
  async mount(el: HTMLElement, ctx: GameContext): Promise<GameInstance> {
    return create(el, { ctx });
  },
  async attract(el: HTMLElement): Promise<GameInstance> {
    return create(el, { autopilot: true });
  },
};

export default CabinetTest;
