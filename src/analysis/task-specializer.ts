import { PlanNode, TaskContext } from '../types/plan-document.types';
import { partitionCounts } from './partition-analysis';

export function specializeTask(node: PlanNode, context: TaskContext): PlanNode {
  if (node.operator === 'DistributedLeafExec') {
    const indices = node.children.map((c) => c.variant);
    if (indices.some((i) => i === undefined || i! >= context.count) || new Set(indices).size !== indices.length ||
      indices.length !== context.count) throw new Error('Invalid leaf variants at line ' + node.line);
    const selected = node.children.find((c) => c.variant === context.index);
    if (!selected) throw new Error('Missing leaf variant t' + context.index + ' at line ' + node.line);
    return specializeTask(selected, context);
  }
  if (node.assignments) {
    if (Object.keys(node.assignments).length !== context.count ||
      Object.keys(node.assignments).some((k) => Number(k) >= context.count)) throw new Error('UNION task map does not match context at line ' + node.line);
    const tasks = Object.values(node.assignments).map((assignments) => {
      if (new Set(assignments.map((a) => a.child)).size !== assignments.length) throw new Error('Duplicate UNION child at line ' + node.line);
      return assignments.map((assignment) => {
        const child = node.children[assignment.child];
        if (!child) throw new Error('Missing UNION child c' + assignment.child + ' at line ' + node.line);
        return specializeTask(child, assignment.context);
      });
    });
    const assigned = node.assignments[context.index];
    if (!assigned) throw new Error('Missing UNION task at line ' + node.line);
    const totals = tasks.map((children) => children.map((c) => partitionCounts(c).get(c)?.value));
    const capacity = totals.every((cs) => cs.every((c) => c !== undefined)) ?
      Math.max(...totals.map((cs) => cs.reduce((a: number, c) => a + c!, 0))) : undefined;
    return { ...node, context, properties: { ...node.properties,
      capacity: capacity === undefined ? 'unknown' : String(capacity),
      active: assigned.map((a) => 'c' + a.child + ' (' + a.context.index + '/' + a.context.count + ')').join(', ') || 'none',
      inactive: node.children.map((_, i) => i).filter((i) => !assigned.some((a) => a.child === i)).map((i) => 'c' + i).join(', ') || 'none',
    }, children: assigned.map((a) => specializeTask(node.children[a.child], a.context)) };
  }
  return { ...node, context, properties: node.properties ? { ...node.properties } : undefined,
    children: node.children.map((child) => specializeTask(child, context)) };
}
