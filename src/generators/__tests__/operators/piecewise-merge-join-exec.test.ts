import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';
import { COLORS } from '../../constants';
import { ExecutionPlanNode } from '../../../types/execution-plan.types';

type ScanPair = [ExecutionPlanNode, ExecutionPlanNode];

describe('ExcalidrawGenerator - PiecewiseMergeJoinExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  function sortedSides(): ScanPair {
    return [
      {
        ...NodeBuilder.createSortExec('[ts@0 ASC]', [
          NodeBuilder.createDataSourceExec({
            file_groups: '2 groups: [[l1.parquet], [l2.parquet]]',
            projection: '[ts, val]',
          }),
        ]),
        level: 1,
      },
      {
        ...NodeBuilder.createSortExec('[ts@0 ASC]', [
          NodeBuilder.createDataSourceExec({
            file_groups: '2 groups: [[r1.parquet], [r2.parquet]]',
            projection: '[ts, val]',
          }),
        ]),
        level: 1,
      },
    ];
  }

  it('should render PiecewiseMergeJoinExec with join_type, on, and op', () => {
    const node = NodeBuilder.createNodeWithChildren('PiecewiseMergeJoinExec', sortedSides(), 0, {
      join_type: 'Inner',
      on: '[(ts@0, ts@0)]',
      op: 'GtEq',
    });

    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);

    TestHelpers.assertHasOperator(result, 'PiecewiseMergeJoinExec');
    expect(texts.some((text) => text.includes('join_type=Inner'))).toBe(true);
    expect(texts.some((text) => text.includes('on='))).toBe(true);
    expect(texts.some((text) => text.includes('op=GtEq'))).toBe(true);
    expect(texts).not.toContain('unimplemented');
    expect(texts).not.toContain('HashTable');
    const orangeEllipses = TestHelpers.getEllipses(result.elements).filter(
      (el) => el.strokeColor === COLORS.ORANGE_BORDER
    );
    expect(orangeEllipses).toHaveLength(0);
  });

  it('should throw when child count is not 2', () => {
    expect(() =>
      generator.generate(NodeBuilder.createNodeWithChildren('PiecewiseMergeJoinExec', [], 0))
    ).toThrow(/exactly 2 children/);
  });

  it('should color the join key blue when both children are sorted on it', () => {
    const join = NodeBuilder.createNodeWithChildren('PiecewiseMergeJoinExec', sortedSides(), 0, {
      join_type: 'Inner',
      on: '[(ts@0, ts@0)]',
      op: 'GtEq',
    });
    const node = NodeBuilder.createProjectionExec('[ts, val]', [join]);

    const result = generator.generate(node);
    const labels = TestHelpers.getTextElements(result.elements);
    const blueTs = labels.filter(
      (t) => t.strokeColor === COLORS.ORDERED_COLUMN && t.text.includes('ts')
    );
    expect(blueTs.length).toBeGreaterThan(0);
    const leftPair = labels.find((t) => t.text === 'ts' && t.strokeColor === COLORS.ORDERED_COLUMN);
    const valNextToTs = labels.find(
      (t) => t.text === ', val' && leftPair && Math.abs(t.y - leftPair.y) < 1
    );
    expect(valNextToTs).toBeDefined();
    if (leftPair && valNextToTs) {
      expect(leftPair.x + leftPair.width).toBeLessThanOrEqual(valNextToTs.x + 0.01);
    }
  });

  it('should emit left-side output arrows', () => {
    const join = NodeBuilder.createNodeWithChildren('PiecewiseMergeJoinExec', sortedSides(), 0, {
      join_type: 'Inner',
      on: '[(ts@0, ts@0)]',
      op: 'GtEq',
    });
    const node = NodeBuilder.createProjectionExec('[ts, val]', [join]);

    const result = generator.generate(node);
    // 2+2 file-group, 2+2 into Sort, 2+2 into join, 2 into Projection.
    TestHelpers.assertHasArrows(result, 14);
  });
});
