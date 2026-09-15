import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - BufferExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should render BufferExec with capacity, not unimplemented', () => {
    const node = NodeBuilder.createNodeWithChildren(
      'BufferExec',
      [
        NodeBuilder.createDataSourceExec({
          file_groups: '2 groups: [[a.parquet], [b.parquet]]',
          projection: '[id]',
        }),
      ],
      0,
      { capacity: '8192' }
    );
    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    TestHelpers.assertHasOperator(result, 'BufferExec');
    expect(texts.some((text) => text.includes('capacity=8192'))).toBe(true);
    expect(texts).not.toContain('unimplemented');
  });

  it('should keep one arrow per child partition', () => {
    const buffer = NodeBuilder.createNodeWithChildren(
      'BufferExec',
      [
        NodeBuilder.createDataSourceExec({
          file_groups: '2 groups: [[a.parquet], [b.parquet]]',
          projection: '[id]',
        }),
      ],
      0,
      { capacity: '8192' }
    );
    const node = NodeBuilder.createProjectionExec('[id]', [buffer]);
    const result = generator.generate(node);
    TestHelpers.assertHasArrows(result, 6);
  });
});
