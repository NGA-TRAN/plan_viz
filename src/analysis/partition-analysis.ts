import { isBalanced, listContent, splitTopLevel } from '../parsers/plan-text';
import { inferOperatorFamily } from './operator-contracts';
import { ExecutionPlanNode } from '../types/execution-plan.types';
import { PartitionCount, PlanNode } from '../types/plan-document.types';

/** Counts describe logical capacity, never the number of arrows visible on canvas. */
export function partitionCounts(root: ExecutionPlanNode, outputCapacity?: number): Map<ExecutionPlanNode, PartitionCount> {
  const result = new Map<ExecutionPlanNode, PartitionCount>();
  let refine = false;
  const visit = (node: ExecutionPlanNode, capacity?: number): PartitionCount => {
    const p = node.properties ?? {};
    const family = inferOperatorFamily(node) ?? node.operator;
    let value = result.get(node)?.value;
    let evidence = result.get(node)?.evidence ?? 'unknown operator contract';
    const explicit = p.output_partitioning?.match(/(?:,|\()\s*(\d+)\)$/)?.[1] ?? p.output_partitions ??
      (node.operator === 'NetworkBroadcastExec' ? p.partitions_per_consumer : undefined) ??
      (node.operator === 'SamplerExec' ? p.partitions : undefined);
    if (explicit !== undefined && /^\d+$/.test(explicit)) {
      value = Number(explicit); evidence = 'explicit output partitioning';
    }
    // A parent's printed input count constrains this output even for an unfamiliar
    // operator. Only known partition-preserving contracts propagate it to children.
    if (value === undefined && Number.isSafeInteger(capacity) && capacity! >= 0) {
      value = capacity; evidence = 'consumer input partition contract';
    }
    const preserving = node.children.length === 1 && (
      ['ProjectionExec', 'FilterExec', 'CoalesceBatchesExec', 'BufferExec', 'CooperativeExec',
        'SamplerExec', 'CacheExec', 'DistributedExec', 'StatefulPassThroughExec', 'CustomPassThroughExec',
        'CustomConfigExtensionRequiredExec', 'ErrorThrowingExec',
        'LocalLimitExec', 'WindowAggExec', 'BoundedWindowAggExec', 'UnnestExec'].includes(node.operator) ||
      (node.operator === 'SortExec' && p.preserve_partitioning === '[true]') ||
      (family === 'AggregateExec' && /^(Partial|PartialReduce|FinalPartitioned|SinglePartitioned)$/.test(p.mode ?? '') && !!p.gby && !!p.aggr)
    );
    const inputCapacity = ['RepartitionExec', 'BroadcastExec'].includes(family) && node.children.length === 1 && /^\d+$/.test(p.input_partitions ?? '') ?
      Number(p.input_partitions) : preserving ? value : undefined;
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
    if (preserving) {
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
