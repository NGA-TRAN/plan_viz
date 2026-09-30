import { isBalanced, listContent, splitTopLevel } from '../parsers/plan-text';
import { ExecutionPlanNode } from '../types/execution-plan.types';

/** A source must print an actual list of file groups, not just reuse the property name. */
function hasFileGroups(value?: string): boolean {
  const match = value?.match(/^\{?([0-9]+)\s+groups?:\s*(\[.*\])\}?$/s);
  if (!match) return false;
  const groups = splitTopLevel(listContent(match[2]));
  return (Number(match[1]) === 0 || groups.length > 0) &&
    groups.every((group) => group === '...' || /^\[.*\]$/s.test(group));
}

/** Contracts describe renderer inputs, not vendor names or operator spelling. */
const contracts: Array<{ family: string; matches: (node: ExecutionPlanNode) => boolean }> = [
  {
    family: 'DataSourceExec',
    matches: ({ children, properties: p }) => children.length === 0 &&
      hasFileGroups(p?.file_groups),
  },
  {
    family: 'AggregateExec',
    matches: ({ children, properties: p }) => children.length === 1 &&
      !!p?.gby?.match(/^\[.*\]$/s) && !!p?.aggr?.match(/^\[.*\]$/s) &&
      (!p.mode || /^(Partial|PartialReduce|Final|FinalPartitioned|Single|SinglePartitioned)$/.test(p.mode)),
  },
  {
    family: 'RepartitionExec',
    matches: ({ children, properties: p }) => children.length === 1 &&
      !!p?.partitioning?.match(/^(Hash\(\[.*\],\s*[0-9]+\)|RoundRobinBatch\([0-9]+\))$/s) &&
      Number(p.partitioning.match(/([0-9]+)\)$/)?.[1]) > 0,
  },
  {
    family: 'HashJoinExec',
    matches: ({ children, properties: p }) => children.length === 2 &&
      !!p?.on?.match(/^\[.*\]$/s) && !!p.join_type &&
      /^(Partitioned|CollectLeft)$/.test(p.mode ?? ''),
  },
];

export function inferOperatorFamily(node: ExecutionPlanNode): string | undefined {
  const candidates = contracts.filter((contract) =>
    Object.values(node.properties ?? {}).every(isBalanced) && contract.matches(node));
  return candidates.length === 1 ? candidates[0].family : undefined;
}
