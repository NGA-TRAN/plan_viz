import { isBalanced, listContent, splitTopLevel } from '../parsers/plan-text';
import { inferOperatorFamily } from './operator-contracts';
import { ExecutionPlanNode } from '../types/execution-plan.types';
import { PartitionCount, PlanNode } from '../types/plan-document.types';

const preservingOperators = new Set([
  'ProjectionExec', 'FilterExec', 'CoalesceBatchesExec', 'BufferExec', 'CooperativeExec',
  'SamplerExec', 'CacheExec', 'DistributedExec', 'StatefulPassThroughExec', 'CustomPassThroughExec',
  'CustomConfigExtensionRequiredExec', 'ErrorThrowingExec',
  'LocalLimitExec', 'WindowAggExec', 'BoundedWindowAggExec', 'UnnestExec',
]);

// These operators have their own contracts, even when a particular plan omits
// the metadata needed to resolve them. Do not assume they preserve their inputs.
const contractOperators = new Set([
  'DataSourceExec', 'RepartitionExec', 'AggregateExec', 'SortExec', 'BroadcastExec',
  'CoalescePartitionsExec', 'SortPreservingMergeExec', 'GlobalLimitExec',
  'HashJoinExec', 'NestedLoopJoinExec', 'CrossJoinExec', 'SortMergeJoin', 'SortMergeJoinExec',
  'SymmetricHashJoinExec', 'PiecewiseMergeJoinExec', 'UnionExec', 'InterleaveExec',
  'NumbersExec', 'PlaceholderRowExec', 'EmptyExec', 'DistributedAnalyzeExec', 'AnalyzeExec',
  'URLEmitterExec', 'RemoteScanExec', 'RowGeneratorExec', 'PartitionIsolatorExec', 'DistributedUnionExec',
  'NetworkCoalesceExec', 'NetworkShuffleExec', 'NetworkBroadcastExec',
  'DataSinkExec', 'FileSinkExec', 'RecursiveQueryExec', 'ScalarSubqueryExec',
]);

function countValue(text?: string): number | undefined {
  if (text === undefined || !/^\d+$/.test(text)) return undefined;
  const value = Number(text);
  return Number.isSafeInteger(value) ? value : undefined;
}

function partitioningCount(text?: string): number | undefined {
  return text && isBalanced(text) ? countValue(text.match(/(?:,|\()\s*(\d+)\)$/)?.[1]) : undefined;
}

/** Whether a generic box can inherit its children's rendered stream counts. */
export function usesChildPartitionFallback(node: ExecutionPlanNode): boolean {
  return !contractOperators.has(inferOperatorFamily(node) ?? node.operator);
}

