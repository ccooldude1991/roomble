/*
 * Brickquake — GameModule entry point. Boots the Phaser scene and bridges it to
 * the shell. Phaser loads only here, via the registry's dynamic import.
 */
import Phaser from 'phaser';
import type { GameModule, GameInstance, GameContext } from '../types';
import { BrickquakeScene } from './scene';
import { LOGICAL_W, LOGICAL_H } from './config';

const meta: GameModule['meta'] = {
  slug: 'brickquake',
  title: 'Brickquake',
  tagline: 'Break the wall with ball and paddle. Mind the boss stage.',
  description:
    'Smash walls of bricks with a ball and paddle. Bricks crack, explode and chain-react, power-ups rain down to catch, and every fifth stage ends with a boss wall that fights back. The ball leaves the paddle based on where it hits, so you aim with the paddle.',
  howToPlay: [
    'Move the paddle to bounce the ball.',
    'Break every breakable brick to clear the stage.',
    "Catch power-ups; don't let the ball fall past the paddle (3 lives).",
  ],
  controls: {
    desktop: ['Mouse moves the paddle (or A / D, arrows)', 'Space or click to launch and fire lasers', 'P or Esc to pause'],
    mobile: ['Drag in the lower area to move the paddle', 'Tap to launch and to fire'],
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
    backgroundColor: '#07040e',
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
  game.scene.add('brickquake', BrickquakeScene, true, {
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
      if (game.scene.getScene('brickquake')) game.scene.pause('brickquake');
    },
    resume() {
      if (game.scene.getScene('brickquake')) game.scene.resume('brickquake');
    },
    destroy() {
      game.destroy(true);
    },
  };
}

const Brickquake: GameModule = {
  meta,
  async mount(el: HTMLElement, ctx: GameContext): Promise<GameInstance> {
    return boot(el, { ctx, attract: false });
  },
  async attract(el: HTMLElement): Promise<GameInstance> {
    return boot(el, { attract: true });
  },
};

export default Brickquake;
