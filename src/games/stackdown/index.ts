/*
 * Stackdown — GameModule entry point. Boots a Phaser 3 game into the shell's
 * mount element and bridges the scene to the GameContext (pause/resume/destroy,
 * game-over emit). Phaser is only loaded here, which only runs on the client via
 * the registry's dynamic import.
 */
import Phaser from 'phaser';
import type { GameModule, GameInstance, GameContext } from '../types';
import { StackdownScene, LOGICAL_W, LOGICAL_H } from './scene';

const meta: GameModule['meta'] = {
  slug: 'stackdown',
  title: 'Stackdown',
  tagline: 'Stack the falling blocks, clear full rows, chase the combo.',
  description:
    'A falling-block puzzle about building up, then clearing big. Complete full rows to detonate them in a cascade, stack combos for a rising multiplier, and feel the tempo climb as you reach higher tiers. Charge the meter to trigger a Shockwave that blasts the bottom rows.',
  howToPlay: [
    'Move and rotate each falling piece.',
    'Fill a full row to clear it; clear four at once for a Stackdown.',
    "Keep the stack low — it's over when a new piece can't appear.",
  ],
  controls: {
    desktop: [
      'Left / Right to move, Up or X to rotate, Z to rotate back',
      'Down to soft drop, Space to hard drop',
      'C to hold, E for Shockwave, P or Esc to pause',
    ],
    mobile: [
      'Drag sideways to move, tap to rotate',
      'Swipe down to hard drop, drag down to soft drop',
      'Swipe up to hold; use the Hold / Shock buttons',
    ],
  },
  orientation: 'portrait',
  category: 'arcade',
};

function makeConfig(el: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: el,
    width: LOGICAL_W,
    height: LOGICAL_H,
    backgroundColor: '#06040d',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    fps: { target: 60, min: 30 },
    banner: false,
    audio: { noAudio: true }, // sound goes through our ZzFX audio service
    render: { antialias: true, powerPreference: 'low-power' },
  };
}

function boot(
  el: HTMLElement,
  data: { ctx?: GameContext; attract: boolean },
): GameInstance {
  const game = new Phaser.Game(makeConfig(el));
  const ctx = data.ctx;
  game.scene.add('stackdown', StackdownScene, true, {
    ctx,
    attract: data.attract,
    onGameOver: ctx
      ? (score: number, stats: Record<string, number>) =>
          ctx.emit({ type: 'gameover', score, stats })
      : undefined,
  });
  ctx?.emit({ type: 'ready' });

  const scene = () => game.scene.getScene('stackdown');

  return {
    pause() {
      const s = scene();
      if (s) game.scene.pause('stackdown');
    },
    resume() {
      const s = scene();
      if (s) game.scene.resume('stackdown');
    },
    destroy() {
      game.destroy(true);
    },
  };
}

const Stackdown: GameModule = {
  meta,
  async mount(el: HTMLElement, ctx: GameContext): Promise<GameInstance> {
    return boot(el, {
      ctx,
      attract: false,
    });
  },
  async attract(el: HTMLElement): Promise<GameInstance> {
    return boot(el, { attract: true });
  },
};

export default Stackdown;
