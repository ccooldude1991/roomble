/**
 * The game contract.
 *
 * Every game is a self-contained folder exporting a `GameModule`. The site shell
 * never reaches inside a game, and a game never touches the DOM outside the element
 * it is given.
 *
 * The service interfaces below are the minimal shapes a game may rely on. Their
 * real implementations live in `src/services` and are built in Phase 1; the
 * interfaces live here so the contract is complete and type-checks today.
 */

export interface GameMeta {
  /** URL slug, e.g. "stackdown". */
  slug: string;
  title: string;
  /** One line, shown on tiles. */
  tagline: string;
  /** 2-4 sentences, shown on the game page (also helps SEO/ad approval). */
  description: string;
  /** Short steps. */
  howToPlay: string[];
  controls: { desktop: string[]; mobile: string[] };
  orientation: 'any' | 'portrait' | 'landscape';
  category: 'arcade' | 'puzzle' | 'daily';
  daily?: boolean;
}

export type GameEvent =
  | { type: 'ready' }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'gameover'; score: number; stats?: Record<string, number> }
  | { type: 'milestone'; name: string };

/** ZzFX-backed audio. Real implementation in src/services/audio.ts (Phase 1). */
export interface AudioService {
  play(preset: unknown): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
}

/** Namespaced, versioned localStorage with safe fallbacks. src/services/save.ts (Phase 1). */
export interface SaveService {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

/** No-op until Phase 5, then Supabase-backed. src/services/leaderboard.ts. */
export interface LeaderboardService {
  submit(score: number, stats?: Record<string, number>): Promise<void>;
  enabled: boolean;
}

export interface GameContext {
  audio: AudioService;
  /** Already namespaced to this game. */
  save: SaveService;
  leaderboard: LeaderboardService;
  /** The shell listens (ads, analytics, best scores). */
  emit(event: GameEvent): void;
  reducedMotion: boolean;
}

export interface GameInstance {
  pause(): void;
  resume(): void;
  /** Must free all listeners, timers, audio, WebGL contexts. */
  destroy(): void;
}

export interface GameModule {
  meta: GameMeta;
  mount(el: HTMLElement, ctx: GameContext): Promise<GameInstance>;
  /** Self-playing demo for previews. */
  attract?(el: HTMLElement): Promise<GameInstance>;
}
