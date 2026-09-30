import { inferOperatorFamily } from './operator-contracts';
import { ExecutionPlanNode } from '../types/execution-plan.types';
import { PartitionCount } from '../types/plan-document.types';

/** Counts describe logical capacity, never the number of arrows visible on canvas. */
export function partitionCounts(root: ExecutionPlanNode): Map<ExecutionPlanNode, PartitionCount> {
  const result = new Map<ExecutionPlanNode, PartitionCount>();
  const visit = (node: ExecutionPlanNode): PartitionCount => {
    const children = node.children.map(visit); const p = node.properties ?? {};
    const family = inferOperatorFamily(node) ?? node.operator;
    let value: number | undefined;
    let evidence = 'unknown operator contract';
    const explicit = p.output_partitioning?.match(/(?:,|\()\s*(\d+)\)$/)?.[1] ?? p.output_partitions;
    if (explicit !== undefined && /^\d+$/.test(explicit)) {
      value = Number(explicit); evidence = 'explicit output partitioning';
    }
    const known = (v: number | undefined, why: string): void => {
      if (value === undefined) {
        value = v; evidence = why;
      }
    };
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
    if (node.operator === 'CrossJoinExec') known(children[1]?.value, 'cross join probe partitions');
    if (node.operator === 'InterleaveExec') known(children.length && children.every((c) => c.value === children[0].value) ? children[0].value : undefined, 'equal interleaved partitions');
    if (children.length === 1 && ['ProjectionExec', 'FilterExec', 'CoalesceBatchesExec', 'BufferExec', 'CooperativeExec',
      'LocalLimitExec', 'WindowAggExec', 'BoundedWindowAggExec', 'UnnestExec'].includes(node.operator)) {
      known(children[0].value, 'partition-preserving operator');
    }
    if (!Number.isSafeInteger(value) || value! < 0) value = undefined;
    const count: PartitionCount = { value, evidence };
    if (node.operator === 'DistributedUnionExec') {
      count.assigned = children.every((c) => c.value !== undefined) ?
        children.reduce((a, c) => a + c.value!, 0) : undefined;
    }
    result.set(node, count); return count;
  };
  visit(root); return result;
}
