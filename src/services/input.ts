/*
 * Unified input helpers for games: keyboard, touch/pointer (tap + swipe) and
 * gamepad. These are primitives games compose; every helper returns a disposer
 * so the shell's destroy() can leave nothing listening.
 */

/** Keyboard state + edge callbacks, scoped to a target (default window). */
export class Keyboard {
  #down = new Set<string>();
  #onDown = new Map<string, Set<() => void>>();
  #target: EventTarget;

  constructor(target: EventTarget = window) {
    this.#target = target;
    this.#target.addEventListener('keydown', this.#handleDown as EventListener);
    this.#target.addEventListener('keyup', this.#handleUp as EventListener);
    window.addEventListener('blur', this.#clear);
  }

  #handleDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    this.#down.add(e.code);
    const cbs = this.#onDown.get(e.code);
    if (cbs) for (const cb of cbs) cb();
  };

  #handleUp = (e: KeyboardEvent): void => {
    this.#down.delete(e.code);
  };

  #clear = (): void => {
    this.#down.clear();
  };

  isDown(code: string): boolean {
    return this.#down.has(code);
  }

  /** Fire once per physical press of `code`. Returns a disposer. */
  onDown(code: string, cb: () => void): () => void {
    let set = this.#onDown.get(code);
    if (!set) {
      set = new Set();
      this.#onDown.set(code, set);
    }
    set.add(cb);
    return () => set?.delete(cb);
  }

  destroy(): void {
    this.#target.removeEventListener('keydown', this.#handleDown as EventListener);
    this.#target.removeEventListener('keyup', this.#handleUp as EventListener);
    window.removeEventListener('blur', this.#clear);
    this.#down.clear();
    this.#onDown.clear();
  }
}

export type SwipeDir = 'up' | 'down' | 'left' | 'right';

export interface GestureHandlers {
  onTap?: (x: number, y: number) => void;
  onSwipe?: (dir: SwipeDir) => void;
  /** Min travel in px to count as a swipe (default 30). */
  threshold?: number;
}

/** Tap + 4-way swipe detection on an element. Returns a disposer. */
export function onGesture(el: HTMLElement, h: GestureHandlers): () => void {
  const threshold = h.threshold ?? 30;
  let startX = 0;
  let startY = 0;
  let startT = 0;
  let active = false;

  const down = (e: PointerEvent) => {
    active = true;
    startX = e.clientX;
    startY = e.clientY;
    startT = performance.now();
  };

  const up = (e: PointerEvent) => {
    if (!active) return;
    active = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const dt = performance.now() - startT;

    if (adx < threshold && ady < threshold && dt < 500) {
      h.onTap?.(e.clientX, e.clientY);
      return;
    }
    if (Math.max(adx, ady) >= threshold) {
      if (adx > ady) h.onSwipe?.(dx > 0 ? 'right' : 'left');
      else h.onSwipe?.(dy > 0 ? 'down' : 'up');
    }
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', () => (active = false));

  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointerup', up);
  };
}

export interface GamepadSnapshot {
  connected: boolean;
  axes: readonly number[];
  buttons: readonly boolean[];
}

/** Read the first connected gamepad. Call once per frame; cheap and allocation-light. */
export function pollGamepad(deadzone = 0.2): GamepadSnapshot {
  const pads = navigator.getGamepads?.() ?? [];
  const pad = pads.find((p): p is Gamepad => p != null);
  if (!pad) return { connected: false, axes: [], buttons: [] };
  return {
    connected: true,
    axes: pad.axes.map((a) => (Math.abs(a) < deadzone ? 0 : a)),
    buttons: pad.buttons.map((b) => b.pressed),
  };
}

/** Does this device have a coarse (touch) pointer? Used to show touch controls. */
export function isTouch(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}
