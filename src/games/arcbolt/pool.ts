/*
 * A fixed-capacity object pool. Objects are created once up front and reused, so
 * the live object count never grows across a run (a Done-when requirement). spawn()
 * returns a freed slot or null when full; the array length is constant forever.
 */
export class Pool<T extends { active: boolean }> {
  readonly items: T[];
  readonly capacity: number;
  #cursor = 0;

  constructor(capacity: number, make: () => T) {
    this.capacity = capacity;
    this.items = Array.from({ length: capacity }, make);
  }

  /** Find a free slot (round-robin), mark it active, return it — or null if full. */
  spawn(): T | null {
    for (let i = 0; i < this.capacity; i++) {
      const idx = (this.#cursor + i) % this.capacity;
      const it = this.items[idx]!;
      if (!it.active) {
        it.active = true;
        this.#cursor = (idx + 1) % this.capacity;
        return it;
      }
    }
    return null;
  }

  activeCount(): number {
    let n = 0;
    for (const it of this.items) if (it.active) n++;
    return n;
  }

  forEach(fn: (it: T) => void): void {
    for (const it of this.items) if (it.active) fn(it);
  }

  clear(): void {
    for (const it of this.items) it.active = false;
    this.#cursor = 0;
  }
}
