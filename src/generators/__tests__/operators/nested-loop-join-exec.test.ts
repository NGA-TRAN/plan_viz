import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';
import { ExcalidrawArrow } from '../../../types/excalidraw.types';
import { ExecutionPlanNode } from '../../../types/execution-plan.types';

type ScanPair = [ExecutionPlanNode, ExecutionPlanNode];

describe('ExcalidrawGenerator - NestedLoopJoinExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  function twoScans(leftGroups: string, rightGroups: string): ScanPair {
    return [
      {
        ...NodeBuilder.createDataSourceExec({
          file_groups: leftGroups,
          projection: '[x, extra]',
        }),
        level: 1,
      },
      {
        ...NodeBuilder.createDataSourceExec({
          file_groups: rightGroups,
          projection: '[y]',
        }),
        level: 1,
      },
    ];
  }

  it('should render NestedLoopJoinExec with join_type and filter', () => {
    const node = NodeBuilder.createNodeWithChildren(
      'NestedLoopJoinExec',
      twoScans('1 groups: [[l.parquet]]', '1 groups: [[r.parquet]]'),
      0,
      {
        join_type: 'Inner',
        filter: 'left.x@0 > right.y@0',
      }
    );

    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);

    TestHelpers.assertHasOperator(result, 'NestedLoopJoinExec');
    expect(texts.some((text) => text.includes('join_type=Inner'))).toBe(true);
    expect(texts.some((text) => text.includes('filter=left.x@0 > right.y@0'))).toBe(true);
    expect(texts).not.toContain('unimplemented');
    expect(texts).not.toContain('HashTable');
    expect(texts).toContain('Buffer');
  });

  it('should throw when child count is not 2', () => {
    expect(() =>
      generator.generate(NodeBuilder.createNodeWithChildren('NestedLoopJoinExec', [], 0))
    ).toThrow(/exactly 2 children/);
    expect(() =>
      generator.generate(
        NodeBuilder.createNodeWithChildren('NestedLoopJoinExec', [
          NodeBuilder.createDataSourceExec({ file_groups: '1 groups: [[l.parquet]]' }),
        ])
      )
    ).toThrow(/exactly 2 children/);
    expect(() =>
      generator.generate(
        NodeBuilder.createNodeWithChildren('NestedLoopJoinExec', [
          NodeBuilder.createDataSourceExec({ file_groups: '1 groups: [[a.parquet]]' }),
          NodeBuilder.createDataSourceExec({ file_groups: '1 groups: [[b.parquet]]' }),
          NodeBuilder.createDataSourceExec({ file_groups: '1 groups: [[c.parquet]]' }),
        ])
      )
    ).toThrow(/exactly 2 children/);
  });

  it('should emit probe-side output arrows (3 from a 2x3 join)', () => {
    const join = NodeBuilder.createNodeWithChildren(
      'NestedLoopJoinExec',
      twoScans(
        '2 groups: [[l1.parquet], [l2.parquet]]',
        '3 groups: [[r1.parquet], [r2.parquet], [r3.parquet]]'
      ),
      0,
      { join_type: 'Inner', filter: 'x@0 > y@0' }
    );
    const node = NodeBuilder.createProjectionExec('[x, y]', [join]);

    const result = generator.generate(node);
    // 2+3 file-group arrows, 2+3 into the join, 3 probe outputs into Projection.
    TestHelpers.assertHasArrows(result, 13);
  });

  it('should render projection and truncate a long filter', () => {
    const longFilter = 'left.x@0 > right.y@0 AND left.extra@1 <> right.y@0 AND left.x@0 IS NOT NULL';
    const node = NodeBuilder.createNodeWithChildren(
      'NestedLoopJoinExec',
      twoScans('1 groups: [[l.parquet]]', '1 groups: [[r.parquet]]'),
      0,
      {
        join_type: 'Inner',
        filter: longFilter,
        projection: '[x@0, y@2]',
      }
    );

    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    expect(texts.some((text) => text.includes('projection=[x@0, y@2]'))).toBe(true);
    const filterLine = texts.find((text) => text.includes('filter='));
    expect(filterLine).toBeDefined();
    const filterValue = filterLine?.split('\n').find((line) => line.startsWith('filter='));
    expect(filterValue?.includes('...')).toBe(true);
    expect(filterValue && filterValue.length <= 70).toBe(true);
  });

  it('should join children that have no output columns', () => {
    const node = NodeBuilder.createNodeWithChildren(
      'NestedLoopJoinExec',
      [NodeBuilder.createSimpleNode('TableScan', 1), NodeBuilder.createSimpleNode('TableScan', 1)],
      0,
      { join_type: 'Full' }
    );

    const result = generator.generate(node);
    TestHelpers.assertHasOperator(result, 'NestedLoopJoinExec');
    TestHelpers.assertHasArrows(result);
  });

  it('should bind child arrows to the join rectangle', () => {
    const node = NodeBuilder.createNodeWithChildren(
      'NestedLoopJoinExec',
      twoScans('1 groups: [[l.parquet]]', '1 groups: [[r.parquet]]'),
      0,
      { join_type: 'Left', filter: 'x@0 > y@0' }
    );

    const result = generator.generate(node);
    const arrows = TestHelpers.getArrows(result.elements) as ExcalidrawArrow[];
    expect(arrows.length).toBeGreaterThan(0);
    expect(arrows.every((arrow) => arrow.startBinding && arrow.endBinding)).toBe(true);
  });
});
