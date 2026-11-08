/*
 * Arcbolt — GameModule entry point. Boots the Phaser scene and bridges it to the
 * shell. Phaser loads only here, via the registry's dynamic import.
 */
import Phaser from 'phaser';
import type { GameModule, GameInstance, GameContext } from '../types';
import { ArcboltScene } from './scene';
import { LOGICAL_W, LOGICAL_H, COLORS } from './config';

const meta: GameModule['meta'] = {
  slug: 'arcbolt',
  title: 'Arcbolt',
  tagline: 'Twin-stick arena shooter. Clear waves, pick upgrades, light it up.',
  description:
    'A twin-stick arena shooter in glowing vector style. Move and aim independently, survive waves of geometric enemies, and pick an upgrade after each one to build a ship that turns the arena into a light show.',
  howToPlay: [
    'Move around the bounded arena.',
    'Aim and fire independently; dash to escape.',
    'Clear each wave, then choose one of three upgrades.',
  ],
  controls: {
    desktop: ['WASD or arrows to move', 'Mouse to aim; hold click or F to auto-fire', 'Space / Shift to dash, P or Esc to pause'],
    mobile: ['Left thumb: floating move stick', 'Right thumb: aim and auto-fire', 'Dash button by the right stick'],
  },
  orientation: 'landscape',
  category: 'arcade',
};

function makeConfig(el: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: el,
    width: LOGICAL_W,
    height: LOGICAL_H,
    backgroundColor: COLORS.bg,
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
  game.scene.add('arcbolt', ArcboltScene, true, {
    ctx,
    attract: data.attract,
    onGameOver: ctx
      ? (score: number, stats: Record<string, number>) => ctx.emit({ type: 'gameover', score, stats })
      : undefined,
  });
  ctx?.emit({ type: 'ready' });

  return {
    pause() {
      if (game.scene.getScene('arcbolt')) game.scene.pause('arcbolt');
    },
    resume() {
      if (game.scene.getScene('arcbolt')) game.scene.resume('arcbolt');
    },
    destroy() {
      const win = window as unknown as { __arcbolt?: unknown };
      if (!data.attract) delete win.__arcbolt;
      game.destroy(true);
    },
  };
}

const Arcbolt: GameModule = {
  meta,
  async mount(el: HTMLElement, ctx: GameContext): Promise<GameInstance> {
    return boot(el, { ctx, attract: false });
  },
  async attract(el: HTMLElement): Promise<GameInstance> {
    return boot(el, { attract: true });
  },
};

export default Arcbolt;
