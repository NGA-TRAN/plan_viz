/**
 * ID Generator for Excalidraw elements
 * Generates unique IDs, indices, and seeds for Excalidraw elements
 * All generators are deterministic to ensure stable output across runs
 */
export class IdGenerator {
  private idCounter = 0;
  private indexCounter = 0;
  private seedCounter = 0;
  // Fixed base timestamp for deterministic IDs (Jan 1, 2024 00:00:00 UTC)
  private readonly baseTimestamp = 1704067200000;

  /**
   * Generates a unique ID for elements
   * Format: element-{baseTimestamp}-{counter}
   * Uses a fixed base timestamp for deterministic output
   */
  generateId(): string {
    return `element-${this.baseTimestamp}-${this.idCounter++}`;
  }

  /**
   * Generates a unique index for Excalidraw elements.
   *
   * Excalidraw fractional-indexing treats a leading `c` as an integer of
   * length 4. Keys must be exactly that long and must not grow a fractional
   * part that ends in `0` (`c0g10`, `c0gF0` throw `invalid order key` on
   * large plans). Fixed-width `c000`–`cFFF` stays in the integer part.
   */
  generateIndex(): string {
    const hex = this.indexCounter.toString(16).toUpperCase().padStart(3, '0');
    this.indexCounter++;
    return `c${hex}`;
  }

  /**
   * Generates a deterministic seed for Excalidraw's roughness
   * Uses a counter to ensure consistent output across runs
   */
  generateSeed(): number {
    // Use counter-based seed for determinism
    // Start from a base value and increment
    return 1000 + (this.seedCounter++ % 900000);
  }

  /**
   * Generates a deterministic timestamp for the 'updated' field
   * Uses base timestamp + counter for consistency
   */
  generateTimestamp(): number {
    return this.baseTimestamp + this.idCounter;
  }

  /**
   * Resets all counters (useful for testing)
   */
  reset(): void {
    this.idCounter = 0;
    this.indexCounter = 0;
    this.seedCounter = 0;
  }
}

