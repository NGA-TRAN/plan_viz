import { NodeInfo } from '../types/node-info.types';
import { SPACING } from '../constants';

/**
 * Layout Calculator
 * Calculates node positions and spacing for layout
 */
export class LayoutCalculator {
  /**
   * Calculates child position relative to parent
   */
  calculateChildPosition(
    parentX: number,
    parentY: number,
    parentHeight: number,
    _childIndex: number,
    verticalSpacing: number = SPACING.VERTICAL
  ): { x: number; y: number } {
    // Adjust vertical spacing to make arrows 3/5 of original length
    const adjustedVerticalSpacing = verticalSpacing * SPACING.ARROW_VERTICAL_RATIO;
    return {
      x: parentX, // Children align vertically with parent
      y: parentY + parentHeight + adjustedVerticalSpacing,
    };
  }

  /**
   * Centers children horizontally relative to parent
   * Returns the shift amount needed to center all children
   */
  centerChildren(
    children: NodeInfo[],
    parentX: number,
    parentWidth: number,
    spacing: number
  ): number {
    if (children.length === 0) {
      return 0;
    }

    const totalWidth =
      children.reduce((sum, child) => sum + child.width, 0) + (children.length - 1) * spacing;
    const startX = parentX + parentWidth / 2 - totalWidth / 2;
    const firstChildX = children[0].x;
    return startX - firstChildX;
  }

  /**
   * Calculates the maximum Y position from children
   */
  calculateMaxChildY(children: NodeInfo[]): number {
    if (children.length === 0) {
      return 0;
    }
    return Math.max(...children.map((child) => child.y + child.height));
  }

  /**
   * Calculates horizontal positions for multiple children
   * Used for UnionExec and join operations
   */
  calculateHorizontalPositions(
    count: number,
    centerX: number,
    nodeWidth: number,
    spacing: number
  ): number[] {
    const positions: number[] = [];
    const totalWidth = count * nodeWidth + (count - 1) * spacing;
    const startX = centerX - totalWidth / 2;

    for (let i = 0; i < count; i++) {
      positions.push(startX + i * (nodeWidth + spacing));
    }

    return positions;
  }

  /**
   * Calculates positions for two children (left and right of parent)
   * Used for join operations
   */
  calculateTwoChildPositions(
    parentX: number,
    parentWidth: number,
    childWidth: number,
    spacing: number
  ): { leftX: number; rightX: number } {
    return {
      leftX: parentX - childWidth - spacing,
      rightX: parentX + parentWidth + spacing,
    };
  }
}

