import { ARROW_CONSTANTS } from '../constants';

export interface ArrowPositions {
  positions: number[];
  fullCount: number;
}

export interface EllipsisResult {
  adjustedPositions: number[];
  showEllipsis: boolean;
  firstArrowsCount: number;
  lastArrowsCount: number;
  ellipsisX?: number;
  ellipsisY?: number;
}

/**
 * Arrow Position Calculator
 * Calculates arrow positions with ellipsis support for many arrows
 */
export class ArrowPositionCalculator {
  /**
   * Calculates output arrow positions with ellipsis support for many arrows
   * Returns positions (may include ellipsis positions if totalCount > 8) and the full count
   */
  calculateOutputArrowPositions(
    totalCount: number,
    x: number,
    width: number
  ): ArrowPositions {
    const showEllipsis = totalCount > ARROW_CONSTANTS.MAX_ARROWS_FOR_ELLIPSIS;
    const positionsToCalculate = showEllipsis ?
      ARROW_CONSTANTS.ARROWS_BEFORE_ELLIPSIS + ARROW_CONSTANTS.ARROWS_AFTER_ELLIPSIS :
      totalCount;

    const positions: number[] = [];

    // For few arrows (<=4), use central region (60% of width, centered)
    // For more arrows, use full width
    const useCentralRegion = positionsToCalculate <= 4;
    let regionLeft: number;
    let regionRight: number;

    if (useCentralRegion) {
      // Use central 60% of width, centered
      const centerRegionWidth = width * ARROW_CONSTANTS.CENTRAL_REGION_RATIO;
      const centerRegionLeft = x + width / 2 - centerRegionWidth / 2;
      regionLeft = centerRegionLeft;
      regionRight = centerRegionLeft + centerRegionWidth;
    } else {
      // Use full width
      regionLeft = x;
      regionRight = x + width;
    }

    if (positionsToCalculate === 0) {
      // No arrows
      return { positions: [], fullCount: totalCount };
    } else if (positionsToCalculate === 1) {
      positions.push(x + width / 2);
    } else if (showEllipsis) {
      // Calculate positions for first arrows and last arrows separately
      const firstRegionWidth = (regionRight - regionLeft) / 2;
      const lastRegionWidth = (regionRight - regionLeft) / 2;
      const firstRegionLeft = regionLeft;
      const lastRegionLeft = regionLeft + firstRegionWidth;

      // First arrows (ARROWS_BEFORE_ELLIPSIS is always 2)
      const firstSpacing = firstRegionWidth / (ARROW_CONSTANTS.ARROWS_BEFORE_ELLIPSIS - 1);
      for (let j = 0; j < ARROW_CONSTANTS.ARROWS_BEFORE_ELLIPSIS; j++) {
        positions.push(firstRegionLeft + j * firstSpacing);
      }

      // Last arrows (ARROWS_AFTER_ELLIPSIS is always 2)
      const lastSpacing = lastRegionWidth / (ARROW_CONSTANTS.ARROWS_AFTER_ELLIPSIS - 1);
      for (let j = 0; j < ARROW_CONSTANTS.ARROWS_AFTER_ELLIPSIS; j++) {
        positions.push(lastRegionLeft + j * lastSpacing);
      }
    } else if (positionsToCalculate === 2) {
      positions.push(regionLeft);
      positions.push(regionRight);
    } else {
      // More than two arrows: distribute evenly
      const spacing = (regionRight - regionLeft) / (positionsToCalculate - 1);
      for (let j = 0; j < positionsToCalculate; j++) {
        positions.push(regionLeft + j * spacing);
      }
    }

    return { positions, fullCount: totalCount };
  }

