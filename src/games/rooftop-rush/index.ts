/*
 * Rooftop Rush — GameModule entry point. Boots the Phaser scene and bridges it to
 * the shell (pause/resume/destroy, game-over emit). Phaser loads only here, via
 * the registry's dynamic import on the game's own page.
 */
import Phaser from 'phaser';
import type { GameModule, GameInstance, GameContext } from '../types';
import { RooftopScene } from './scene';
import { LOGICAL_W, LOGICAL_H } from './config';

const meta: GameModule['meta'] = {
  slug: 'rooftop-rush',
  title: 'Rooftop Rush',
  tagline: 'Sprint the neon rooftops. Jump the gaps, slide the signs.',
  description:
    'A courier sprints across a neon city at night, leaping gaps, sliding under signs and grabbing packages. One button to play, with near-miss bonuses that reward risky lines — clear an obstacle by a hair for slow-mo and a rising multiplier. Bank packages to unlock trail colours.',
  howToPlay: [
    'You run automatically — keep going.',
    'Jump over gaps and low obstacles (hold to jump higher, tap again to double-jump).',
    'Slide under high signs. Clear things by a hair for a Close call bonus.',
  ],
  controls: {
    desktop: ['Space, Up or W to jump (hold for height)', 'Down or S to slide', 'P or Esc to pause'],
    mobile: ['Tap the right side to jump (hold for height)', 'Tap the left side to slide'],
  },
  // 'any' (not 'landscape') so portrait phones play letterboxed instead of being
  // blocked by a forced-rotation prompt; the scene shows a gentle rotate hint.
  orientation: 'any',
  category: 'arcade',
};

function makeConfig(el: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: el,
    width: LOGICAL_W,
    height: LOGICAL_H,
    backgroundColor: '#140a24',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    fps: { target: 60, min: 30 },
    banner: false,
    audio: { noAudio: true },
    render: { antialias: true, powerPreference: 'low-power' },
  };
}

function boot(el: HTMLElement, data: { ctx?: GameContext; attract: boolean }): GameInstance {
  const game = new Phaser.Game(makeConfig(el));
  const ctx = data.ctx;
  game.scene.add('rooftop-rush', RooftopScene, true, {
    ctx,
    attract: data.attract,
    onGameOver: ctx
      ? (score: number, stats: Record<string, number>) =>
          ctx.emit({ type: 'gameover', score, stats })
      : undefined,
  });
  ctx?.emit({ type: 'ready' });

  return {
    pause() {
      if (game.scene.getScene('rooftop-rush')) game.scene.pause('rooftop-rush');
    },
    resume() {
      if (game.scene.getScene('rooftop-rush')) game.scene.resume('rooftop-rush');
    },
    destroy() {
      game.destroy(true);
    },
  };
}

const RooftopRush: GameModule = {
  meta,
  async mount(el: HTMLElement, ctx: GameContext): Promise<GameInstance> {
    return boot(el, { ctx, attract: false });
  },
  async attract(el: HTMLElement): Promise<GameInstance> {
    return boot(el, { attract: true });
  },
};

export default RooftopRush;
