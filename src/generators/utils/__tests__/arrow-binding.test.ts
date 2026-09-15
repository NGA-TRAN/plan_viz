import {
  bindingAt,
  normalizeFixedPoint,
  arrowEndpoint,
  determineFocusDistance,
} from '../arrow-binding';
import { ExcalidrawElement } from '../../../types/excalidraw.types';

function box(id: string, x: number, y: number, width: number, height: number): ExcalidrawElement {
  return {
    id,
    type: 'rectangle',
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: '#000',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    seed: 1,
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: [],
    updated: 1,
    link: null,
    locked: false,
  };
}

describe('arrow-binding', () => {
  it('normalizes an exact 0.5 ratio to 0.5001', () => {
    expect(normalizeFixedPoint([0.5, 0.5])).toEqual([0.5001, 0.5001]);
  });

  it('gives distinct focus and fixedPoints for two arrows on the same bottom edge', () => {
    const parent = box('p', 0, 0, 100, 80);
    const left = bindingAt(parent, 20, 80, 20, 200);
    const right = bindingAt(parent, 80, 80, 80, 200);
    expect(left.fixedPoint[0]).toBeCloseTo(0.2, 5);
    expect(right.fixedPoint[0]).toBeCloseTo(0.8, 5);
    expect(left.fixedPoint[1]).toBeCloseTo(0.9999, 5);
    expect(left.gap).toBeGreaterThanOrEqual(1);
    expect(right.gap).toBeGreaterThanOrEqual(1);
    expect(left.mode).toBe('inside');
    expect(left.focus).not.toBe(right.focus);
    expect(Math.abs(left.focus)).toBeLessThanOrEqual(1);
    expect(Math.abs(right.focus)).toBeLessThanOrEqual(1);
  });

  it('clamps focus for an arrow at 80% of the bottom edge', () => {
    const parent = box('p', 0, 0, 420, 80);
    const binding = bindingAt(parent, 336, 80, 336, 140);
    expect(Math.abs(binding.focus)).toBeLessThanOrEqual(1);
    expect(binding.gap).toBe(1);
    expect(binding.fixedPoint[0]).toBeCloseTo(0.8, 5);
  });

  it('uses a non-zero gap so Excalidraw 0.18 does not snap the end to the box center', () => {
    const child = box('c', 0, 100, 100, 80);
    const binding = bindingAt(child, 50, 100, 50, 20);
    expect(binding.gap).toBeGreaterThanOrEqual(1);
    expect(determineFocusDistance(child, { x: 50, y: 20 }, { x: 50, y: 100 })).toBeDefined();
  });

  it('reads arrow endpoints from points', () => {
    expect(arrowEndpoint({ x: 10, y: 20, points: [[0, 0], [5, 15]] }, 'start')).toEqual({
      x: 10,
      y: 20,
    });
    expect(arrowEndpoint({ x: 10, y: 20, points: [[0, 0], [5, 15]] }, 'end')).toEqual({
      x: 15,
      y: 35,
    });
  });
});
