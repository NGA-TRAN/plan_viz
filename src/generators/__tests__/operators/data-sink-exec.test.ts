import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - DataSinkExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should render DataSinkExec with sink, not unimplemented', () => {
    const node = NodeBuilder.createNodeWithChildren(
      'DataSinkExec',
      [
        NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[t.parquet]]',
          projection: '[id]',
        }),
      ],
      0,
      { sink: 'FileSink(path=out.parquet)' }
    );
    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    TestHelpers.assertHasOperator(result, 'DataSinkExec');
    expect(texts.some((text) => text.includes('sink=FileSink(path=out.parquet)'))).toBe(true);
    expect(texts).not.toContain('unimplemented');
  });

  it('should render FileSinkExec with the same generator', () => {
    const node = NodeBuilder.createNodeWithChildren('FileSinkExec', [
      NodeBuilder.createDataSourceExec({
        file_groups: '1 groups: [[t.parquet]]',
      }),
    ]);
    const result = generator.generate(node);
    TestHelpers.assertHasOperator(result, 'FileSinkExec');
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    expect(texts).not.toContain('unimplemented');
  });
});
