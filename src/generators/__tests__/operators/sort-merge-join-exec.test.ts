import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';
import { ExecutionPlanNode } from '../../../types/execution-plan.types';

describe('ExcalidrawGenerator - SortMergeJoinExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('SortMergeJoin operator', () => {
    it('should generate SortMergeJoin with join properties', () => {
      const left = {
        ...NodeBuilder.createDataSourceExec({
          file_groups: '3 groups: [[f1.parquet], [f2.parquet], [f3.parquet]]',
          projection: '[col1, col2]',
        }),
        level: 1,
      };
      const right = {
        ...NodeBuilder.createDataSourceExec({
          file_groups: '3 groups: [[f1.parquet], [f2.parquet], [f3.parquet]]',
          projection: '[col3, col4]',
        }),
        level: 1,
      };

      const node = NodeBuilder.createSortMergeJoinExec(
        {
          join_type: 'Inner',
          on: '[(col1@0, col1@0)]',
        },
        [left, right],
        'SortMergeJoin'
      );

      const result = generator.generate(node);

      TestHelpers.assertHasOperator(result, 'SortMergeJoin');
    });

    it('should generate SortMergeJoinExec with join properties', () => {
      const left = {
        ...NodeBuilder.createDataSourceExec({
          file_groups: '3 groups: [[f1.parquet], [f2.parquet], [f3.parquet]]',
        }),
        level: 1,
      };
      const right = {
        ...NodeBuilder.createDataSourceExec({
          file_groups: '3 groups: [[f1.parquet], [f2.parquet], [f3.parquet]]',
        }),
        level: 1,
      };

      const node = NodeBuilder.createSortMergeJoinExec(
        {
          join_type: 'Inner',
          on: '[(col1@0, col2@0)]',
        },
        [left, right]
      );

      const result = generator.generate(node);

      TestHelpers.assertHasOperator(result, 'SortMergeJoinExec');
    });

    it('should extract output sort order from on= property', () => {
      const left = {
        ...NodeBuilder.createDataSourceExec({
          file_groups: '3 groups: [[f1.parquet], [f2.parquet], [f3.parquet]]',
        }),
        level: 1,
      };
      const right = {
        ...NodeBuilder.createDataSourceExec({
          file_groups: '3 groups: [[f1.parquet], [f2.parquet], [f3.parquet]]',
        }),
        level: 1,
      };

      const node = NodeBuilder.createSortMergeJoinExec(
        {
          join_type: 'Inner',
          on: '[(col1@0, col2@0), (col3@1, col4@1)]',
        },
        [left, right],
        'SortMergeJoin'
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);

      const textElements = TestHelpers.getTextElements(result.elements);
      const detailText = textElements.find((t) => t.text?.includes('on='));
      expect(detailText).toBeDefined();
    });

    it('should throw error when inputs have different partition counts', () => {
      const left = {
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
      const right = {
        ...NodeBuilder.createRepartitionExec('Hash([col2@0], 4)', [
          {
            ...NodeBuilder.createDataSourceExec({
              file_groups: '1 groups: [[right.parquet]]',
            }),
            level: 2,
          },
        ]),
        level: 1,
      };

      const node = NodeBuilder.createSortMergeJoinExec(
        {
          join_type: 'Inner',
          on: '[(col1@0, col2@0)]',
        },
        [left, right],
        'SortMergeJoin'
      );

      expect(() => generator.generate(node)).toThrow(
        /requires both inputs to have the same number of partitions/
      );
    });

    it('should throw error when SortMergeJoin has wrong number of children', () => {
      const node = NodeBuilder.createSortMergeJoinExec(
        {
          join_type: 'Inner',
          on: '[(col1@0, col1@0)]',
        },
        [
          {
            ...NodeBuilder.createDataSourceExec({
              file_groups: '1 groups: [[left.parquet]]',
            }),
            level: 1,
          },
        ] as unknown as [ExecutionPlanNode, ExecutionPlanNode],
        'SortMergeJoin'
      );

      expect(() => generator.generate(node)).toThrow(/must have exactly 2 children/);
    });

    it('should handle SortMergeJoin with 2 arrows on both sides', () => {
      const left = {
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
      const right = {
        ...NodeBuilder.createRepartitionExec('Hash([col1@0], 2)', [
          {
            ...NodeBuilder.createDataSourceExec({
              file_groups: '1 groups: [[right.parquet]]',
            }),
            level: 2,
          },
        ]),
        level: 1,
      };

      const node = NodeBuilder.createSortMergeJoinExec(
        {
          join_type: 'Inner',
          on: '[(col1@0, col1@0)]',
        },
        [left, right],
        'SortMergeJoin'
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle SortMergeJoin with 3+ arrows on both sides', () => {
      const left = {
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
      const right = {
        ...NodeBuilder.createRepartitionExec('Hash([col1@0], 3)', [
          {
            ...NodeBuilder.createDataSourceExec({
              file_groups: '1 groups: [[right.parquet]]',
            }),
            level: 2,
          },
        ]),
        level: 1,
      };

      const node = NodeBuilder.createSortMergeJoinExec(
        {
          join_type: 'Inner',
          on: '[(col1@0, col1@0)]',
        },
        [left, right],
        'SortMergeJoin'
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });
  });
});

