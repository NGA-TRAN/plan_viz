import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';
import { COLORS } from '../../constants';

describe('ExcalidrawGenerator - UnnestExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should render UnnestExec with list/struct details, not unimplemented', () => {
    const node = NodeBuilder.createNodeWithChildren('UnnestExec', [], 0, {
      list_type: '[arr@1]',
      struct_type: '[]',
    });

    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);

    TestHelpers.assertHasOperator(result, 'UnnestExec');
    expect(texts.some((text) => text.includes('list_type=[arr@1]'))).toBe(true);
    expect(texts).not.toContain('unimplemented');
  });

  it('should render list and struct detail keys', () => {
    const node = NodeBuilder.createNodeWithChildren('UnnestExec', [], 0, {
      list: '[tags]',
      struct: '[meta]',
    });
    const texts = TestHelpers.getTextElements(generator.generate(node).elements).map(
      (t) => t.text
    );
    expect(texts.some((text) => text.includes('list=[tags]'))).toBe(true);
    expect(texts.some((text) => text.includes('struct=[meta]'))).toBe(true);
  });

  it('should render UnnestExec with no properties', () => {
    const node = NodeBuilder.createNodeWithChildren('UnnestExec', []);
    const result = generator.generate(node);
    TestHelpers.assertHasOperator(result, 'UnnestExec');
    expect(TestHelpers.getTextElements(result.elements).map((t) => t.text)).not.toContain(
      'unimplemented'
    );
  });

  it('should keep one arrow per child partition', () => {
    const unnest = NodeBuilder.createNodeWithChildren(
      'UnnestExec',
      [
        NodeBuilder.createDataSourceExec({
          file_groups: '3 groups: [[a.parquet], [b.parquet], [c.parquet]]',
          projection: '[id, arr]',
        }),
      ],
      0,
      { list_type: '[arr@1]' }
    );
    const node = NodeBuilder.createProjectionExec('[id, arr]', [unnest]);

    const result = generator.generate(node);
    // 3 file-group arrows + 3 into Unnest + 3 into Projection
    TestHelpers.assertHasArrows(result, 9);
  });

  it('should drop output sort even when the child is sorted', () => {
    const node = NodeBuilder.createProjectionExec('[id, arr]', [
      NodeBuilder.createNodeWithChildren(
        'UnnestExec',
        [
          NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[t.parquet]]',
            projection: '[id, arr]',
            output_ordering: '[id@0 ASC]',
          }),
        ],
        0,
        { list_type: '[arr@1]' }
      ),
    ]);

    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements);
    expect(texts.some((t) => t.text.includes('id') && t.strokeColor === COLORS.ORDERED_COLUMN)).toBe(
      true
    );
    expect(
      texts.some((t) => t.text.includes('id') && t.strokeColor !== COLORS.ORDERED_COLUMN)
    ).toBe(true);
  });
});
