/**
 * Text Measurement utility
 * Estimates text width based on character types for better positioning
 */
export class TextMeasurement {
  /**
   * Estimates text width based on character types for better positioning
   * Uses approximate widths for proportional font (tuned for Excalidraw "Normal" font)
   */
  measureText(text: string, fontSize: number): number {
    let width = 0;
    // Approximate widths for proportional font (tuned for Excalidraw "Normal" font)
    const average = 0.55;
    const narrow = 0.32; // i, l, t, f, r, space, comma, period
    const wide = 0.8; // m, w, M, W, _
    const capital = 0.7;

    for (const char of text) {
      if (/[iltr ,.]/.test(char)) {
        width += fontSize * narrow;
      } else if (/[mwMW_]/.test(char)) {
        width += fontSize * wide;
      } else if (/[A-Z]/.test(char)) {
        width += fontSize * capital;
      } else {
        width += fontSize * average;
      }
    }
    return width;
  }
}

