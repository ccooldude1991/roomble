/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Canonical site URL, injected by the deploy workflow. */
  readonly SITE_URL?: string;
  /** Base path for the site ("/" or "/<repo>/"), injected by the deploy workflow. */
  readonly BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ZzFX ships no type declarations. We only use ZZFX.play(...params) and the
// volume / audioContext fields.
declare module 'zzfx' {
  export const ZZFX: {
    volume: number;
    sampleRate: number;
    audioContext: AudioContext;
    play(...params: number[]): AudioBufferSourceNode;
  };
  export function zzfx(...params: number[]): AudioBufferSourceNode;
}
