import { LayoutCalculator } from '../layout.calculator';
import { NodeInfo } from '../../types/node-info.types';
import { SPACING } from '../../constants';

describe('LayoutCalculator', () => {
  let calculator: LayoutCalculator;

  beforeEach(() => {
    calculator = new LayoutCalculator();
  });

  describe('calculateChildPosition', () => {
    it('should calculate child position below parent', () => {
      const result = calculator.calculateChildPosition(0, 0, 80, 0);
      expect(result.x).toBe(0);
      expect(result.y).toBeGreaterThan(80);
    });

    it('should use adjusted vertical spacing', () => {
      const result = calculator.calculateChildPosition(0, 0, 80, 0);
      const expectedY = 0 + 80 + SPACING.VERTICAL * SPACING.ARROW_VERTICAL_RATIO;
      expect(result.y).toBeCloseTo(expectedY, 1);
    });

    it('should align child X with parent X', () => {
      const result = calculator.calculateChildPosition(100, 50, 80, 0);
      expect(result.x).toBe(100);
    });

    it('should use custom vertical spacing', () => {
      const customSpacing = 50;
      const result = calculator.calculateChildPosition(0, 0, 80, 0, customSpacing);
      const expectedY = 0 + 80 + customSpacing * SPACING.ARROW_VERTICAL_RATIO;
      expect(result.y).toBeCloseTo(expectedY, 1);
    });
  });

  describe('centerChildren', () => {
    it('should return zero shift for empty children', () => {
      const shift = calculator.centerChildren([], 0, 200, 50);
      expect(shift).toBe(0);
    });

    it('should calculate shift to center children', () => {
      const children: NodeInfo[] = [
        {
          x: 0,
          y: 0,
          width: 100,
          height: 80,
          rectId: '1',
          inputArrowCount: 1,
          inputArrowPositions: [50],
          outputColumns: [],
          outputSortOrder: [],
        },
        {
          x: 150,
          y: 0,
          width: 100,
          height: 80,
          rectId: '2',
          inputArrowCount: 1,
          inputArrowPositions: [50],
          outputColumns: [],
          outputSortOrder: [],
        },
      ];
      const shift = calculator.centerChildren(children, 0, 200, 50);
      expect(shift).not.toBe(0);
    });

    it('should center children around parent center', () => {
      const children: NodeInfo[] = [
        {
          x: 0,
          y: 0,
          width: 100,
          height: 80,
          rectId: '1',
          inputArrowCount: 1,
          inputArrowPositions: [50],
          outputColumns: [],
          outputSortOrder: [],
        },
      ];
      const parentX = 100;
      const parentWidth = 200;
      const shift = calculator.centerChildren(children, parentX, parentWidth, 50);
      const totalWidth = 100;
      const expectedStartX = parentX + parentWidth / 2 - totalWidth / 2;
      expect(shift).toBe(expectedStartX - children[0].x);
    });
  });

  describe('calculateMaxChildY', () => {
    it('should return zero for empty children', () => {
      const maxY = calculator.calculateMaxChildY([]);
      expect(maxY).toBe(0);
    });

    it('should find maximum Y position', () => {
      const children: NodeInfo[] = [
        {
          x: 0,
          y: 100,
          width: 100,
          height: 80,
          rectId: '1',
          inputArrowCount: 1,
          inputArrowPositions: [50],
          outputColumns: [],
          outputSortOrder: [],
        },
        {
          x: 0,
          y: 200,
          width: 100,
          height: 80,
          rectId: '2',
          inputArrowCount: 1,
          inputArrowPositions: [50],
          outputColumns: [],
          outputSortOrder: [],
        },
      ];
      const maxY = calculator.calculateMaxChildY(children);
      expect(maxY).toBe(280); // 200 + 80
    });
  });

  describe('calculateHorizontalPositions', () => {
    it('should calculate positions for single child', () => {
      const positions = calculator.calculateHorizontalPositions(1, 100, 200, 50);
      expect(positions).toHaveLength(1);
      expect(positions[0]).toBe(100 - 200 / 2); // Centered
    });

    it('should calculate positions for multiple children', () => {
      const positions = calculator.calculateHorizontalPositions(3, 100, 200, 50);
      expect(positions).toHaveLength(3);
      // Should be evenly spaced
      expect(positions[1] - positions[0]).toBe(positions[2] - positions[1]);
    });

    it('should center children around centerX', () => {
      const positions = calculator.calculateHorizontalPositions(2, 100, 200, 50);
      const totalWidth = 2 * 200 + 1 * 50;
      const expectedStartX = 100 - totalWidth / 2;
      expect(positions[0]).toBeCloseTo(expectedStartX, 1);
    });
  });

  describe('calculateTwoChildPositions', () => {
    it('should calculate left and right positions', () => {
      const result = calculator.calculateTwoChildPositions(100, 200, 150, 50);
      expect(result.leftX).toBe(100 - 150 - 50); // parentX - childWidth - spacing
      expect(result.rightX).toBe(100 + 200 + 50); // parentX + parentWidth + spacing
    });

    it('should position children symmetrically', () => {
      const parentX = 100;
      const parentWidth = 200;
      const childWidth = 150;
      const spacing = 50;
      const result = calculator.calculateTwoChildPositions(parentX, parentWidth, childWidth, spacing);
      // Left child should be positioned at: parentX - childWidth - spacing
      // Right child should be positioned at: parentX + parentWidth + spacing
      // Both should be equidistant from parent edges
      const leftDistance = parentX - result.leftX;
      const rightDistance = result.rightX - (parentX + parentWidth);
      // Both distances should equal childWidth + spacing
      expect(leftDistance).toBe(childWidth + spacing);
      expect(rightDistance).toBe(spacing);
      // The left edge of left child to right edge of right child should be symmetric
      const leftChildRightEdge = result.leftX + childWidth;
      const rightChildLeftEdge = result.rightX;
      const leftGap = parentX - leftChildRightEdge;
      const rightGap = rightChildLeftEdge - (parentX + parentWidth);
      expect(leftGap).toBe(rightGap);
    });
  });
});

