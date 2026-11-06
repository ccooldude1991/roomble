/*
 * Namespaced, versioned localStorage with safe fallbacks.
 *
 * Games NEVER touch localStorage directly — they get a SaveService already
 * namespaced to the game (via the shell). Site chrome uses `appSave`.
 *
 * All values are stored under `roomble:<namespace>:<key>` as JSON wrapped with a
 * schema version, so a future format change can migrate or discard cleanly.
 * Every access is guarded: private mode, disabled storage or quota errors fall
 * back to an in-memory store for the session rather than throwing.
 */
import type { SaveService } from '../games/types';

const ROOT = 'roomble';

interface Envelope<T> {
  v: number;
  data: T;
}

function storageAvailable(): Storage | null {
  try {
    const s = globalThis.localStorage;
    const probe = `${ROOT}:__probe__`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function createSave(namespace: string, version = 1): SaveService {
  const store = storageAvailable();
  // Session fallback when localStorage is unavailable.
  const memory = new Map<string, string>();
  const prefix = `${ROOT}:${namespace}:`;

  const read = (k: string): string | null => {
    if (store) {
      try {
        return store.getItem(prefix + k);
      } catch {
        return memory.get(k) ?? null;
      }
    }
    return memory.get(k) ?? null;
  };

  const write = (k: string, raw: string): void => {
    if (store) {
      try {
        store.setItem(prefix + k, raw);
        return;
      } catch {
        /* fall through to memory */
      }
    }
    memory.set(k, raw);
  };

  return {
    get<T>(key: string, fallback: T): T {
      const raw = read(key);
      if (raw == null) return fallback;
      try {
        const env = JSON.parse(raw) as Envelope<T>;
        // Version mismatch: ignore the old value and use the fallback.
        if (!env || typeof env !== 'object' || env.v !== version) return fallback;
        return env.data;
      } catch {
        return fallback;
      }
    },

    set<T>(key: string, value: T): void {
      const env: Envelope<T> = { v: version, data: value };
      try {
        write(key, JSON.stringify(env));
      } catch {
        /* non-serialisable or quota: drop silently */
      }
    },

    remove(key: string): void {
      if (store) {
        try {
          store.removeItem(prefix + key);
        } catch {
          /* ignore */
        }
      }
      memory.delete(key);
    },
  };
}

/** App-wide settings (sound mute, first-launch flags, streaks). */
export const appSave = createSave('app');
