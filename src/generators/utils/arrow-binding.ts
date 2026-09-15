import { ArrowBinding, ExcalidrawElement } from '../../types/excalidraw.types';

type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pointsEqual(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
}

function cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

/**
 * Excalidraw avoids an exact 0.5 ratio so arrow heading does not jump.
 * See normalizeFixedPoint in @excalidraw/element binding.ts.
 */
export function normalizeFixedPoint(point: [number, number]): [number, number] {
  return [
    Math.abs(point[0] - 0.5) < 0.0001 ? 0.5001 : point[0],
    Math.abs(point[1] - 0.5) < 0.0001 ? 0.5001 : point[1],
  ];
}

/**
 * Distance from a point to the element's bounding box (0 if on or inside).
 */
export function distanceToElement(element: ExcalidrawElement, point: Point): number {
  const dx = Math.max(element.x - point.x, 0, point.x - (element.x + element.width));
  const dy = Math.max(element.y - point.y, 0, point.y - (element.y + element.height));
  return Math.hypot(dx, dy);
}

function lineIntersection(
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point
): Point | null {
  const dxA = a2.x - a1.x;
  const dyA = a2.y - a1.y;
  const dxB = b2.x - b1.x;
  const dyB = b2.y - b1.y;
  const denom = cross(dxA, dyA, dxB, dyB);
  if (Math.abs(denom) < 1e-10) {
    return null;
  }
  const t = cross(b1.x - a1.x, b1.y - a1.y, dxB, dyB) / denom;
  const u = cross(b1.x - a1.x, b1.y - a1.y, dxA, dyA) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) {
    return null;
  }
  return { x: a1.x + t * dxA, y: a1.y + t * dyA };
}

/**
 * Same signed focus Excalidraw 0.18 stores on a hand-drawn bound arrow.
 * `adjacent` is the other endpoint; `edge` is the end on `element`.
 */
export function determineFocusDistance(
  element: ExcalidrawElement,
  adjacent: Point,
  edge: Point
): number {
  const center: Point = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
  if (pointsEqual(adjacent, edge)) {
    return 0;
  }

  const fromAdjacentX = edge.x - adjacent.x;
  const fromAdjacentY = edge.y - adjacent.y;
  const sign =
    Math.sign(cross(fromAdjacentX, fromAdjacentY, edge.x - center.x, edge.y - center.y)) * -1;

  const length = Math.hypot(fromAdjacentX, fromAdjacentY) || 1;
  const reach = Math.max(element.width, element.height) * 2;
  const interceptorEnd: Point = {
    x: edge.x + (fromAdjacentX / length) * reach,
    y: edge.y + (fromAdjacentY / length) * reach,
  };

  const diagonals: [Point, Point][] = [
    [
      { x: element.x - element.width, y: element.y - element.height },
      { x: element.x + element.width * 2, y: element.y + element.height * 2 },
    ],
    [
      { x: element.x + element.width * 2, y: element.y - element.height },
      { x: element.x - element.width, y: element.y + element.height * 2 },
    ],
  ];

  const halfDiagonal = Math.sqrt(element.width ** 2 + element.height ** 2) / 2;
  const hits = diagonals
    .map((segment) => lineIntersection(edge, interceptorEnd, segment[0], segment[1]))
    .filter((point): point is Point => point !== null)
    .sort((a, b) => {
      const da = (a.x - edge.x) ** 2 + (a.y - edge.y) ** 2;
      const db = (b.x - edge.x) ** 2 + (b.y - edge.y) ** 2;
      return da - db;
    })
    .map((point) => (sign * Math.hypot(point.x - center.x, point.y - center.y)) / halfDiagonal)
    .sort((a, b) => Math.abs(a) - Math.abs(b));

  return hits[0] ?? 0;
}

/**
 * Binding that matches a hand-drawn Excalidraw 0.18 arrow:
 * `gap >= 1` keeps the end on the outline (gap 0 snaps to the box center).
 * `fixedPoint` is kept for newer clients; `inside` pins that point on drag.
 */
export function bindingAt(
  element: ExcalidrawElement,
  pointX: number,
  pointY: number,
  adjacentX: number,
  adjacentY: number
): ArrowBinding {
  const width = element.width === 0 ? 1 : element.width;
  const height = element.height === 0 ? 1 : element.height;
  const nx = clamp((pointX - element.x) / width, 0.0001, 0.9999);
  const ny = clamp((pointY - element.y) / height, 0.0001, 0.9999);
  const edge = { x: pointX, y: pointY };
  const adjacent = { x: adjacentX, y: adjacentY };

  return {
    elementId: element.id,
    focus: clamp(determineFocusDistance(element, adjacent, edge), -1, 1),
    gap: Math.max(1, distanceToElement(element, edge)),
    fixedPoint: normalizeFixedPoint([nx, ny]),
    mode: 'inside',
  };
}

export function arrowEndpoint(
  arrow: { x: number; y: number; points: number[][] },
  end: 'start' | 'end'
): { x: number; y: number } {
  const index = end === 'start' ? 0 : arrow.points.length - 1;
  const point = arrow.points[index] ?? [0, 0];
  return { x: arrow.x + point[0], y: arrow.y + point[1] };
}
