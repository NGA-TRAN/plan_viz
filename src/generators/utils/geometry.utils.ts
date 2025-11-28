import { ARROW_CONSTANTS } from '../constants';

export interface Region {
  left: number;
  right: number;
  width: number;
}

/**
 * Geometry Utilities
 * Provides geometric calculations for layout and positioning
 */
export class GeometryUtils {
  /**
   * Calculates intersection point on ellipse edge
   * Given a point (px, py) and ellipse center (cx, cy) with width w and height h,
   * finds the intersection point on the ellipse boundary along the line from point to center
   */
  getEllipseEdgePoint(
    px: number,
    py: number,
    cx: number,
    cy: number,
    w: number,
    h: number
  ): [number, number] {
    // Vector from ellipse center to point
    const dx = px - cx;
    const dy = py - cy;

    // Normalize the direction
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return [cx, cy];

    // Unit vector (direction from center toward the point)
    const ux = dx / length;
    const uy = dy / length;

    // For an ellipse: (x-cx)^2/a^2 + (y-cy)^2/b^2 = 1
    // where a = w/2, b = h/2
    const a = w / 2; // semi-major axis (horizontal)
    const b = h / 2; // semi-minor axis (vertical)

    // Find the intersection point on ellipse boundary in direction (ux, uy)
    // Parametric form: x = cx + t*ux, y = cy + t*uy
    // Substituting into ellipse equation: (t*ux)^2/a^2 + (t*uy)^2/b^2 = 1
    // Solving for t: t^2 * (ux^2/a^2 + uy^2/b^2) = 1
    // t = 1 / sqrt(ux^2/a^2 + uy^2/b^2)
    const denominator = Math.sqrt((ux * ux) / (a * a) + (uy * uy) / (b * b));
    if (denominator === 0) return [cx, cy];

    const t = 1 / denominator;
    const ex = cx + t * ux;
    const ey = cy + t * uy;

    return [ex, ey];
  }

  /**
   * Calculates a centered region (60% of width, centered)
   */
  calculateCenteredRegion(left: number, right: number, ratio: number = ARROW_CONSTANTS.CENTRAL_REGION_RATIO): Region {
    const totalWidth = right - left;
    const centerRegionWidth = totalWidth * ratio;
    const centerRegionLeft = left + totalWidth / 2 - centerRegionWidth / 2;
    return {
      left: centerRegionLeft,
      right: centerRegionLeft + centerRegionWidth,
      width: centerRegionWidth,
    };
  }

  /**
   * Calculates the center point of a rectangle
   */
  getRectangleCenter(x: number, y: number, width: number, height: number): [number, number] {
    return [x + width / 2, y + height / 2];
  }

  /**
   * Calculates the midpoint between two points
   */
  getMidpoint(x1: number, y1: number, x2: number, y2: number): [number, number] {
    return [(x1 + x2) / 2, (y1 + y2) / 2];
  }
}

