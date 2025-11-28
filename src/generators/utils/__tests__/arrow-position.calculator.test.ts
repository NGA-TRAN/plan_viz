import { ArrowPositionCalculator } from '../arrow-position.calculator';
import { ARROW_CONSTANTS } from '../../constants';

describe('ArrowPositionCalculator', () => {
  let calculator: ArrowPositionCalculator;

  beforeEach(() => {
    calculator = new ArrowPositionCalculator();
  });

  describe('calculateOutputArrowPositions', () => {
    it('should calculate positions for single arrow', () => {
      const result = calculator.calculateOutputArrowPositions(1, 0, 200);
      expect(result.positions).toHaveLength(1);
      expect(result.positions[0]).toBe(100); // Center of width
      expect(result.fullCount).toBe(1);
    });

    it('should calculate positions for two arrows', () => {
      const result = calculator.calculateOutputArrowPositions(2, 0, 200);
      expect(result.positions).toHaveLength(2);
      expect(result.fullCount).toBe(2);
    });

    it('should calculate positions for multiple arrows', () => {
      const result = calculator.calculateOutputArrowPositions(5, 0, 200);
      expect(result.positions).toHaveLength(5);
      expect(result.fullCount).toBe(5);
    });

    it('should handle ellipsis for many arrows', () => {
      const count = ARROW_CONSTANTS.MAX_ARROWS_FOR_ELLIPSIS + 1;
      const result = calculator.calculateOutputArrowPositions(count, 0, 200);
      expect(result.positions.length).toBe(
        ARROW_CONSTANTS.ARROWS_BEFORE_ELLIPSIS + ARROW_CONSTANTS.ARROWS_AFTER_ELLIPSIS
      );
      expect(result.fullCount).toBe(count);
    });

    it('should return empty positions for zero arrows', () => {
      const result = calculator.calculateOutputArrowPositions(0, 0, 200);
      expect(result.positions).toEqual([]);
      expect(result.fullCount).toBe(0);
    });

    it('should use central region for few arrows', () => {
      const result = calculator.calculateOutputArrowPositions(3, 100, 200);
      expect(result.positions.length).toBe(3);
      // Positions should be within central region
      const centerX = 100 + 200 / 2;
      const regionWidth = 200 * ARROW_CONSTANTS.CENTRAL_REGION_RATIO;
      const regionLeft = centerX - regionWidth / 2;
      const regionRight = centerX + regionWidth / 2;
      result.positions.forEach((pos) => {
        expect(pos).toBeGreaterThanOrEqual(regionLeft);
        expect(pos).toBeLessThanOrEqual(regionRight);
      });
    });
  });

  describe('calculateEllipsisPositions', () => {
    it('should not show ellipsis for few arrows', () => {
      const positions = [50, 100, 150];
      const result = calculator.calculateEllipsisPositions(3, positions);
      expect(result.showEllipsis).toBe(false);
      expect(result.adjustedPositions).toEqual(positions);
    });

    it('should show ellipsis for many arrows', () => {
      const positions = Array.from({ length: 10 }, (_, i) => i * 10);
      const result = calculator.calculateEllipsisPositions(10, positions);
      expect(result.showEllipsis).toBe(true);
      expect(result.firstArrowsCount).toBe(ARROW_CONSTANTS.ARROWS_BEFORE_ELLIPSIS);
      expect(result.lastArrowsCount).toBe(ARROW_CONSTANTS.ARROWS_AFTER_ELLIPSIS);
      expect(result.ellipsisX).toBeDefined();
    });

    it('should calculate adjusted positions with spacing', () => {
      const positions = Array.from({ length: 10 }, (_, i) => i * 10);
      const result = calculator.calculateEllipsisPositions(10, positions);
      expect(result.adjustedPositions.length).toBe(
        ARROW_CONSTANTS.ARROWS_BEFORE_ELLIPSIS + ARROW_CONSTANTS.ARROWS_AFTER_ELLIPSIS
      );
    });
  });

  describe('distributeArrows', () => {
    it('should distribute single arrow at center', () => {
      const result = calculator.distributeArrows(1, 0, 100);
      expect(result).toEqual([50]);
    });

    it('should distribute two arrows at edges', () => {
      const result = calculator.distributeArrows(2, 0, 100);
      expect(result).toEqual([0, 100]);
    });

    it('should distribute multiple arrows evenly', () => {
      const result = calculator.distributeArrows(5, 0, 100);
      expect(result).toHaveLength(5);
      expect(result[0]).toBe(0);
      expect(result[4]).toBe(100);
    });

    it('should return empty array for zero arrows', () => {
      const result = calculator.distributeArrows(0, 0, 100);
      expect(result).toEqual([]);
    });
  });

  describe('distributeArrowsInCentralRegion', () => {
    it('should distribute arrows in central region', () => {
      const result = calculator.distributeArrowsInCentralRegion(3, 0, 200);
      expect(result).toHaveLength(3);
      const centerX = 100;
      const regionWidth = 200 * ARROW_CONSTANTS.CENTRAL_REGION_RATIO;
      const regionLeft = centerX - regionWidth / 2;
      const regionRight = centerX + regionWidth / 2;
      result.forEach((pos) => {
        expect(pos).toBeGreaterThanOrEqual(regionLeft);
        expect(pos).toBeLessThanOrEqual(regionRight);
      });
    });
  });
});

