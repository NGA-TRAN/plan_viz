import { ExcalidrawElement, ExcalidrawRectangle, ExcalidrawText, ExcalidrawArrow } from '../../types/excalidraw.types';
import { wrapLabel } from './adaptive-layout';
import { bindingAt } from './arrow-binding';

export function sceneBounds(es: ExcalidrawElement[]): { x: number; y: number; width: number; height: number } {
  const shapes = es.filter((e) => e.type !== 'arrow');
  const x = Math.min(...shapes.map((e) => e.x)); const y = Math.min(...shapes.map((e) => e.y));
  return { x, y, width: Math.max(...shapes.map((e) => e.x + e.width)) - x,
    height: Math.max(...shapes.map((e) => e.y + e.height)) - y };
}
export function moveScene(es: ExcalidrawElement[], x: number, y: number, prefix = '', group?: string): void {
  const id = (s: string): string => prefix + s;
  for (const e of es) {
    e.x += x; e.y += y; e.id = id(e.id); e.groupIds = e.groupIds.map(id);
    if (group) e.groupIds.push(group);
    if (e.type === 'text' && e.containerId) e.containerId = id(e.containerId);
    for (const b of e.boundElements ?? []) b.id = id(b.id);
    if (e.type === 'arrow') for (const b of [e.startBinding, e.endBinding]) if (b) b.elementId = id(b.elementId);
  }
}
export class SceneComposition {
  private serial = 0;
  rectangle(x: number, y: number, width: number, height: number, fill = '#ffffff', color = '#868e96'): ExcalidrawRectangle {
    return { id: 'distributed-' + this.serial++, type: 'rectangle', x, y, width, height, angle: 0,
      strokeColor: color, backgroundColor: fill, fillStyle: 'solid', strokeWidth: 1.5, strokeStyle: 'solid',
      roughness: 0, opacity: 100, groupIds: [], frameId: null, roundness: { type: 3 }, seed: 1, version: 1,
      versionNonce: 1, isDeleted: false, boundElements: [], updated: 1, link: null, locked: false };
  }
  text(label: string, x: number, y: number, width: number, size = 18, color = '#343a40'): ExcalidrawText {
    const text = wrapLabel(label, width, size, Number.MAX_SAFE_INTEGER);
    return { ...this.rectangle(x, y, width, text.split('\n').length * size * 1.25), type: 'text', text, originalText: text,
      backgroundColor: 'transparent', strokeColor: color, fontSize: size, fontFamily: 2, textAlign: 'left',
      verticalAlign: 'top', baseline: size, lineHeight: 1.25, containerId: null, autoResize: false };
  }
  arrow(from: ExcalidrawRectangle, to: ExcalidrawRectangle, points: number[][]): ExcalidrawArrow {
    const first = points[0]; const last = points[points.length - 1];
    const arrow: ExcalidrawArrow = { ...this.rectangle(first[0], first[1],
      Math.max(...points.map((p) => p[0])) - Math.min(...points.map((p) => p[0])),
      Math.max(...points.map((p) => p[1])) - Math.min(...points.map((p) => p[1]))),
    type: 'arrow', backgroundColor: 'transparent', strokeColor: '#6741d9', strokeWidth: 2, roundness: null,
    points: points.map((p) => [p[0] - first[0], p[1] - first[1]]), startArrowhead: null, endArrowhead: 'arrow', lastCommittedPoint: null,
    startBinding: bindingAt(from, first[0], first[1], points[1][0], points[1][1]),
    endBinding: bindingAt(to, last[0], last[1], points[points.length - 2][0], points[points.length - 2][1]) };
    (from.boundElements ??= []).push({ id: arrow.id, type: 'arrow' });
    (to.boundElements ??= []).push({ id: arrow.id, type: 'arrow' });
    return arrow;
  }
}
