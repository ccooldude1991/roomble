/*
 * Audio service — a thin wrapper over ZzFX (tiny, MIT).
 *
 * Sounds are defined as code presets: arrays of ZzFX parameters. Games pass a
 * preset to `play()`; a few shared UI presets live in SFX.
 *
 * Key behaviours:
 *  - The AudioContext is created lazily on the first user gesture ("unlock"),
 *    never at import time, so browsers don't log an autoplay warning.
 *  - Master volume and mute are centralised; mute persists across sessions.
 *  - Before unlock, play() is a safe no-op.
 */
import type { AudioService } from '../games/types';
import { appSave } from './save';

/** A ZzFX parameter array. See https://github.com/KilledByAPixel/ZzFX */
export type AudioPreset = number[];

/** Shared UI sounds, kept gentle and mixed low. */
export const SFX = {
  press: [0.7, 0, 220, 0.005, 0.02, 0.06, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.02] as AudioPreset,
  back: [0.7, 0, 160, 0.005, 0.03, 0.08, 1, 1.5, -20] as AudioPreset,
  toggle: [0.6, 0, 440, 0.005, 0.02, 0.05, 0, 1] as AudioPreset,
} satisfies Record<string, AudioPreset>;

const MUTE_KEY = 'muted';
const MASTER_VOLUME = 0.4;

type ZzfxModule = typeof import('zzfx');

class Audio implements AudioService {
  #muted = appSave.get<boolean>(MUTE_KEY, false);
  #zzfx: ZzfxModule | null = null;
  #unlocking: Promise<void> | null = null;
  #volume = MASTER_VOLUME;

  /** Create the audio context on the first gesture and resume it. */
  unlock(): Promise<void> {
    if (this.#zzfx) return Promise.resolve();
    if (this.#unlocking) return this.#unlocking;
    this.#unlocking = (async () => {
      if (typeof window === 'undefined') return;
      const mod = await import('zzfx');
      mod.ZZFX.volume = this.#muted ? 0 : this.#volume;
      try {
        await mod.ZZFX.audioContext.resume();
      } catch {
        /* resume can reject if still blocked; the next gesture retries */
      }
      this.#zzfx = mod;
    })();
    return this.#unlocking;
  }

  play(preset: AudioPreset): void {
    if (this.#muted || !this.#zzfx) return;
    try {
      this.#zzfx.ZZFX.play(...preset);
    } catch {
      /* never let a sound crash the game */
    }
  }

  setMuted(muted: boolean): void {
    this.#muted = muted;
    appSave.set(MUTE_KEY, muted);
    if (this.#zzfx) this.#zzfx.ZZFX.volume = muted ? 0 : this.#volume;
  }

  isMuted(): boolean {
    return this.#muted;
  }

  setVolume(v: number): void {
    this.#volume = Math.max(0, Math.min(1, v));
    if (this.#zzfx && !this.#muted) this.#zzfx.ZZFX.volume = this.#volume;
  }
}

/** Single shared audio service for the whole site. */
export const audio = new Audio();

/**
 * Wire unlock to the first user gesture. Safe to call multiple times; listeners
 * remove themselves after the first fire. No-op during SSR.
 */
export function installAudioUnlock(): void {
  if (typeof window === 'undefined') return;
  const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart'];
  const onGesture = () => {
    void audio.unlock();
    for (const e of events) window.removeEventListener(e, onGesture);
  };
  for (const e of events) window.addEventListener(e, onGesture, { once: false, passive: true });
}
