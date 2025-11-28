import { ExcalidrawGenerator } from '../excalidraw.generator';
import { ExcalidrawText } from '../../types/excalidraw.types';
import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { TestHelpers } from './utils/test-helpers';
import { NodeBuilder } from './builders/node.builder';

describe('ExcalidrawGenerator - Edge Cases', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('edge cases and complex scenarios', () => {
    it('should handle nodes with many children', () => {
      const node = NodeBuilder.createUnionExec(
        NodeBuilder.createMultipleChildren(5, 'TableScan', 1)
      );

      const result = generator.generate(node);
      TestHelpers.assertHasRectangles(result, 6); // 1 parent + 5 children
    });

    it('should handle DataSourceExec with many file groups', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups:
          '10 groups: [[f1.parquet], [f2.parquet], [f3.parquet], [f4.parquet], [f5.parquet], [f6.parquet], [f7.parquet], [f8.parquet], [f9.parquet], [f10.parquet]]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle AggregateExec with multiple aggregation functions', () => {
      const node = NodeBuilder.createAggregateExec(
        'Single',
        '[col1@0]',
        '[sum(col2@1), count(col3@2), avg(col4@3)]'
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle RepartitionExec with multiple output partitions', () => {
      const node = NodeBuilder.createRepartitionExec('RoundRobinBatch(16)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle DataSourceExec with file_groups without match pattern', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: 'some custom format',
      });

      const result = generator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);
      const detailText = textElements.find((t) => t.text?.includes('file_groups'));
      expect(detailText).toBeDefined();
    });

    it('should handle FilterExec with projection in filter property', () => {
      const node = NodeBuilder.createFilterExec('service@2 = log, projection=[col1, col2]');

      const result = generator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should handle FilterExec with predicate fallback', () => {
      const node = NodeBuilder.createFilterExec('', [], {
        some_predicate: 'col1@0 = value',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle nodes with 3+ children requiring multiple arrows', () => {
      const node = NodeBuilder.createUnionExec([
        {
          ...NodeBuilder.createRepartitionExec('RoundRobinBatch(8)', [
            {
              ...NodeBuilder.createDataSourceExec({
                file_groups: '1 groups: [[d1.parquet]]',
              }),
              level: 2,
            },
          ]),
          level: 1,
        },
        {
          ...NodeBuilder.createRepartitionExec('RoundRobinBatch(8)', [
            {
              ...NodeBuilder.createDataSourceExec({
                file_groups: '1 groups: [[d2.parquet]]',
              }),
              level: 2,
            },
          ]),
          level: 1,
        },
        {
          ...NodeBuilder.createRepartitionExec('RoundRobinBatch(8)', [
            {
              ...NodeBuilder.createDataSourceExec({
                file_groups: '1 groups: [[d3.parquet]]',
              }),
              level: 2,
            },
          ]),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle AggregateExec with ordering mode sorted', () => {
      const node = NodeBuilder.createAggregateExec('SingleSorted', '[env@0]', '[count(Int64(1))]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle AggregateExec with child output sort order matching', () => {
      const sortChild = NodeBuilder.createSortExec('[env@0 ASC]', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
            projection: '[env]',
            output_ordering: '[env@0 ASC]',
          }),
          level: 2,
        },
      ]);
      sortChild.level = 1;

      const node = NodeBuilder.createAggregateExec('Single', '[env@0]', '[count(Int64(1))]', [
        sortChild,
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle DataSourceExec with dynamic filter properties', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '1 groups: [[d_1.parquet]]',
        predicate: 'service@2 = log',
        pruning_predicate: 'service_null_count@2 != row_count@3',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle parseFileGroups with complex file group format', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups:
          '{3 groups: [[file1.parquet, file2.parquet], [file3.parquet], [file4.parquet, file5.parquet]]}',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle DataSourceExec with file groups that have quotes', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '{1 groups: [["file with spaces.parquet"]]}',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle createArrowsWithEllipsis with many arrows', () => {
      const node = NodeBuilder.createRepartitionExec('RoundRobinBatch(10)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle CoalesceBatchesExec with projection columns', () => {
      const node = NodeBuilder.createCoalesceBatchesExec('8192', [
        NodeBuilder.createFilterExec('a > 10', [], {
          projection: '[col1, col2]',
        }),
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle RepartitionExec with hash partitioning without number match', () => {
      const node = NodeBuilder.createRepartitionExec('Hash(Column { name: "col1" })');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle nodes with 3+ arrows distribution', () => {
      const node = NodeBuilder.createUnionExec([
        {
          ...NodeBuilder.createRepartitionExec('RoundRobinBatch(3)', [
            {
              ...NodeBuilder.createDataSourceExec({
                file_groups: '1 groups: [[d1.parquet]]',
              }),
              level: 2,
            },
          ]),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      const arrows = TestHelpers.getArrows(result.elements);
      expect(arrows.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle DataSourceExec with dynamic filter (hasDynamicFilter)', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '1 groups: [[d_1.parquet]]',
        predicate: 'DynamicFilter(service@2 = log)',
        pruning_predicate:
          'service_null_count@2 != row_count@3 AND service_min@0 <= log AND log <= service_max@1',
        required_guarantees: '[service in (log)]',
      });

      const result = generator.generate(node);
      const ellipses = TestHelpers.getEllipses(result.elements);
      const dfText = result.elements.find(
        (el): el is ExcalidrawText => el.type === 'text' && el.text === 'DynamicFilter'
      );
      expect(ellipses.length).toBeGreaterThan(0);
      expect(dfText).toBeDefined();
    });

    it('should handle DataSourceExec with single file group', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '1 groups: [[d_1.parquet]]',
        projection: '[col1, col2]',
      });

      const result = generator.generate(node);
      // Single group should have arrow positioned at center
      TestHelpers.assertHasElements(result);
    });

    it('should handle DataSourceExec projection text with group rectangles', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '2 groups: [[f1.parquet, f2.parquet], [f3.parquet]]',
        projection: '[col1, col2, col3]',
        output_ordering: '[col1@0 ASC]',
      });

      const result = generator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should handle DataSourceExec projection text with ellipses only', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '3 groups: [[f1.parquet], [f2.parquet], [f3.parquet]]',
        projection: '[col1, col2]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle FilterExec with projection columns balancing arrows', () => {
      const node = NodeBuilder.createFilterExec('a > 10', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 1,
        },
      ], {
        projection: '[col1, col2, col3, col4, col5]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle FilterExec with 3+ arrows from projection columns', () => {
      const node = NodeBuilder.createFilterExec('a > 10', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 1,
        },
      ], {
        projection: '[col1, col2, col3]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle RepartitionExec with Hash format including partition count', () => {
      const node = NodeBuilder.createRepartitionExec('Hash([col1@0, col2@1], 8)');

      const result = generator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);
      const detailText = textElements.find((t) => t.text?.includes('Hash'));
      expect(detailText).toBeDefined();
    });

    it('should handle RepartitionExec with fallback number matching', () => {
      const node = NodeBuilder.createRepartitionExec('CustomFormat(16)');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle RepartitionExec output arrows positioning', () => {
      const node = NodeBuilder.createRepartitionExec('RoundRobinBatch(3)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle RepartitionExec with single output arrow', () => {
      const node = NodeBuilder.createRepartitionExec('RoundRobinBatch(1)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle AggregateExec with ordering_mode=Sorted', () => {
      const node = NodeBuilder.createAggregateExec('Single', '[env@0]', '[count(Int64(1))]', [], {
        ordering_mode: 'Sorted',
      });

      const result = generator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);
      const orderingText = textElements.find((t) => t.text?.includes('ordering_mode=Sorted'));
      expect(orderingText).toBeDefined();
    });

    it('should handle AggregateExec with complex gby containing brackets and braces', () => {
      const node = NodeBuilder.createAggregateExec(
        'Single',
        '[func([nested], {value})@0 as alias]',
        '[count(Int64(1))]'
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle AggregateExec detail text with single part', () => {
      const node = NodeBuilder.createAggregateExec('Single', '[col1@0]', '[sum(col2@1)]');

      const result = generator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should handle AggregateExec with complex aggr parsing', () => {
      const node = NodeBuilder.createAggregateExec('Single', '[col1@0]', '[sum([nested]@1), count({value}@2)]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle AggregateExec with date_bin function in gby', () => {
      const node = NodeBuilder.createAggregateExec(
        'Single',
        '[date_bin(INTERVAL \'1 hour\', timestamp@0) as hour]',
        '[count(Int64(1))]'
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle AggregateExec with child output sort order and function matching', () => {
      const sortChild = NodeBuilder.createSortExec('[sum(col1@0) ASC]', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
            projection: '[col1]',
            output_ordering: '[sum(col1@0) ASC]',
          }),
          level: 2,
        },
      ]);
      sortChild.level = 1;

      const node = NodeBuilder.createAggregateExec('Single', '[sum(col1@0) as total]', '[count(Int64(1))]', [
        sortChild,
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle AggregateExec with multiple arrows from child', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(3)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createAggregateExec('Single', '[col1@0, col2@1]', '[count(Int64(1))]', [
        repartitionChild,
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle ProjectionExec with complex expr containing brackets and braces', () => {
      const node = NodeBuilder.createProjectionExec('[func([nested], {value})@0 as alias, col2@1]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle ProjectionExec detail text', () => {
      const node = NodeBuilder.createProjectionExec('[col1@0 as col1, col2@1 as col2]');

      const result = generator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should handle ProjectionExec with child having multiple output arrows', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(3)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createProjectionExec('[col1@0]', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle SortExec with child having multiple output arrows', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(3)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createSortExec('[col1@0 ASC]', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle SortPreservingMergeExec with complex expr parsing', () => {
      const node = NodeBuilder.createSortPreservingMergeExec('[func([nested], {value})@0 ASC]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle SortPreservingMergeExec detail text', () => {
      const node = NodeBuilder.createSortPreservingMergeExec('[col1@0 ASC, col2@1 DESC]');

      const result = generator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should handle SortPreservingMergeExec with child having multiple output arrows', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(3)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createSortPreservingMergeExec('[col1@0 ASC]', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle createArrowsWithEllipsis with not enough space for first arrows', () => {
      const node = NodeBuilder.createRepartitionExec('RoundRobinBatch(20)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle column coloring break condition', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '1 groups: [[d_1.parquet]]',
        projection: '[col1, col2, col3, col4, col5, col6, col7, col8, col9, col10]',
        output_ordering: '[col1@0 ASC, col3@2 ASC, col5@4 ASC]',
      });

      const result = generator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should handle parseFileGroups edge case with invalid format', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: 'invalid format',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle CoalesceBatchesExec with child having multiple output arrows', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(3)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createCoalesceBatchesExec('8192', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle CoalesceBatchesExec with single arrow from child', () => {
      const node = NodeBuilder.createCoalesceBatchesExec('8192', [
        {
          ...NodeBuilder.createFilterExec('a > 10'),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle RepartitionExec with 3+ input arrows', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(3)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createRepartitionExec('RoundRobinBatch(4)', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle RepartitionExec with 2 output arrows', () => {
      const node = NodeBuilder.createRepartitionExec('RoundRobinBatch(2)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle AggregateExec fallback to child columns when no gby or aggr', () => {
      const node = NodeBuilder.createAggregateExec('Single', '', '', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
            projection: '[col1, col2]',
          }),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle AggregateExec with date_bin in sort order', () => {
      const sortChild = NodeBuilder.createSortExec('[timestamp@0 ASC]', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
            projection: '[timestamp]',
            output_ordering: '[timestamp@0 ASC]',
          }),
          level: 2,
        },
      ]);
      sortChild.level = 1;

      const node = NodeBuilder.createAggregateExec(
        'Single',
        '[date_bin(INTERVAL \'1 hour\', timestamp@0) as hour]',
        '[count(Int64(1))]',
        [sortChild]
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle SortExec with 3+ arrows from child', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(4)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createSortExec('[col1@0 ASC]', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle AggregateExec with complex gby parsing including brackets', () => {
      const node = NodeBuilder.createAggregateExec(
        'Single',
        '[func([nested[inner]], {value{inner}})@0]',
        '[count(Int64(1))]'
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle ProjectionExec with complex expr parsing including brackets', () => {
      const node = NodeBuilder.createProjectionExec('[func([nested[inner]], {value{inner}})@0 as alias]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle SortPreservingMergeExec with complex expr parsing including brackets', () => {
      const node = NodeBuilder.createSortPreservingMergeExec('[func([nested[inner]], {value{inner}})@0 ASC]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle ProjectionExec with child having multiple output arrows (3+)', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(4)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createProjectionExec('[col1@0]', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle SortPreservingMergeExec with child having multiple output arrows (3+)', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(4)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createSortPreservingMergeExec('[col1@0 ASC]', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle AggregateExec detail text with multiple parts', () => {
      const node = NodeBuilder.createAggregateExec('Single', '[col1@0, col2@1]', '[sum(col3@2), count(col4@3)]');

      const result = generator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should handle DataSourceExec projection text fallback when no groups or ellipses', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '1 groups: [[d_1.parquet]]',
        projection: '[col1, col2]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover branch for 2 arrows in default node handling', () => {
      const node = NodeBuilder.createNodeWithChildren(
        'UnknownOperator',
        [
          {
            ...NodeBuilder.createRepartitionExec('RoundRobinBatch(2)', [
              {
                ...NodeBuilder.createDataSourceExec({
                  file_groups: '1 groups: [[d_1.parquet]]',
                }),
                level: 2,
              },
            ]),
            level: 1,
          },
        ],
        0
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover branch for more than 2 arrows in default node handling', () => {
      const node = NodeBuilder.createNodeWithChildren(
        'UnknownOperator',
        [
          {
            ...NodeBuilder.createRepartitionExec('RoundRobinBatch(3)', [
              {
                ...NodeBuilder.createDataSourceExec({
                  file_groups: '1 groups: [[d_1.parquet]]',
                }),
                level: 2,
              },
            ]),
            level: 1,
          },
        ],
        0
      );

      const result = generator.generate(node);
      const arrows = TestHelpers.getArrows(result.elements);
      expect(arrows.length).toBeGreaterThanOrEqual(3);
    });

    it('should cover ellipsis branch with not enough space for first arrows', () => {
      const node = NodeBuilder.createRepartitionExec('RoundRobinBatch(15)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover ellipsis branch with not enough space for last arrows', () => {
      const node = NodeBuilder.createRepartitionExec('RoundRobinBatch(25)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover column coloring break condition', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '1 groups: [[d_1.parquet]]',
        projection:
          '[col1, col2, col3, col4, col5, col6, col7, col8, col9, col10, col11, col12, col13, col14, col15, col16, col17, col18, col19, col20]',
        output_ordering:
          '[col1@0 ASC, col3@2 ASC, col5@4 ASC, col7@6 ASC, col9@8 ASC, col11@10 ASC]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover DataSourceExec with exactly 1 group branch', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '1 groups: [[d_1.parquet]]',
        projection: '[col1, col2]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover DataSourceExec projection text fallback when no groupRects and no ellipseInfo', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '0 groups: []',
        projection: '[col1, col2]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover DataSourceExec projection text fallback for rightmostArrowX', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: 'invalid format',
        projection: '[col1, col2]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover CoalesceBatchesExec with exactly 2 arrows', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(2)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createCoalesceBatchesExec('8192', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should cover CoalesceBatchesExec with 3+ arrows', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(3)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createCoalesceBatchesExec('8192', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should cover parseFileGroups with null properties', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: undefined,
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover AggregateExec parsing with closing bracket character', () => {
      const node = NodeBuilder.createAggregateExec('Single', '[func([nested])@0]', '[count(Int64(1))]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover AggregateExec parsing with opening brace character', () => {
      const node = NodeBuilder.createAggregateExec('Single', '[func({value})@0]', '[count(Int64(1))]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover AggregateExec parsing with closing brace character', () => {
      const node = NodeBuilder.createAggregateExec('Single', '[func({value})@0]', '[count(Int64(1))]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover AggregateExec fallback when gby format does not match', () => {
      const node = NodeBuilder.createAggregateExec('Single', 'invalid format without brackets', '[count(Int64(1))]');

      const result = generator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should cover AggregateExec column parsing with closing bracket', () => {
      const node = NodeBuilder.createAggregateExec('Single', '[col1@0]', '[sum([nested]@1)]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover AggregateExec column parsing with opening brace', () => {
      const node = NodeBuilder.createAggregateExec('Single', '[col1@0]', '[sum({value}@1)]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover AggregateExec column parsing with closing brace', () => {
      const node = NodeBuilder.createAggregateExec('Single', '[col1@0]', '[sum({value})@1]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover AggregateExec qualifierMatch branch', () => {
      const node = NodeBuilder.createAggregateExec('Single', '[col1@0]', '[sum(table.column)@1]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover AggregateExec with exactly 2 arrows from child', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(2)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createAggregateExec('Single', '[col1@0]', '[count(Int64(1))]', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should cover AggregateExec with 3+ arrows from child', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(4)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createAggregateExec('Single', '[col1@0]', '[count(Int64(1))]', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should cover ProjectionExec parsing with closing bracket', () => {
      const node = NodeBuilder.createProjectionExec('[func([nested])@0 as alias]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover ProjectionExec parsing with opening brace', () => {
      const node = NodeBuilder.createProjectionExec('[func({value})@0 as alias]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover ProjectionExec parsing with closing brace', () => {
      const node = NodeBuilder.createProjectionExec('[func({value})@0 as alias]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover ProjectionExec fallback when expr format does not match', () => {
      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        properties: {
          expr: 'invalid format without proper brackets',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should cover ProjectionExec with exactly 2 arrows from child', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(2)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createProjectionExec('[col1@0]', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should cover ProjectionExec with 3+ arrows from child', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(5)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createProjectionExec('[col1@0]', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should cover SortExec with exactly 2 arrows from child', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(2)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createSortExec('[col1@0 ASC]', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should cover SortExec with 3+ arrows from child', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(6)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createSortExec('[col1@0 ASC]', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should cover SortPreservingMergeExec parsing with closing bracket', () => {
      const node = NodeBuilder.createSortPreservingMergeExec('[func([nested])@0 ASC]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover SortPreservingMergeExec parsing with opening brace', () => {
      const node = NodeBuilder.createSortPreservingMergeExec('[func({value})@0 ASC]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover SortPreservingMergeExec parsing with closing brace', () => {
      const node = NodeBuilder.createSortPreservingMergeExec('[func({value})@0 ASC]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should cover SortPreservingMergeExec with exactly 2 arrows from child', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(2)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createSortPreservingMergeExec('[col1@0 ASC]', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should cover SortPreservingMergeExec with 3+ arrows from child', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(7)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createSortPreservingMergeExec('[col1@0 ASC]', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should cover UnionExec with single input arrow (totalInputArrows === 1)', () => {
      const node = NodeBuilder.createUnionExec([
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d1.parquet]]',
          }),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
      const arrows = TestHelpers.getArrows(result.elements);
      expect(arrows.length).toBeGreaterThanOrEqual(0);
    });

    it('should cover UnionExec with children having output columns (column labels)', () => {
      const projectionChild1 = NodeBuilder.createProjectionExec('[col1@0, col2@1]', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d1.parquet]]',
          }),
          level: 2,
        },
      ]);
      projectionChild1.level = 1;

      const projectionChild2 = NodeBuilder.createProjectionExec('[col1@0, col2@1]', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d2.parquet]]',
          }),
          level: 2,
        },
      ]);
      projectionChild2.level = 1;

      const node = NodeBuilder.createUnionExec([projectionChild1, projectionChild2]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
      // Check that column labels are present
      const textElements = TestHelpers.getTextElements(result.elements);
      const hasColumnLabels = textElements.some(
        (el) => el.text?.includes('col1') || el.text?.includes('col2')
      );
      expect(hasColumnLabels).toBe(true);
    });

    it('should cover UnionExec with children having output columns and sort order', () => {
      const sortChild = NodeBuilder.createSortExec('[col1@0 ASC]', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d1.parquet]]',
            output_ordering: '[col1@0 ASC]',
          }),
          level: 2,
        },
      ]);
      sortChild.level = 1;

      const node = NodeBuilder.createUnionExec([sortChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });
  });
});

