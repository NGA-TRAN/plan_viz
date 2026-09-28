import { ARROW_CONSTANTS } from '../constants';

/** Logical indices represented by visible glyphs/arrows; the stream count stays unchanged. */
export function visiblePartitions(count: number, truncated = false): number[] {
  if (count <= ARROW_CONSTANTS.MAX_ARROWS_FOR_ELLIPSIS && !truncated) {
    return Array.from({ length: count }, (_, index) => index);
  }
  return [...new Set([0, 1, count - 2, count - 1])].filter((index) => index >= 0 && index < count);
}
