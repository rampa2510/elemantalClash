/**
 * Seeded random number generator for deterministic randomness
 * Uses Mulberry32 algorithm
 */
export class RandomGenerator {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
  }

  /**
   * Get current seed
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Set new seed
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }

  /**
   * Generate next random number (0 to 1)
   */
  next(): number {
    // Mulberry32 algorithm
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Generate random integer between 0 (inclusive) and max (exclusive)
   */
  nextIntMax(max: number): number {
    return this.nextInt(0, max);
  }

  /**
   * Pick a random element from an array
   */
  pick<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return array[this.nextIntMax(array.length)];
  }

  /**
   * Shuffle an array in place (Fisher-Yates)
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextIntMax(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Return a shuffled copy of an array
   */
  shuffled<T>(array: T[]): T[] {
    return this.shuffle([...array]);
  }

  /**
   * Generate a boolean with given probability of being true
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

// Global random generator (can be seeded for multiplayer sync)
export const gameRandom = new RandomGenerator();
