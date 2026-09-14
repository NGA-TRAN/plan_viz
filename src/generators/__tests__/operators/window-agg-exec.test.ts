import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';
import { COLORS } from '../../constants';

describe('ExcalidrawGenerator - WindowAggExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should render WindowAggExec and wdw details, not unimplemented', () => {
    const node = NodeBuilder.createNodeWithChildren('WindowAggExec', [], 0, {
      wdw: '[row_number(): Field { name: "row_number" }, frame: WindowFrame { units: Rows }]',
    });

    const result = generator.generate(node);

    TestHelpers.assertHasOperator(result, 'WindowAggExec');
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    expect(texts.some((text) => text.includes('wdw='))).toBe(true);
    expect(texts).not.toContain('unimplemented');
  });

  it('should keep one arrow per child partition', () => {
    const windowNode = NodeBuilder.createNodeWithChildren(
      'WindowAggExec',
      [
        NodeBuilder.createDataSourceExec({
          file_groups: '4 groups: [[a.parquet], [b.parquet], [c.parquet], [d.parquet]]',
          projection: '[user_id, ts, val]',
        }),
      ],
      0,
      {
        wdw: '[row_number(): Field { name: "row_number" }]',
      }
    );
    const node = NodeBuilder.createProjectionExec('[user_id, ts, val, rn]', [windowNode]);

    const result = generator.generate(node);
    // 4 file-group arrows + 4 into Window + 4 into Projection
    TestHelpers.assertHasArrows(result, 12);
  });

  it('should render without wdw and truncate a long wdw string', () => {
    const bare = NodeBuilder.createNodeWithChildren('WindowAggExec', []);
    TestHelpers.assertHasOperator(generator.generate(bare), 'WindowAggExec');

    const longWdw = `row_number(): Field { name: "row_number" }, ${'x'.repeat(100)}`;
    const truncated = generator.generate(
      NodeBuilder.createNodeWithChildren('WindowAggExec', [], 0, {
        wdw: longWdw,
        partition_by: 'user_id',
      })
    );
    const wdwLine = TestHelpers.getTextElements(truncated.elements).find((t) =>
      t.text.startsWith('wdw=')
    );
    expect(wdwLine?.text.startsWith('wdw=')).toBe(true);
    expect(wdwLine?.text.endsWith('...')).toBe(true);
    expect(wdwLine && wdwLine.text.slice(4).length <= 80).toBe(true);
    expect(
      TestHelpers.getTextElements(truncated.elements).some((t) =>
        t.text.includes('partition_by=[user_id]')
      )
    ).toBe(true);
  });

  it('should sit directly on already-sorted DataSourceExec without SortExec', () => {
    const node = NodeBuilder.createNodeWithChildren(
      'WindowAggExec',
      [
        NodeBuilder.createDataSourceExec({
          file_groups: '4 groups: [[a.parquet], [b.parquet], [c.parquet], [d.parquet]]',
          projection: '[user_id, ts, val]',
          output_ordering: '[user_id@0 ASC, ts@1 ASC]',
        }),
      ],
      0,
      {
        wdw: '[row_number(): Field { name: "row_number" }]',
        partition_by: '[user_id@0]',
        order_by: '[ts@1 ASC]',
      }
    );

    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    TestHelpers.assertHasOperator(result, 'WindowAggExec');
    TestHelpers.assertHasOperator(result, 'DataSourceExec');
    expect(texts).not.toContain('SortExec');
    expect(texts.some((text) => text.includes('partition_by=[user_id]'))).toBe(true);
    expect(TestHelpers.getTextElements(result.elements).some(
      (t) => t.strokeColor === COLORS.ORDERED_COLUMN
    )).toBe(true);
  });

  it('should preserve child sort and highlight parsed partition/order columns', () => {
    const node = NodeBuilder.createNodeWithChildren(
      'WindowAggExec',
      [
        NodeBuilder.createDataSourceExec({
          file_groups: '2 groups: [[a.parquet], [b.parquet]]',
          projection: '[user_id, ts, val]',
          output_ordering: '[user_id@0 ASC, ts@1 ASC]',
        }),
      ],
      0,
      {
        wdw: '[sum(val): Field { name: "sum" }, partition_by=[user_id@0], order_by=[ts@1 ASC]]',
      }
    );

    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements);
    expect(texts.some((t) => t.text.includes('partition_by=[user_id]'))).toBe(true);
    expect(texts.some((t) => t.text.includes('order_by=[ts]'))).toBe(true);
    expect(texts.some((t) => t.strokeColor === COLORS.ORDERED_COLUMN)).toBe(true);
  });

  it('should still render with zero or two children', () => {
    const empty = NodeBuilder.createNodeWithChildren('WindowAggExec', [], 0, {
      wdw: '[row_number(): Field { name: "row_number" }]',
    });
    TestHelpers.assertHasOperator(generator.generate(empty), 'WindowAggExec');

    const twoChildren = NodeBuilder.createNodeWithChildren(
      'WindowAggExec',
      [
        NodeBuilder.createDataSourceExec({ file_groups: '1 groups: [[a.parquet]]' }),
        NodeBuilder.createDataSourceExec({ file_groups: '1 groups: [[b.parquet]]' }),
      ],
      0,
      { wdw: '[row_number(): Field { name: "row_number" }]' }
    );
    const result = generator.generate(twoChildren);
    TestHelpers.assertHasOperator(result, 'WindowAggExec');
    TestHelpers.assertHasArrows(result);
  });
});
