import { ExcalidrawElement } from '../../../types/excalidraw.types';

/** Checks both directions before fixture normalization discards generated IDs. */
export function assertTextBindings(elements: ExcalidrawElement[]): void {
  const byId = new Map(elements.map((element) => [element.id, element]));
  for (const element of elements) {
    if (element.type === 'text' && element.containerId !== null) {
      const container = byId.get(element.containerId);
      expect(container).toBeDefined();
      expect(['rectangle', 'ellipse', 'arrow']).toContain(container?.type);
      expect(container?.boundElements?.filter(
        (binding) => binding.type === 'text' && binding.id === element.id
      )).toEqual([{ id: element.id, type: 'text' }]);
    }
    for (const binding of element.boundElements ?? []) {
      if (binding.type === 'text') {
        const label = byId.get(binding.id);
        expect(label?.type).toBe('text');
        if (label?.type === 'text') {
          expect(label.containerId).toBe(element.id);
        }
      }
    }
  }
}
