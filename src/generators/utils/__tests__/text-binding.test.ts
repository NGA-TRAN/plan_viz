import { ElementFactory } from '../../factories/element.factory';
import { IdGenerator } from '../id.generator';
import { bindTextToContainers } from '../text-binding';
import { ExcalidrawElement } from '../../../types/excalidraw.types';

const factory = new ElementFactory(new IdGenerator(), {
  nodeWidth: 200, nodeHeight: 80, verticalSpacing: 100, horizontalSpacing: 50,
  fontSize: 16, operatorFontSize: 20, detailsFontSize: 14,
  nodeColor: '#1e1e1e', arrowColor: '#1e1e1e',
});
const geometry = { x: 0, y: 0, width: 200, height: 80 };

describe('bindTextToContainers', () => {
  it.each(['rectangle', 'ellipse', 'arrow'] as const)(
    'binds text to a %s even when text precedes its container',
    (type) => {
      const container = type === 'rectangle' ?
        factory.createRectangle({ id: 'container', ...geometry }) :
        type === 'ellipse' ?
          factory.createEllipse({ id: 'container', ...geometry }) :
          factory.createArrow({
            id: 'container', startX: 0, startY: 0, endX: 0, endY: 100,
            childRectId: 'child', parentRectId: 'parent',
          });
      container.boundElements = null;
      const text = factory.createText({
        id: 'label', ...geometry, text: 'label', containerId: container.id,
      });
      bindTextToContainers([text, container]);
      expect(container.boundElements).toEqual([{ id: text.id, type: 'text' }]);
      expect(text.containerId).toBe(container.id);
    }
  );

  it('preserves arrows, geometry and grouping and does not duplicate existing text bindings', () => {
    const container = factory.createRectangle({ id: 'container', ...geometry });
    container.groupIds = ['node-group'];
    container.boundElements = [{ id: 'arrow', type: 'arrow' }];
    const text = factory.createText({
      id: 'label', ...geometry, text: 'label', containerId: container.id,
    });
    const elements = [container, text];
    const before = JSON.parse(JSON.stringify(elements)) as ExcalidrawElement[];
    bindTextToContainers(elements);
    bindTextToContainers(elements);
    expect(container.boundElements).toEqual([
      { id: 'arrow', type: 'arrow' }, { id: text.id, type: 'text' },
    ]);
    expect(elements.map((element) => ({ ...element, boundElements: [] }))).toEqual(
      before.map((element) => ({ ...element, boundElements: [] }))
    );
  });

  it('leaves standalone text and unresolved or invalid container references unchanged', () => {
    const standalone = factory.createText({ id: 'free', ...geometry, text: 'details' });
    const missing = factory.createText({
      id: 'missing', ...geometry, text: 'missing', containerId: 'absent',
    });
    const invalid = factory.createText({
      id: 'invalid', ...geometry, text: 'invalid', containerId: standalone.id,
    });
    const elements = [standalone, missing, invalid];
    const before = JSON.parse(JSON.stringify(elements)) as ExcalidrawElement[];
    bindTextToContainers(elements);
    expect(elements).toEqual(before);
  });

  it('handles an empty scene', () => {
    const elements: ExcalidrawElement[] = [];
    bindTextToContainers(elements);
    expect(elements).toEqual([]);
  });
});
