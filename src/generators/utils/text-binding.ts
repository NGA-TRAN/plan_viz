import { ExcalidrawElement } from '../../types/excalidraw.types';

/**
 * Completes text bindings after all generators have populated the scene.
 * Excalidraw exports bound text through its container's reverse reference.
 */
export function bindTextToContainers(elements: ExcalidrawElement[]): void {
  const byId = new Map(elements.map((element) => [element.id, element]));

  for (const element of elements) {
    if (element.type !== 'text' || element.containerId === null) {
      continue;
    }
    const container = byId.get(element.containerId);
    if (!container || container.type === 'text') {
      continue;
    }

    container.boundElements ??= [];
    if (!container.boundElements.some(
      (binding) => binding.type === 'text' && binding.id === element.id
    )) {
      container.boundElements.push({ id: element.id, type: 'text' });
    }
  }
}