  /**
   * Calculates adjusted arrow positions with ellipsis handling
   * When there are too many arrows, adjusts positions to show first few, "...", and last few
   */
  calculateEllipsisPositions(
    numArrows: number,
    arrowPositions: number[]
  ): EllipsisResult {
    const showEllipsis = numArrows > ARROW_CONSTANTS.MAX_ARROWS_FOR_ELLIPSIS;
    const firstArrowsCount = showEllipsis ?
      ARROW_CONSTANTS.ARROWS_BEFORE_ELLIPSIS :
      numArrows;
    const lastArrowsCount = showEllipsis ? ARROW_CONSTANTS.ARROWS_AFTER_ELLIPSIS : 0;

    let adjustedArrowPositions: number[] = [];
    let ellipsisX: number | undefined;
    let ellipsisY: number | undefined;

    if (showEllipsis && arrowPositions.length > 0) {
      // Find the min and max X positions
      const minX = Math.min(...arrowPositions);
      const maxX = Math.max(...arrowPositions);
      const totalWidth = maxX - minX;

      // Calculate central region (60% of total width, centered)
      const centerRegionWidth = totalWidth * ARROW_CONSTANTS.CENTRAL_REGION_RATIO;
      const centerRegionLeft = minX + totalWidth / 2 - centerRegionWidth / 2;

      // Calculate ellipsis position
      ellipsisX = centerRegionLeft + centerRegionWidth / 2;

      // For first arrows: distribute in left part of central region with spacing
      if (firstArrowsCount > 0) {
        const firstRegionWidth = centerRegionWidth / 2;
        const firstRegionStart = centerRegionLeft;

        const requiredWidth = (firstArrowsCount - 1) * ARROW_CONSTANTS.MIN_ARROW_SPACING;
        if (requiredWidth <= firstRegionWidth) {
          // Enough space: distribute evenly with minimum spacing
          const startX = firstRegionStart + (firstRegionWidth - requiredWidth) / 2;
          for (let i = 0; i < firstArrowsCount; i++) {
            adjustedArrowPositions.push(startX + i * ARROW_CONSTANTS.MIN_ARROW_SPACING);
          }
        } else {
          // Not enough space: distribute evenly across available width
          const spacing = firstRegionWidth / (firstArrowsCount - 1);
          for (let i = 0; i < firstArrowsCount; i++) {
            adjustedArrowPositions.push(firstRegionStart + i * spacing);
          }
        }
      }

      // For last arrows: distribute in right part of central region with spacing
      if (lastArrowsCount > 0) {
        const lastRegionWidth = centerRegionWidth / 2;
        const lastRegionStart = centerRegionLeft + centerRegionWidth / 2;

        const requiredWidth = (lastArrowsCount - 1) * ARROW_CONSTANTS.MIN_ARROW_SPACING;
        if (requiredWidth <= lastRegionWidth) {
          // Enough space: distribute evenly with minimum spacing
          const startX = lastRegionStart + (lastRegionWidth - requiredWidth) / 2;
          for (let i = 0; i < lastArrowsCount; i++) {
            adjustedArrowPositions.push(startX + i * ARROW_CONSTANTS.MIN_ARROW_SPACING);
          }
        } else {
          // Not enough space: distribute evenly across available width
          const spacing = lastRegionWidth / (lastArrowsCount - 1);
          for (let i = 0; i < lastArrowsCount; i++) {
            adjustedArrowPositions.push(lastRegionStart + i * spacing);
          }
        }
      }
    } else {
      // No ellipsis, use original positions
      adjustedArrowPositions = [...arrowPositions];
    }

    return {
      adjustedPositions: adjustedArrowPositions,
      showEllipsis,
      firstArrowsCount,
      lastArrowsCount,
      ellipsisX,
      ellipsisY,
    };
  }

  /**
   * Distributes arrows evenly across a region
   */
  distributeArrows(count: number, left: number, right: number): number[] {
    const positions: number[] = [];
    if (count === 0) {
      return positions;
    } else if (count === 1) {
      positions.push((left + right) / 2);
    } else if (count === 2) {
      positions.push(left);
      positions.push(right);
    } else {
      const spacing = (right - left) / (count - 1);
      for (let j = 0; j < count; j++) {
        positions.push(left + j * spacing);
      }
    }
    return positions;
  }

  /**
   * Distributes arrows across a central region (60% of width, centered)
   */
  distributeArrowsInCentralRegion(
    count: number,
    x: number,
    width: number
  ): number[] {
    const centerRegionWidth = width * ARROW_CONSTANTS.CENTRAL_REGION_RATIO;
    const centerRegionLeft = x + width / 2 - centerRegionWidth / 2;
    const centerRegionRight = centerRegionLeft + centerRegionWidth;
    return this.distributeArrows(count, centerRegionLeft, centerRegionRight);
  }
}

