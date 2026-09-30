import { DistributedAnalysis, NetworkConnection, PlanDocument, PlanNode, TaskPlan } from '../types/plan-document.types';
import { partitionCounts } from './partition-analysis';
import { specializeTask } from './task-specializer';

export function analyzeDistributed(document: Extract<PlanDocument, { stages: unknown }>): DistributedAnalysis {
  const diagnostics = [...document.diagnostics];
  const tasks: TaskPlan[] = [];
  for (const stage of document.stages) {
    for (let task = 0; task < stage.tasks; task++) {
      // A worker recording cannot establish its stage-local task context.
      const root = document.kind === 'recorded' ? stage.root : specializeTask(stage.root, { index: task, count: stage.tasks });
      tasks.push({ stage: stage.id, task, root, counts: partitionCounts(root) });
    }
  }
  const connections = new Map<string, NetworkConnection>();
  for (const task of tasks) {
    const visit = (node: PlanNode): void => {
      const count = task.counts.get(node);
      if (count?.value === undefined) {
        diagnostics.push({ code: 'unknown-count', node: node.id,
          message: 'Output partitions unknown: ' + node.operator + ' in stage ' + task.stage + ' task ' + task.task });
      }
      if (node.network && document.kind !== 'recorded') {
        const producers = tasks.filter((t) => t.stage === node.network!.producer);
        const context = node.context!;
        let connection = connections.get(node.network.boundary);
        if (!connection) {
          connection = { producer: node.network.producer, consumer: task.stage, boundary: node.network.boundary,
            operator: node.operator, pairs: [], routingKnown: true };
          connections.set(node.network.boundary, connection);
        }
        const direct = node.operator === 'NetworkShuffleExec' && count?.value !== undefined &&
          producers.every((p) => /^Hash\(/.test(p.root.properties?.partitioning ?? '') &&
            p.counts.get(p.root)?.value === count.value! * context.count);
        const gather = node.operator === 'NetworkCoalesceExec' && context.count === 1;
        if (direct || gather) {
          for (const producer of producers) {
            connection.pairs.push({ from: producer.task, to: task.task,
              streams: direct ? count?.value : producer.counts.get(producer.root)?.value });
          }
          if (gather && producers.every((p) => p.counts.get(p.root)?.value !== undefined)) {
            const total = producers.reduce((s, p) => s + p.counts.get(p.root)!.value!, 0);
            if (count?.value !== undefined && count.value !== total) throw new Error('Gather partition conflict at line ' + node.line);
          }
        } else {
          connection.routingKnown = false;
          diagnostics.push({ code: 'unknown-routing', node: node.id,
            message: 'Routing unresolved for ' + node.operator + ' at line ' + node.line + '; no task-pair arrows inferred.' });
        }
      }
      node.children.forEach(visit);
    };
    visit(task.root);
  }
  return { tasks, connections: [...connections.values()], diagnostics };
}

/** File identity may differ; expressions, counts and branch shapes must agree. */
export function taskGroups(tasks: TaskPlan[]): TaskPlan[][] {
  const groups = new Map<string, TaskPlan[]>();
  for (const task of tasks) {
    const shape = (n: PlanNode): unknown => ({
      operator: n.operator, wrappers: n.wrappers, network: n.network?.producer,
      properties: Object.fromEntries(Object.entries(n.properties ?? {}).map(([k, v]) => [
        k, k === 'file_groups' ? v.match(/^\{?\d+ groups?/)?.[0] : k === 'active' ? v.replace(/\(\d+\//g, '(_/') : v,
      ])),
      count: task.counts.get(n)?.value, children: n.children.map(shape),
    });
    const key = JSON.stringify(shape(task.root));
    const group = groups.get(key) ?? []; group.push(task); groups.set(key, group);
  }
  return [...groups.values()];
}
