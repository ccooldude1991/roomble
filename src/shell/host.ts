/*
 * Game host (the shell controller).
 *
 * Owns a single game's lifecycle on a game page and all the cross-cutting
 * concerns so individual games don't repeat them:
 *   - lazy-loads the GameModule only when the player presses Play
 *   - builds the GameContext (audio, namespaced save, leaderboard, emit)
 *   - pauses on tab hide / window blur; resumes on return (unless the player
 *     paused manually)
 *   - fullscreen, rotate prompt, scroll/zoom lock during active play
 *   - best-score persistence, the pause menu and the game-over flow
 *   - restart via remount (Play again in well under a second, no reload)
 *
 * The page provides the styled DOM (see GameHost.astro); this class wires it.
 */
import type {
  GameModule,
  GameInstance,
  GameContext,
  GameEvent,
  GameMeta,
} from '../games/types';
import { audio } from '../services/audio';
import { createSave } from '../services/save';
import { leaderboard } from '../services/leaderboard';
import { ads } from '../services/ads';
import { analytics } from '../services/analytics';
import { isTouch } from '../services/input';

export interface HostElements {
  cabinet: HTMLElement; // fullscreen target
  mount: HTMLElement; // where the game renders
  screen: HTMLElement; // CRT screen (gesture lock, rotate prompt live here)
  titleOverlay: HTMLElement; // idle screen with Play
  bestReadouts: HTMLElement[]; // show best score (text content)
  pauseModal: HTMLDialogElement;
  gameoverModal: HTMLDialogElement;
  howtoModal: HTMLDialogElement | null;
  rotate: HTMLElement | null;
  goScore: HTMLElement;
  goBest: HTMLElement;
  goNewBest: HTMLElement;
}

export interface HostOptions {
  slug: string;
  meta: GameMeta;
  loader: () => Promise<GameModule | { default: GameModule }>;
  els: HostElements;
}

type State = 'idle' | 'loading' | 'playing' | 'paused' | 'over';

const BEST_KEY = 'best';
const HOWTO_KEY = 'howto-seen';

export class GameHost {
  #opts: HostOptions;
  #els: HostElements;
  #save: ReturnType<typeof createSave>;
  #module: GameModule | null = null;
  #instance: GameInstance | null = null;
  #attractInstance: GameInstance | null = null;
  #state: State = 'idle';
  #best: number;
  #systemPaused = false; // paused by blur/hidden/rotation, not the player
  #rotationBlocked = false;
  #reducedMotion: boolean;
  #disposers: Array<() => void> = [];

  constructor(opts: HostOptions) {
    this.#opts = opts;
    this.#els = opts.els;
    this.#save = createSave(opts.slug);
    this.#best = this.#save.get<number>(BEST_KEY, 0);
    this.#reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  init(): void {
    this.#renderBest();

    const onVisibility = () => {
      if (document.hidden) this.#autoPause();
      else this.#autoResume();
    };
    const onBlur = () => this.#autoPause();
    const onFocus = () => this.#autoResume();
    const onOrient = () => this.#checkOrientation();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('resize', onOrient);
    window.addEventListener('orientationchange', onOrient);
    this.#disposers.push(
      () => document.removeEventListener('visibilitychange', onVisibility),
      () => window.removeEventListener('blur', onBlur),
      () => window.removeEventListener('focus', onFocus),
      () => window.removeEventListener('resize', onOrient),
      () => window.removeEventListener('orientationchange', onOrient),
    );

