import { GeometryUtils } from '../geometry.utils';
import { ARROW_CONSTANTS } from '../../constants';

describe('GeometryUtils', () => {
  let utils: GeometryUtils;

  beforeEach(() => {
    utils = new GeometryUtils();
  });

  describe('getEllipseEdgePoint', () => {
    it('should calculate edge point for point outside ellipse', () => {
      const [ex, ey] = utils.getEllipseEdgePoint(100, 50, 50, 50, 40, 20);
      // Point should be on ellipse boundary
      expect(ex).toBeDefined();
      expect(ey).toBeDefined();
      expect(typeof ex).toBe('number');
      expect(typeof ey).toBe('number');
    });

    it('should handle point at ellipse center', () => {
      const [ex, ey] = utils.getEllipseEdgePoint(50, 50, 50, 50, 40, 20);
      expect(ex).toBe(50);
      expect(ey).toBe(50);
    });

    it('should calculate edge point for horizontal point', () => {
      const [ex, ey] = utils.getEllipseEdgePoint(100, 50, 50, 50, 40, 20);
      // Should be on right edge of ellipse
      expect(ex).toBeGreaterThan(50);
      expect(ey).toBeCloseTo(50, 1);
    });

    it('should calculate edge point for vertical point', () => {
      const [ex, ey] = utils.getEllipseEdgePoint(50, 100, 50, 50, 40, 20);
      // Should be on bottom edge of ellipse
      expect(ex).toBeCloseTo(50, 1);
      expect(ey).toBeGreaterThan(50);
    });

    it('should handle diagonal point', () => {
      const [ex, ey] = utils.getEllipseEdgePoint(100, 100, 50, 50, 40, 20);
      // Should be on ellipse boundary in diagonal direction
      expect(ex).toBeGreaterThan(50);
      expect(ey).toBeGreaterThan(50);
      expect(typeof ex).toBe('number');
      expect(typeof ey).toBe('number');
    });

    it('should handle point to the left of ellipse', () => {
      const [ex, ey] = utils.getEllipseEdgePoint(0, 50, 50, 50, 40, 20);
      // Should be on left edge of ellipse
      expect(ex).toBeLessThan(50);
      expect(ey).toBeCloseTo(50, 1);
    });

    it('should handle point above ellipse', () => {
      const [ex, ey] = utils.getEllipseEdgePoint(50, 0, 50, 50, 40, 20);
      // Should be on top edge of ellipse
      expect(ex).toBeCloseTo(50, 1);
      expect(ey).toBeLessThan(50);
    });

    it('should handle different ellipse orientations', () => {
      // Test with wider ellipse (horizontal)
      const [ex1, ey1] = utils.getEllipseEdgePoint(100, 50, 50, 50, 80, 20);
      expect(ex1).toBeGreaterThan(50);
      expect(ey1).toBeCloseTo(50, 1);

      // Test with taller ellipse (vertical)
      const [ex2, ey2] = utils.getEllipseEdgePoint(50, 100, 50, 50, 20, 80);
      expect(ex2).toBeCloseTo(50, 1);
      expect(ey2).toBeGreaterThan(50);
    });

    it('should handle point at different angles', () => {
      // 45 degree angle
      const [ex1, ey1] = utils.getEllipseEdgePoint(100, 100, 50, 50, 40, 20);
      expect(ex1).toBeGreaterThan(50);
      expect(ey1).toBeGreaterThan(50);

      // 135 degree angle (upper right quadrant)
      const [ex2, ey2] = utils.getEllipseEdgePoint(100, 0, 50, 50, 40, 20);
      expect(ex2).toBeGreaterThan(50);
      expect(ey2).toBeLessThan(50);

      // 225 degree angle (lower left quadrant)
      const [ex3, ey3] = utils.getEllipseEdgePoint(0, 100, 50, 50, 40, 20);
      expect(ex3).toBeLessThan(50);
      expect(ey3).toBeGreaterThan(50);

      // 315 degree angle (upper left quadrant)
      const [ex4, ey4] = utils.getEllipseEdgePoint(0, 0, 50, 50, 40, 20);
      expect(ex4).toBeLessThan(50);
      expect(ey4).toBeLessThan(50);
    });

    it('should handle very small ellipse', () => {
      const [ex, ey] = utils.getEllipseEdgePoint(100, 50, 50, 50, 0.1, 0.1);
      // Should still calculate valid point
      expect(typeof ex).toBe('number');
      expect(typeof ey).toBe('number');
      expect(Number.isFinite(ex)).toBe(true);
      expect(Number.isFinite(ey)).toBe(true);
    });

    it('should handle point very close to center', () => {
      const [ex, ey] = utils.getEllipseEdgePoint(50.0001, 50.0001, 50, 50, 40, 20);
      // Should handle floating point precision
      expect(typeof ex).toBe('number');
      expect(typeof ey).toBe('number');
    });

    it('should handle square ellipse', () => {
      const [ex, ey] = utils.getEllipseEdgePoint(100, 100, 50, 50, 40, 40);
      // Square ellipse (circle)
      expect(typeof ex).toBe('number');
      expect(typeof ey).toBe('number');
      expect(Number.isFinite(ex)).toBe(true);
      expect(Number.isFinite(ey)).toBe(true);
    });

    it('should handle very large ellipse', () => {
      const [ex, ey] = utils.getEllipseEdgePoint(1000, 500, 500, 500, 800, 400);
      expect(typeof ex).toBe('number');
      expect(typeof ey).toBe('number');
      expect(Number.isFinite(ex)).toBe(true);
      expect(Number.isFinite(ey)).toBe(true);
    });

    it('should handle negative point coordinates', () => {
      const [ex, ey] = utils.getEllipseEdgePoint(-50, -50, 0, 0, 40, 20);
      expect(typeof ex).toBe('number');
      expect(typeof ey).toBe('number');
      expect(Number.isFinite(ex)).toBe(true);
      expect(Number.isFinite(ey)).toBe(true);
    });

    it('should handle ellipse with different center', () => {
      const [ex, ey] = utils.getEllipseEdgePoint(200, 150, 100, 100, 40, 20);
      expect(typeof ex).toBe('number');
      expect(typeof ey).toBe('number');
      // Result should be relative to center (100, 100)
      expect(Number.isFinite(ex)).toBe(true);
      expect(Number.isFinite(ey)).toBe(true);
    });

    it('should handle denominator === 0 edge case', () => {
      // Mock Math.sqrt to return 0 to test the denominator === 0 branch
      // This tests the defensive check at line 50
      const sqrtSpy = jest.spyOn(Math, 'sqrt');

      // First call is for length calculation, second is for denominator
      // We want the second call to return 0
      sqrtSpy
        .mockReturnValueOnce(70.71) // length calculation: sqrt(50^2 + 50^2) ≈ 70.71
        .mockReturnValueOnce(0); // denominator calculation: return 0 to trigger branch

      const [ex, ey] = utils.getEllipseEdgePoint(100, 100, 50, 50, 40, 20);
      // When denominator is 0, should return ellipse center
      expect(ex).toBe(50);
      expect(ey).toBe(50);
      expect(sqrtSpy).toHaveBeenCalledTimes(2);

      sqrtSpy.mockRestore();
    });
  });

  describe('calculateCenteredRegion', () => {
    it('should calculate centered region', () => {
      const result = utils.calculateCenteredRegion(0, 100);
      expect(result.left).toBeLessThan(result.right);
      expect(result.width).toBe(100 * ARROW_CONSTANTS.CENTRAL_REGION_RATIO);
      expect(result.width).toBe(result.right - result.left);
    });

    it('should center region correctly', () => {
      const result = utils.calculateCenteredRegion(0, 100);
      const center = (0 + 100) / 2;
      const expectedLeft = center - result.width / 2;
      expect(result.left).toBeCloseTo(expectedLeft, 1);
    });

    it('should use custom ratio', () => {
      const result = utils.calculateCenteredRegion(0, 100, 0.5);
      expect(result.width).toBe(50);
    });

    it('should handle negative coordinates', () => {
      const result = utils.calculateCenteredRegion(-50, 50);
      expect(result.left).toBeLessThan(result.right);
      expect(result.width).toBe(100 * ARROW_CONSTANTS.CENTRAL_REGION_RATIO);
    });

    it('should handle zero width region', () => {
      const result = utils.calculateCenteredRegion(100, 100);
      expect(result.width).toBe(0);
      expect(result.left).toBe(result.right);
    });

    it('should handle very small region', () => {
      const result = utils.calculateCenteredRegion(0, 1);
      expect(result.width).toBe(1 * ARROW_CONSTANTS.CENTRAL_REGION_RATIO);
      expect(result.left).toBeLessThanOrEqual(result.right);
    });

    it('should handle very large region', () => {
      const result = utils.calculateCenteredRegion(0, 10000);
      expect(result.width).toBe(10000 * ARROW_CONSTANTS.CENTRAL_REGION_RATIO);
      expect(result.left).toBeLessThan(result.right);
    });

    it('should use default ratio when not specified', () => {
      const result1 = utils.calculateCenteredRegion(0, 100);
      const result2 = utils.calculateCenteredRegion(0, 100, ARROW_CONSTANTS.CENTRAL_REGION_RATIO);
      expect(result1.width).toBe(result2.width);
    });
  });

  describe('getRectangleCenter', () => {
    it('should calculate rectangle center', () => {
      const [cx, cy] = utils.getRectangleCenter(10, 20, 100, 50);
      expect(cx).toBe(60);
      expect(cy).toBe(45);
    });

    it('should handle zero position', () => {
      const [cx, cy] = utils.getRectangleCenter(0, 0, 100, 50);
      expect(cx).toBe(50);
      expect(cy).toBe(25);
    });
  });

  describe('getMidpoint', () => {
    it('should calculate midpoint', () => {
      const [mx, my] = utils.getMidpoint(0, 0, 100, 50);
      expect(mx).toBe(50);
      expect(my).toBe(25);
    });

    it('should handle negative coordinates', () => {
      const [mx, my] = utils.getMidpoint(-10, -20, 10, 20);
      expect(mx).toBe(0);
      expect(my).toBe(0);
    });
  });
});

