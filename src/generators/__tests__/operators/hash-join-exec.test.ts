import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';
import { ExecutionPlanNode } from '../../../types/execution-plan.types';

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
  });
});

