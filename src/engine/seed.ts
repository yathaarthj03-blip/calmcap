// Deterministic randomness: day-seeded picks and the replay noise.

/** FNV-1a 32-bit string hash. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  const rnd = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function seededIndex(key: string, length: number): number {
  if (length <= 0) return 0;
  return hashString(key) % length;
}

export function pickSeeded<T>(key: string, items: readonly T[]): T {
  return items[seededIndex(key, items.length)];
}

/** Pick for `key` that is guaranteed to differ from the pick for `avoidKey` (when there are 2+ items). */
export function pickSeededDistinct<T>(key: string, avoidKey: string, items: readonly T[]): T {
  const a = seededIndex(avoidKey, items.length);
  let b = seededIndex(key, items.length);
  if (items.length > 1 && a === b) b = (b + 1) % items.length;
  return items[b];
}
