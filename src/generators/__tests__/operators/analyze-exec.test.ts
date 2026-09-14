import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - AnalyzeExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should render AnalyzeExec with verbose, not unimplemented', () => {
    const node = NodeBuilder.createNodeWithChildren(
      'AnalyzeExec',
      [
        NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[t.parquet]]',
          projection: '[id]',
        }),
      ],
      0,
      { verbose: 'true' }
    );

    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    TestHelpers.assertHasOperator(result, 'AnalyzeExec');
    expect(texts.some((text) => text.includes('verbose=true'))).toBe(true);
    expect(texts).not.toContain('unimplemented');
  });

  it('should keep one arrow per child partition', () => {
    const analyze = NodeBuilder.createNodeWithChildren(
      'AnalyzeExec',
      [
        NodeBuilder.createDataSourceExec({
          file_groups: '2 groups: [[a.parquet], [b.parquet]]',
          projection: '[id]',
        }),
      ],
      0,
      { verbose: 'false' }
    );
    const node = NodeBuilder.createProjectionExec('[id]', [analyze]);

    const result = generator.generate(node);
    // 2 file-group arrows, 2 into Analyze, 2 into Projection
    TestHelpers.assertHasArrows(result, 6);
  });
});
