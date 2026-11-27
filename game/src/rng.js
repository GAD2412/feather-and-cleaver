/** Deterministic Mulberry32 pseudo-random number generator. */
export class SeededRng {
  constructor(seed = 20261127) {
    this.state = seed >>> 0;
  }

  /** Returns a float in [0, 1). */
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns a float in [min, max). */
  range(min, max) {
    return min + (max - min) * this.next();
  }

  /** Returns an integer in [min, max]. */
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  /** Picks one item from a non-empty array. */
  pick(items) {
    return items[Math.floor(this.next() * items.length)];
  }
}
