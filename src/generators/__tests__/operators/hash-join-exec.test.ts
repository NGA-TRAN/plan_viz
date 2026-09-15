import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';
import { ExecutionPlanNode } from '../../../types/execution-plan.types';
import { ExcalidrawArrow } from '../../../types/excalidraw.types';

describe('ExcalidrawGenerator - HashJoinExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('HashJoinExec operator', () => {
    it('should generate HashJoinExec with join properties', () => {
      const left = {
        ...NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[left.parquet]]',
        }),
        level: 1,
      };
      const right = {
        ...NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[right.parquet]]',
        }),
        level: 1,
      };

      const node = NodeBuilder.createHashJoinExec(
        {
          join_type: 'Inner',
          left_keys: '[col1@0]',
          right_keys: '[col2@0]',
        },
        [left, right]
      );

      const result = generator.generate(node);

      TestHelpers.assertHasOperator(result, 'HashJoinExec');
    });

    it('should handle HashJoinExec with projection property', () => {
      const left = {
        ...NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[left.parquet]]',
        }),
        level: 1,
      };
      const right = {
        ...NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[right.parquet]]',
        }),
        level: 1,
      };

      const node = NodeBuilder.createHashJoinExec(
        {
          join_type: 'Inner',
          on: '[(col1@0, col2@0)]',
          projection: '[col1@0, col2@1, col3@2]',
        },
        [left, right]
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle HashJoinExec with filter', () => {
      const left = {
        ...NodeBuilder.createSimpleNode('TableScan', 1),
      };
      const right = {
        ...NodeBuilder.createSimpleNode('TableScan', 1),
      };

      const node = NodeBuilder.createHashJoinExec(
        {
          join_type: 'Left',
          filter: 'left.col1@0 > right.col2@0',
        },
        [left, right]
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle HashJoinExec with 2 arrows on build side', () => {
      const buildSide = {
        ...NodeBuilder.createRepartitionExec('Hash([col1@0], 2)', [
          {
            ...NodeBuilder.createDataSourceExec({
              file_groups: '1 groups: [[left.parquet]]',
            }),
            level: 2,
          },
        ]),
        level: 1,
      };
      const probeSide = {
        ...NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[right.parquet]]',
        }),
        level: 1,
      };

      const node = NodeBuilder.createHashJoinExec(
        {
          join_type: 'Inner',
          on: '[(col1@0, col2@0)]',
        },
        [buildSide, probeSide]
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle HashJoinExec with 3+ arrows on build side', () => {
      const buildSide = {
        ...NodeBuilder.createRepartitionExec('Hash([col1@0], 3)', [
          {
            ...NodeBuilder.createDataSourceExec({
              file_groups: '1 groups: [[left.parquet]]',
            }),
            level: 2,
          },
        ]),
        level: 1,
      };
      const probeSide = {
        ...NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[right.parquet]]',
        }),
        level: 1,
      };

      const node = NodeBuilder.createHashJoinExec(
        {
          join_type: 'Inner',
          on: '[(col1@0, col2@0)]',
        },
        [buildSide, probeSide]
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle HashJoinExec with 2 arrows on probe side', () => {
      const buildSide = {
        ...NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[left.parquet]]',
        }),
        level: 1,
      };
      const probeSide = {
        ...NodeBuilder.createRepartitionExec('Hash([col2@0], 2)', [
          {
            ...NodeBuilder.createDataSourceExec({
              file_groups: '1 groups: [[right.parquet]]',
            }),
            level: 2,
          },
        ]),
        level: 1,
      };

      const node = NodeBuilder.createHashJoinExec(
        {
          join_type: 'Inner',
          on: '[(col1@0, col2@0)]',
        },
        [buildSide, probeSide]
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle HashJoinExec with 3+ arrows on probe side', () => {
      const buildSide = {
        ...NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[left.parquet]]',
        }),
        level: 1,
      };
      const probeSide = {
        ...NodeBuilder.createRepartitionExec('Hash([col2@0], 3)', [
          {
            ...NodeBuilder.createDataSourceExec({
              file_groups: '1 groups: [[right.parquet]]',
            }),
            level: 2,
          },
        ]),
        level: 1,
      };

      const node = NodeBuilder.createHashJoinExec(
        {
          join_type: 'Inner',
          on: '[(col1@0, col2@0)]',
        },
        [buildSide, probeSide]
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should throw error when HashJoinExec has wrong number of children', () => {
      const node = NodeBuilder.createHashJoinExec(
        {
          join_type: 'Inner',
          on: '[(col1@0, col2@0)]',
        },
        [
          {
            ...NodeBuilder.createDataSourceExec({
              file_groups: '1 groups: [[left.parquet]]',
            }),
            level: 1,
          },
        ] as unknown as [ExecutionPlanNode, ExecutionPlanNode]
      );

      expect(() => generator.generate(node)).toThrow(/must have exactly 2 children/);
    });

    it('should render Partitioned mode with one hash table per partition', () => {
      const left = {
        ...NodeBuilder.createRepartitionExec('Hash([id@0], 4)', [
          NodeBuilder.createDataSourceExec({
            file_groups: '2 groups: [[l1.parquet], [l2.parquet]]',
            projection: '[id]',
          }),
        ]),
        level: 1,
      };
      const right = {
        ...NodeBuilder.createRepartitionExec('Hash([id@0], 4)', [
          NodeBuilder.createDataSourceExec({
            file_groups: '2 groups: [[r1.parquet], [r2.parquet]]',
            projection: '[id]',
          }),
        ]),
        level: 1,
      };
      const node = NodeBuilder.createHashJoinExec(
        {
          mode: 'Partitioned',
          join_type: 'Inner',
          on: '[(id@0, id@0)]',
        },
        [left, right]
      );

      const result = generator.generate(node);
      const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
      expect(texts.some((text) => text.includes('HashJoinExec') && text.includes('Partitioned'))).toBe(
        true
      );
      const tableLabels = texts.filter((text) => text === 'HashTable' || text === 'HT');
      expect(tableLabels).toHaveLength(4);
      expect(texts).not.toContain('unimplemented');

      const tables = TestHelpers.getEllipses(result.elements).filter(
        (ellipse) => ellipse.strokeColor === '#f08c00'
      );
      expect(tables).toHaveLength(4);
      const arrows = TestHelpers.getArrows(result.elements) as ExcalidrawArrow[];
      for (const table of tables) {
        const incoming = arrows.filter((arrow) => arrow.endBinding?.elementId === table.id);
        expect(incoming.length).toBeGreaterThanOrEqual(2);
        const ends = incoming.map((arrow) => ({
          x: arrow.x + arrow.points[1][0],
          y: arrow.y + arrow.points[1][1],
        }));
        for (const end of ends) {
          expect(end.x).toBeCloseTo(ends[0].x);
          expect(end.y).toBeCloseTo(ends[0].y);
        }
        expect(ends[0].x).toBeCloseTo(table.x + table.width / 2);
        expect(ends[0].y).toBeCloseTo(table.y + table.height);
      }
    });

    it('should widen a unary parent so Partitioned join arrows stay on the box', () => {
      const left = {
        ...NodeBuilder.createRepartitionExec('Hash([id@0], 4)', [
          NodeBuilder.createDataSourceExec({
            file_groups: '2 groups: [[l1.parquet], [l2.parquet]]',
            projection: '[id]',
          }),
        ]),
        level: 2,
      };
      const right = {
        ...NodeBuilder.createRepartitionExec('Hash([id@0], 4)', [
          NodeBuilder.createDataSourceExec({
            file_groups: '2 groups: [[r1.parquet], [r2.parquet]]',
            projection: '[id]',
          }),
        ]),
        level: 2,
      };
      const join = {
        ...NodeBuilder.createHashJoinExec(
          {
            mode: 'Partitioned',
            join_type: 'Inner',
            on: '[(id@0, id@0)]',
          },
          [left, right]
        ),
        level: 1,
      };
      const node = NodeBuilder.createAggregateExec(
        'SinglePartitioned',
        '[id@0 as id]',
        '[count(Int64(1))]',
        [join]
      );

      const result = generator.generate(node);
      const boxes = TestHelpers.getRectangles(result.elements).sort((a, b) => a.y - b.y);
      const aggregateBox = boxes[0];
      const joinBox = boxes[1];
      expect(aggregateBox.width).toBe(joinBox.width);
      expect(aggregateBox.x).toBeCloseTo(joinBox.x);

      const arrows = TestHelpers.getArrows(result.elements) as ExcalidrawArrow[];
      const incoming = arrows.filter((arrow) => arrow.endBinding?.elementId === aggregateBox.id);
      expect(incoming.length).toBeGreaterThanOrEqual(2);
      for (const arrow of incoming) {
        const endX = arrow.x + arrow.points[1][0];
        expect(endX).toBeGreaterThanOrEqual(aggregateBox.x - 1);
        expect(endX).toBeLessThanOrEqual(aggregateBox.x + aggregateBox.width + 1);
      }
    });
  });
});

