import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - CooperativeExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should render CooperativeExec, not unimplemented', () => {
    const node = NodeBuilder.createNodeWithChildren('CooperativeExec', [
      NodeBuilder.createDataSourceExec({
        file_groups: '2 groups: [[a.parquet], [b.parquet]]',
        projection: '[id]',
      }),
    ]);
    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    TestHelpers.assertHasOperator(result, 'CooperativeExec');
    expect(texts).not.toContain('unimplemented');
  });
});