    this.#checkOrientation();
    void this.#startAttract();
  }

  /** Run the game's self-playing demo behind the idle title ("attract mode"). */
  async #startAttract(): Promise<void> {
    if (this.#state !== 'idle' || this.#attractInstance) return;
    try {
      if (!this.#module) {
        const mod = await this.#opts.loader();
        this.#module = 'default' in mod ? mod.default : mod;
      }
      if (this.#state !== 'idle' || !this.#module.attract) return;
      const inst = await this.#module.attract(this.#els.mount);
      if (this.#state !== 'idle') {
        inst.destroy();
        return;
      }
      this.#attractInstance = inst;
    } catch (err) {
      console.error('[shell] attract failed', err);
    }
  }

  #stopAttract(): void {
    this.#attractInstance?.destroy();
    this.#attractInstance = null;
  }

  // ---- Lifecycle -----------------------------------------------------------

  async start(): Promise<void> {
    if (this.#state === 'loading' || this.#state === 'playing') return;

    // First-launch how-to, once.
    if (this.#els.howtoModal && !this.#save.get<boolean>(HOWTO_KEY, false)) {
      this.#save.set(HOWTO_KEY, true);
      this.showHowTo(() => void this.start());
      return;
    }

    void audio.unlock();
    this.#state = 'loading';
    this.#els.titleOverlay.toggleAttribute('data-hidden', true);
    this.#stopAttract();

    try {
      if (!this.#module) {
        const mod = await this.#opts.loader();
        this.#module = 'default' in mod ? mod.default : mod;
      }
      this.#instance = await this.#module.mount(this.#els.mount, this.#context());
      this.#state = 'playing';
      this.#onStart();
    } catch (err) {
      console.error('[shell] failed to start game', err);
      this.#state = 'idle';
      this.#els.titleOverlay.toggleAttribute('data-hidden', false);
    }
  }

  async restart(): Promise<void> {
    this.#closeDialogs();
    this.#instance?.destroy();
    this.#instance = null;
    this.#state = 'idle';
    await this.start();
  }

  pause(): void {
    if (this.#state !== 'playing') return;
    this.#instance?.pause();
    this.#state = 'paused';
    this.#unlockScroll();
    if (!this.#els.pauseModal.open) this.#els.pauseModal.showModal();
  }

  resume(): void {
    if (this.#state !== 'paused') return;
    if (this.#rotationBlocked) return;
    this.#closeDialogs();
    this.#instance?.resume();
    this.#state = 'playing';
    this.#lockScroll();
  }

  quit(): void {
    this.#closeDialogs();
    this.#instance?.destroy();
    this.#instance = null;
    this.#state = 'idle';
    this.#unlockScroll();
    this.#els.titleOverlay.toggleAttribute('data-hidden', false);
    void this.#startAttract();
  }

  toggleFullscreen(): void {
    const el = this.#els.cabinet;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void el.requestFullscreen?.().catch(() => {});
    }
  }

  showHowTo(after?: () => void): void {
    const m = this.#els.howtoModal;
    if (!m) {
      after?.();
      return;
    }
    m.showModal();
    if (after) {
      m.addEventListener('close', () => after(), { once: true });
    }
  }

  destroy(): void {
    this.#instance?.destroy();
    this.#instance = null;
    this.#stopAttract();
    this.#unlockScroll();
    for (const d of this.#disposers) d();
    this.#disposers = [];
  }

  // ---- Context + events ----------------------------------------------------

  #context(): GameContext {
    return {
      audio,
      save: this.#save,
      leaderboard,
      reducedMotion: this.#reducedMotion,
      emit: (e: GameEvent) => this.#onEvent(e),
    };
  }

  #onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'start':
        this.#onStart();
        break;
      case 'gameover':
        this.#onGameOver(e.score);
        break;
      // 'ready' | 'pause' | 'resume' | 'milestone': informational for now.
    }
  }

  #onStart(): void {
    ads.noteGameStart();
    analytics.track({ name: 'game_start', slug: this.#opts.slug });
    this.#lockScroll();
  }

  #onGameOver(score: number): void {
    this.#state = 'over';
    this.#unlockScroll();
    const isNewBest = score > this.#best;
    if (isNewBest) {
      this.#best = score;
      this.#save.set(BEST_KEY, score);
      this.#renderBest();
    }
    analytics.track({ name: 'game_over', slug: this.#opts.slug, score });
    void leaderboard.submit(score);

    this.#els.goScore.textContent = score.toLocaleString('en-US');
    this.#els.goBest.textContent = this.#best.toLocaleString('en-US');
    this.#els.goNewBest.toggleAttribute('data-show', isNewBest);
    this.#els.gameoverModal.showModal();

    // Interstitial breaks never block the Play again path beyond the break itself.
    void ads.showInterstitial();
  }

  // ---- Pause automation ----------------------------------------------------

  #autoPause(): void {
    if (this.#state !== 'playing') return;
    this.#instance?.pause();
    this.#state = 'paused';
    this.#systemPaused = true;
    this.#unlockScroll();
  }

  #autoResume(): void {
    if (this.#state === 'paused' && this.#systemPaused && !this.#rotationBlocked) {
      this.#systemPaused = false;
      this.#instance?.resume();
      this.#state = 'playing';
      this.#lockScroll();
    }
  }

  // ---- Orientation ---------------------------------------------------------

  #checkOrientation(): void {
    const want = this.#opts.meta.orientation;
    const rotateEl = this.#els.rotate;
    if (!rotateEl || want === 'any' || !isTouch()) return;

    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    const mismatch = (want === 'landscape' && isPortrait) || (want === 'portrait' && !isPortrait);

    this.#rotationBlocked = mismatch;
    rotateEl.toggleAttribute('data-show', mismatch);

    if (mismatch) {
      if (this.#state === 'playing') this.#autoPause();
    } else {
      this.#autoResume();
    }
  }

  // ---- Scroll / zoom lock --------------------------------------------------

  #preventTouch = (e: TouchEvent): void => {
    if (e.touches.length > 1) e.preventDefault(); // pinch-zoom
  };
  #preventGesture = (e: Event): void => e.preventDefault();

  #lockScroll(): void {
    document.documentElement.classList.add('is-playing');
    this.#els.screen.style.touchAction = 'none';
    this.#els.screen.addEventListener('touchmove', this.#preventTouch, { passive: false });
    this.#els.screen.addEventListener('gesturestart', this.#preventGesture);
  }

  #unlockScroll(): void {
    document.documentElement.classList.remove('is-playing');
    this.#els.screen.style.touchAction = '';
    this.#els.screen.removeEventListener('touchmove', this.#preventTouch);
    this.#els.screen.removeEventListener('gesturestart', this.#preventGesture);
  }

  // ---- UI helpers ----------------------------------------------------------

  #renderBest(): void {
    const text = this.#best.toLocaleString('en-US');
    for (const el of this.#els.bestReadouts) el.textContent = text;
  }

  #closeDialogs(): void {
    if (this.#els.pauseModal.open) this.#els.pauseModal.close();
    if (this.#els.gameoverModal.open) this.#els.gameoverModal.close();
  }
}
