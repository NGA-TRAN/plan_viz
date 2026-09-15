import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - StreamingTableExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should render StreamingTableExec details, not unimplemented', () => {
    const node = NodeBuilder.createNodeWithChildren('StreamingTableExec', [], 0, {
      partition_sizes: '4',
      projection: '[id]',
      infinite_source: 'true',
    });
    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    TestHelpers.assertHasOperator(result, 'StreamingTableExec');
    expect(texts.some((text) => text.includes('partition_sizes=4'))).toBe(true);
    expect(texts.some((text) => text.includes('infinite_source=true'))).toBe(true);
    expect(texts).not.toContain('unimplemented');
    const box = TestHelpers.getRectangles(result.elements)[0];
    const details = TestHelpers.getTextElements(result.elements).find((t) =>
      t.text.includes('infinite_source=true')
    );
    expect(details).toBeDefined();
    expect(details!.y + details!.height).toBeLessThanOrEqual(box.y + box.height);
  });

  it('should emit four arrows under a ProjectionExec', () => {
    const leaf = NodeBuilder.createNodeWithChildren('StreamingTableExec', [], 1, {
      partition_sizes: '4',
      projection: '[id]',
    });
    const node = NodeBuilder.createProjectionExec('[id]', [leaf]);
    const result = generator.generate(node);
    TestHelpers.assertHasArrows(result, 4);
  });
});
