import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - LazyMemoryExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should render LazyMemoryExec, not unimplemented', () => {
    const node = NodeBuilder.createNodeWithChildren('LazyMemoryExec', [], 0, {
      partitions: '4',
      partition_sizes: '[1, 1, 1, 1]',
    });

    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    TestHelpers.assertHasOperator(result, 'LazyMemoryExec');
    expect(texts.some((text) => text.includes('partitions=4'))).toBe(true);
    expect(texts.some((text) => text.includes('partition_sizes='))).toBe(true);
    expect(texts).not.toContain('unimplemented');
  });

  it('should render ValuesExec with the same generator', () => {
    const node = NodeBuilder.createNodeWithChildren('ValuesExec', [], 0, { partitions: '1' });
    const result = generator.generate(node);
    TestHelpers.assertHasOperator(result, 'ValuesExec');
    expect(TestHelpers.getTextElements(result.elements).map((t) => t.text)).not.toContain(
      'unimplemented'
    );
  });

  it('should emit 4 arrows for partitions=4 under a ProjectionExec', () => {
    const memory = NodeBuilder.createNodeWithChildren('LazyMemoryExec', [], 1, {
      partitions: '4',
      partition_sizes: '[1, 1, 1, 1]',
    });
    const node = NodeBuilder.createProjectionExec('[column1]', [memory]);

    const result = generator.generate(node);
    TestHelpers.assertHasArrows(result, 4);
  });
});
