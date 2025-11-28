import { ExecutionPlanNode } from '../../../types/execution-plan.types';

/**
 * Builder class for creating test ExecutionPlanNode instances
 * Follows Builder pattern for flexible node creation
 */
export class NodeBuilder {
  /**
   * Creates a simple node with just operator name
   */
  static createSimpleNode(operator: string, level: number = 0): ExecutionPlanNode {
    return {
      operator,
      children: [],
      level,
    };
  }

  /**
   * Creates a node with children
   */
  static createNodeWithChildren(
    operator: string,
    children: ExecutionPlanNode[],
    level: number = 0,
    properties?: Record<string, string>
  ): ExecutionPlanNode {
    return {
      operator,
      children,
      properties,
      level,
    };
  }

  /**
   * Creates a DataSourceExec node
   */
  static createDataSourceExec(
    properties?: Record<string, string>,
    children?: ExecutionPlanNode[]
  ): ExecutionPlanNode {
    return {
      operator: 'DataSourceExec',
      properties: properties || {},
      children: children || [],
      level: 0,
    };
  }

  /**
   * Creates a FilterExec node
   */
  static createFilterExec(
    filter: string,
    children?: ExecutionPlanNode[],
    properties?: Record<string, string>
  ): ExecutionPlanNode {
    return {
      operator: 'FilterExec',
      properties: {
        filter,
        ...properties,
      },
      children: children || [],
      level: 0,
    };
  }

  /**
   * Creates a RepartitionExec node
   */
  static createRepartitionExec(
    partitioning: string,
    children?: ExecutionPlanNode[],
    properties?: Record<string, string>
  ): ExecutionPlanNode {
    return {
      operator: 'RepartitionExec',
      properties: {
        partitioning,
        ...properties,
      },
      children: children || [],
      level: 0,
    };
  }

  /**
   * Creates an AggregateExec node
   */
  static createAggregateExec(
    mode: string,
    gby: string,
    aggr: string,
    children?: ExecutionPlanNode[],
    properties?: Record<string, string>
  ): ExecutionPlanNode {
    return {
      operator: 'AggregateExec',
      properties: {
        mode,
        gby,
        aggr,
        ...properties,
      },
      children: children || [],
      level: 0,
    };
  }

  /**
   * Creates a ProjectionExec node
   */
  static createProjectionExec(
    expr: string,
    children?: ExecutionPlanNode[],
    properties?: Record<string, string>
  ): ExecutionPlanNode {
    return {
      operator: 'ProjectionExec',
      properties: {
        expr,
        ...properties,
      },
      children: children || [],
      level: 0,
    };
  }

  /**
   * Creates a SortExec node
   */
  static createSortExec(
    expr: string,
    children?: ExecutionPlanNode[],
    properties?: Record<string, string>
  ): ExecutionPlanNode {
    return {
      operator: 'SortExec',
      properties: {
        expr,
        ...properties,
      },
      children: children || [],
      level: 0,
    };
  }

  /**
   * Creates a SortPreservingMergeExec node
   */
  static createSortPreservingMergeExec(
    expr: string,
    children?: ExecutionPlanNode[],
    properties?: Record<string, string>
  ): ExecutionPlanNode {
    return {
      operator: 'SortPreservingMergeExec',
      properties: {
        expr,
        ...properties,
      },
      children: children || [],
      level: 0,
    };
  }

  /**
   * Creates a CoalesceBatchesExec node
   */
  static createCoalesceBatchesExec(
    targetBatchSize: string,
    children?: ExecutionPlanNode[]
  ): ExecutionPlanNode {
    return {
      operator: 'CoalesceBatchesExec',
      properties: {
        target_batch_size: targetBatchSize,
      },
      children: children || [],
      level: 0,
    };
  }

  /**
   * Creates a CoalescePartitionsExec node
   */
  static createCoalescePartitionsExec(children?: ExecutionPlanNode[]): ExecutionPlanNode {
    return {
      operator: 'CoalescePartitionsExec',
      children: children || [],
      level: 0,
    };
  }

  /**
   * Creates a HashJoinExec node
   */
  static createHashJoinExec(
    properties: Record<string, string>,
    children: [ExecutionPlanNode, ExecutionPlanNode]
  ): ExecutionPlanNode {
    return {
      operator: 'HashJoinExec',
      properties,
      children,
      level: 0,
    };
  }

  /**
   * Creates a SortMergeJoin or SortMergeJoinExec node
   */
  static createSortMergeJoinExec(
    properties: Record<string, string>,
    children: [ExecutionPlanNode, ExecutionPlanNode],
    operator: 'SortMergeJoin' | 'SortMergeJoinExec' = 'SortMergeJoinExec'
  ): ExecutionPlanNode {
    return {
      operator,
      properties,
      children,
      level: 0,
    };
  }

  /**
   * Creates a UnionExec node
   */
  static createUnionExec(children: ExecutionPlanNode[]): ExecutionPlanNode {
    return {
      operator: 'UnionExec',
      children,
      level: 0,
    };
  }

  /**
   * Creates a node with nested children (for deep nesting tests)
   */
  static createNestedNode(depth: number, operatorPrefix: string = 'Level'): ExecutionPlanNode {
    if (depth === 0) {
      return this.createSimpleNode(`${operatorPrefix}0`, 0);
    }

    return {
      operator: `${operatorPrefix}0`,
      children: [this.createNestedNode(depth - 1, operatorPrefix)],
      level: 0,
    };
  }

  /**
   * Creates multiple simple child nodes
   */
  static createMultipleChildren(
    count: number,
    operator: string = 'TableScan',
    level: number = 1
  ): ExecutionPlanNode[] {
    return Array.from({ length: count }, () => this.createSimpleNode(operator, level));
  }
}

