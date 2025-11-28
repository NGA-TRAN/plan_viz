import { ExecutionPlanNode } from '../../../types/execution-plan.types';
import { NodeBuilder } from '../builders/node.builder';

/**
 * Common test node fixtures for reuse across tests
 */
export const TestNodes = {
  /**
   * Simple TableScan node
   */
  simpleTableScan: NodeBuilder.createSimpleNode('TableScan', 0),

  /**
   * DataSourceExec with single file group
   */
  dataSourceWithSingleFile: NodeBuilder.createDataSourceExec({
    file_groups: '1 groups: [[d_1.parquet]]',
    projection: '[d_dkey, env, service]',
    file_type: 'parquet',
  }),

  /**
   * DataSourceExec with multiple file groups
   */
  dataSourceWithMultipleFiles: NodeBuilder.createDataSourceExec({
    file_groups: '2 groups: [[d1.parquet], [d2.parquet]]',
    projection: '[d_dkey, env]',
  }),

  /**
   * FilterExec with predicate
   */
  filterWithPredicate: NodeBuilder.createFilterExec('service@2 = log'),

  /**
   * RepartitionExec with Hash partitioning
   */
  repartitionHash: NodeBuilder.createRepartitionExec('Hash([col1@0], 4)'),

  /**
   * RepartitionExec with RoundRobin partitioning
   */
  repartitionRoundRobin: NodeBuilder.createRepartitionExec('RoundRobinBatch(8)'),

  /**
   * AggregateExec with Single mode
   */
  aggregateSingle: NodeBuilder.createAggregateExec('Single', '[env@0]', '[count(Int64(1))]'),

  /**
   * AggregateExec with Partial mode
   */
  aggregatePartial: NodeBuilder.createAggregateExec('Partial', '[col1@0]', '[sum(col2@1)]'),

  /**
   * AggregateExec with Final mode
   */
  aggregateFinal: NodeBuilder.createAggregateExec('Final', '[col1@0]', '[sum(col2@1)]'),

  /**
   * ProjectionExec with simple expression
   */
  projectionSimple: NodeBuilder.createProjectionExec('[col1@0, col2@1]'),

  /**
   * SortExec with simple expression
   */
  sortSimple: NodeBuilder.createSortExec('[col1@0 ASC]'),

  /**
   * CoalesceBatchesExec with target batch size
   */
  coalesceBatches: NodeBuilder.createCoalesceBatchesExec('8192'),

  /**
   * CoalescePartitionsExec
   */
  coalescePartitions: NodeBuilder.createCoalescePartitionsExec(),

  /**
   * HashJoinExec with Inner join
   */
  hashJoinInner: (left: ExecutionPlanNode, right: ExecutionPlanNode) =>
    NodeBuilder.createHashJoinExec(
      {
        join_type: 'Inner',
        on: '[(col1@0, col2@0)]',
      },
      [left, right]
    ),

  /**
   * UnionExec with two children
   */
  unionWithTwoChildren: (child1: ExecutionPlanNode, child2: ExecutionPlanNode) =>
    NodeBuilder.createUnionExec([child1, child2]),
};

