import { ExcalidrawElement } from '../../types/excalidraw.types';
import { ElementFactory } from '../factories/element.factory';
import { IdGenerator } from './id.generator';

/** Place omission markers after layout, using final glyph and arrow coordinates. */
export function addPartitionOmissions(elements: ExcalidrawElement[], factory: ElementFactory, ids: IdGenerator): void {
  const series = new Map<string, ExcalidrawElement[]>();
  for (const element of elements) {
    const key = element.customData?.partitionSeries;
    if (typeof key !== 'string') continue;
    const group = series.get(key) ?? [];
    group.push(element); series.set(key, group);
  }
  for (const group of series.values()) {
    group.sort((a, b) => Number(a.customData?.partitionIndex) - Number(b.customData?.partitionIndex));
    for (let i = 1; i < group.length; i++) {
      const a = group[i - 1]; const b = group[i];
      const omitted = Number(b.customData?.partitionIndex) - Number(a.customData?.partitionIndex) - 1;
      if (omitted <= 0) continue;
      let x = (a.x + a.width + b.x) / 2;
      let y = (a.y + a.height / 2 + b.y + b.height / 2) / 2;
      let owner = a;
      if (a.type === 'arrow' && b.type === 'arrow') {
        y = Math.min(a.y + a.points[0][1], b.y + b.points[0][1]) - 28;
        const atY = (arrow: typeof a): number => {
          const first = arrow.points[0]; const last = arrow.points[arrow.points.length - 1];
          const t = (y - arrow.y - first[1]) / (last[1] - first[1] || 1);
          return arrow.x + first[0] + t * (last[0] - first[0]);
        };
        x = (atY(a) + atY(b)) / 2;
        owner = elements.find((e) => e.id === a.startBinding?.elementId) ?? a;
      }
      const marker = factory.createText({
        id: ids.generateId(), x: x - 10, y: y - 9, width: 20, height: 18,
        text: '…', fontSize: 14, textAlign: 'center', verticalAlign: 'middle', strokeColor: a.strokeColor,
      });
      marker.groupIds = [...owner.groupIds];
      marker.customData = { role: a.type === 'arrow' ? 'partition-input-ellipsis' : 'hash-table-ellipsis',
        omitted, total: a.customData?.partitionTotal };
      elements.push(marker);
    }
  }
}
