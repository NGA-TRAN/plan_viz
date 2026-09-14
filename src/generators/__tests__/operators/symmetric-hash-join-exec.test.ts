import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';
import { COLORS } from '../../constants';
import { ExecutionPlanNode } from '../../../types/execution-plan.types';

type ScanPair = [ExecutionPlanNode, ExecutionPlanNode];

describe('ExcalidrawGenerator - SymmetricHashJoinExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  function twoScans(leftGroups: string, rightGroups: string): ScanPair {
    return [
      {
        ...NodeBuilder.createDataSourceExec({
          file_groups: leftGroups,
          projection: '[l, ts]',
        }),
        level: 1,
      },
      {
        ...NodeBuilder.createDataSourceExec({
          file_groups: rightGroups,
          projection: '[r, ts]',
        }),
        level: 1,
      },
    ];
  }

  it('should render SymmetricHashJoinExec with two HashTable ellipses', () => {
    const node = NodeBuilder.createNodeWithChildren(
      'SymmetricHashJoinExec',
      twoScans('2 groups: [[l.parquet], [l2.parquet]]', '2 groups: [[r.parquet], [r2.parquet]]'),
      0,
      {
        mode: 'Partitioned',
        join_type: 'Inner',
        on: '[(l@0, r@0)]',
        filter: 'l.ts@1 > r.ts@1 - Interval',
      }
    );

    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    const hashTables = texts.filter((text) => text === 'HashTable');
    const orangeEllipses = TestHelpers.getEllipses(result.elements).filter(
      (el) => el.strokeColor === COLORS.ORANGE_BORDER
    );

    TestHelpers.assertHasOperator(result, 'SymmetricHashJoinExec');
    expect(texts.some((text) => text.includes('mode=Partitioned'))).toBe(true);
    expect(texts.some((text) => text.includes('join_type=Inner'))).toBe(true);
    expect(texts.some((text) => text.includes('on='))).toBe(true);
    expect(texts.some((text) => text.includes('filter='))).toBe(true);
    expect(texts).not.toContain('unimplemented');
    expect(hashTables).toHaveLength(2);
    expect(orangeEllipses).toHaveLength(2);
  });

  it('should throw when child count is not 2', () => {
    expect(() =>
      generator.generate(NodeBuilder.createNodeWithChildren('SymmetricHashJoinExec', [], 0))
    ).toThrow(/exactly 2 children/);
    expect(() =>
      generator.generate(
        NodeBuilder.createNodeWithChildren('SymmetricHashJoinExec', [
          NodeBuilder.createDataSourceExec({ file_groups: '1 groups: [[l.parquet]]' }),
        ])
      )
    ).toThrow(/exactly 2 children/);
  });

  it('should use max(left, right) output arrows when sides differ', () => {
    const join = NodeBuilder.createNodeWithChildren(
      'SymmetricHashJoinExec',
      twoScans(
        '2 groups: [[l1.parquet], [l2.parquet]]',
        '3 groups: [[r1.parquet], [r2.parquet], [r3.parquet]]'
      ),
      0,
      { mode: 'Partitioned', join_type: 'Inner', on: '[(l@0, r@0)]' }
    );
    const node = NodeBuilder.createProjectionExec('[l, r]', [join]);

    const result = generator.generate(node);
    // 2+3 file-group, 2+3 into join ellipses, max(2,3)=3 into Projection.
    TestHelpers.assertHasArrows(result, 13);
  });
});
