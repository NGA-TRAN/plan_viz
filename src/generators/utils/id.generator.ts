/**
 * ID Generator for Excalidraw elements
 * Generates unique IDs, indices, and seeds for Excalidraw elements
 */
export class IdGenerator {
  private idCounter = 0;
  private indexCounter = 0;

  /**
   * Generates a unique ID for elements
   * Format: element-{timestamp}-{counter}
   */
  generateId(): string {
    return `element-${Date.now()}-${this.idCounter++}`;
  }

  /**
   * Generates a unique index for Excalidraw elements
   * Format: c0g{hex} where hex is a hexadecimal counter (uppercase for A-F)
   */
  generateIndex(): string {
    const hex = this.indexCounter.toString(16).toUpperCase();
    this.indexCounter++;
    return `c0g${hex}`;
  }

  /**
   * Generates a random seed for Excalidraw's roughness
   */
  generateSeed(): number {
    return Math.floor(Math.random() * 1000000);
  }

  /**
   * Resets all counters (useful for testing)
   */
  reset(): void {
    this.idCounter = 0;
    this.indexCounter = 0;
  }
}