/** Counts describe logical capacity, never the number of arrows visible on canvas. */
export function partitionCounts(root: ExecutionPlanNode, outputCapacity?: number): Map<ExecutionPlanNode, PartitionCount> {
  const result = new Map<ExecutionPlanNode, PartitionCount>();
  let refine = false;
  const visit = (node: ExecutionPlanNode, capacity?: number): PartitionCount => {
    const p = node.properties ?? {};
    const family = inferOperatorFamily(node) ?? node.operator;
    const custom = !preservingOperators.has(node.operator) && !contractOperators.has(family);
    let value = result.get(node)?.value;
    let evidence = result.get(node)?.evidence ?? 'unknown operator contract';
    const input = countValue(p.input_partitions);
    const explicit = partitioningCount(p.output_partitioning) ?? countValue(p.output_partitions) ??
      (node.operator === 'NetworkBroadcastExec' ? countValue(p.partitions_per_consumer) : undefined) ??
      (custom || node.operator === 'SamplerExec' ? countValue(p.partitions) : undefined) ??
      (custom ? partitioningCount(p.partitioning) : undefined);
    if (explicit !== undefined) {
      value = explicit; evidence = 'explicit output partitioning';
    } else if (custom && input !== undefined && node.children.length > 0) {
      value = input; evidence = 'custom operator input partition count';
    }
    // Consumer metadata fills unresolved counts. Preserve counts already derived
    // from local metadata or children: an unfamiliar parent may change partitions.
    if (value === undefined && Number.isSafeInteger(capacity) && capacity! >= 0) {
      value = capacity; evidence = 'consumer input partition contract';
    }
    const preserving = node.children.length === 1 && (
      preservingOperators.has(node.operator) || custom ||
      (node.operator === 'SortExec' && p.preserve_partitioning === '[true]') ||
      (family === 'AggregateExec' && /^(Partial|PartialReduce|FinalPartitioned|SinglePartitioned)$/.test(p.mode ?? '') && !!p.gby && !!p.aggr)
    );
    // A total input count only constrains an individual child for unary nodes.
    const inputCapacity = node.children.length === 1 && input !== undefined ? input : preserving ? value : undefined;
    const children = node.children.map((child) => visit(child, refine ? inputCapacity : undefined));
    const known = (v: number | undefined, why: string): void => {
      if (value === undefined) {
        value = v; evidence = why;
      }
    };
    if (node.operator === 'BroadcastExec' && children.length === 1 && /^\d+$/.test(p.consumer_tasks ?? '')) {
      const input = /^\d+$/.test(p.input_partitions ?? '') ? Number(p.input_partitions) : children[0].value;
      known(input === undefined ? undefined : input * Number(p.consumer_tasks), 'broadcast copies per consumer task');
    }
    if (['NumbersExec', 'PlaceholderRowExec', 'EmptyExec', 'DistributedAnalyzeExec'].includes(node.operator)) known(1, 'single partition operator');
    if (node.operator === 'StreamingTableExec' && p.partition_sizes) {
      const sizes = p.partition_sizes;
      known(isBalanced(sizes) && /^\[.*\]$/s.test(sizes) ?
        splitTopLevel(listContent(sizes)).length : countValue(sizes), 'streaming table partition sizes');
    }
    if (node.operator === 'URLEmitterExec') {
      known(Number(p.partitions ?? Object.values(p).join(' ').match(/\bpartitions=(\d+)/)?.[1]), 'printed URL emitter partitions');
    }
    if (['RemoteScanExec', 'RowGeneratorExec'].includes(node.operator) && children.length === 0) {
      // Example/test feed metadata describes global partitions before task scaling.
      // A worker-only recording has no effective task context, so leave it unknown.
      const context = (node as PlanNode).context;
      const chunks = p.partition_chunks ?? p.partition_ops;
      if (chunks && (context || !('id' in node))) {
        if (isBalanced(chunks) && /^\[.*\]$/s.test(chunks)) {
          const lists = splitTopLevel(listContent(chunks));
          if (lists.every((list) => /^\[.*\]$/s.test(list))) {
            known(Math.floor(lists.length / (context?.count ?? 1)), 'feed partitions divided by effective task count');
          }
        }
      }
    }
    if (node.operator === 'PartitionIsolatorExec') {
      const text = Object.entries(p).map(([key, v]) => key + '=' + v).join(' ');
      const total = Number(text.match(/\bpartitions=(\d+)/)?.[1]);
      const tasks = Number(text.match(/\btasks=(\d+)/)?.[1]);
      if (Number.isSafeInteger(total) && Number.isSafeInteger(tasks) && tasks > 0) {
        known(Math.ceil(total / tasks), 'legacy contiguous partition groups');
      }
    }
    if (node.operator === 'DistributedUnionExec') known(p.capacity === 'unknown' ? undefined : Number(p.capacity), 'UNION task capacity');
    if (children.length === 0 && p.file_groups) known(Number(p.file_groups.match(/^\{?(\d+) groups?:/)?.[1]), 'declared file groups');
    if (family === 'RepartitionExec' && p.partitioning && children.length === 1) {
      known(Number(p.partitioning.match(/^(?:Hash\(\[.*\],\s*|RoundRobinBatch\()(\d+)\)$/s)?.[1]), 'repartition contract');
    }
    if (family === 'AggregateExec' && p.mode && /^(Partial|PartialReduce|Final|FinalPartitioned|Single|SinglePartitioned)$/.test(p.mode) && p.gby && p.aggr && children.length === 1) {
      known(['Final', 'Single'].includes(p.mode) ? 1 : children[0].value, 'aggregate mode');
    }
    if (['CoalescePartitionsExec', 'SortPreservingMergeExec', 'GlobalLimitExec'].includes(node.operator)) known(1, 'single output contract');
    if (node.operator === 'UnionExec') known(children.every((c) => c.value !== undefined) ? children.reduce((a, c) => a + c.value!, 0) : undefined, 'sum of children');
    if (family === 'HashJoinExec' && children.length === 2 && p.on && p.join_type && ['Partitioned', 'CollectLeft'].includes(p.mode)) known(children[1].value, 'hash join probe partitions');
    if (node.operator === 'SortExec') known(p.preserve_partitioning === '[false]' ? 1 : p.preserve_partitioning === '[true]' ? children[0]?.value : undefined, 'sort partition contract');
    if (node.operator === 'NestedLoopJoinExec' && children.length === 2 && p.join_type) known(children[1].value, 'nested-loop probe partitions');
    if (node.operator === 'CrossJoinExec') known(children[1]?.value, 'cross join probe partitions');
    if (node.operator === 'InterleaveExec') known(children.length && children.every((c) => c.value === children[0].value) ? children[0].value : undefined, 'equal interleaved partitions');
    if (custom && children.length > 0) {
      known(children.every((child) => child.value === children[0].value) ?
        children[0].value : undefined, 'custom operator child partition fallback');
    } else if (preserving) {
      known(children[0].value, 'partition-preserving operator');
    }
    if (!Number.isSafeInteger(value) || value! < 0) value = undefined;
    const count: PartitionCount = { value, evidence };
    if (node.operator === 'DistributedUnionExec') {
      count.assigned = children.every((c) => c.value !== undefined) ?
        children.reduce((a, c) => a + c.value!, 0) : undefined;
    }
    if (node.operator === 'PartitionIsolatorExec' && value !== undefined) {
      const text = Object.entries(p).map(([key, v]) => key + '=' + v).join(' ');
      const total = Number(text.match(/\bpartitions=(\d+)/)?.[1]);
      const context = (node as PlanNode).context;
      if (context && Number.isSafeInteger(total)) {
        count.assigned = Math.floor(total / context.count) + Number(context.index < total % context.count);
        count.padding = Math.max(0, value - count.assigned);
      }
    }
    result.set(node, count); return count;
  };
  // Establish local contracts first so consumer evidence never overrides them.
  visit(root);
  refine = true;
  visit(root, outputCapacity); return result;
}
