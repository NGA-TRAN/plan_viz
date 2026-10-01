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
  // NetworkCoalesceExec allocates ceil(producers / consumers) equal-size
  // producer slots (at least one). Its printed capacity therefore also establishes
  // each producer's output count. Never use the ambiguous stage-header partitions.
  if (document.kind !== 'recorded') {
    for (const task of tasks) {
      const constrain = (node: PlanNode): void => {
        if (node.network && node.operator === 'NetworkCoalesceExec') {
          const producers = tasks.filter((producer) => producer.stage === node.network!.producer);
          const slots = Math.max(1, Math.ceil(producers.length / node.context!.count));
          const capacity = task.counts.get(node)?.value;
          const perProducer = capacity === undefined ? undefined : capacity / slots;
          if (Number.isSafeInteger(perProducer) && perProducer! > 0) {
            for (const producer of producers) {
              if (producer.counts.get(producer.root)?.value === undefined) {
                producer.counts = partitionCounts(producer.root, perProducer);
              }
            }
          }
        }
        node.children.forEach(constrain);
      };
      constrain(task.root);
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
        const shuffle = node.operator === 'NetworkShuffleExec';
        // Direct shuffle requests Q partitions from every producer; two-phase
        // requests one partition from every producer and exposes one output per producer.
        // Their counts distinguish the modes when there is more than one producer.
        // Do not rely on a literal salt value or require RepartitionExec at the root:
        // upstream can insert PartialReduce above the producer's repartition.
        const direct = shuffle && count?.value !== undefined &&
          producers.every((p) => p.counts.get(p.root)?.value === count.value! * context.count);
        const twoPhase = shuffle && !direct && count?.value === producers.length &&
          producers.every((p) => p.counts.get(p.root)?.value === context.count);
        const broadcast = node.operator === 'NetworkBroadcastExec' && count?.value !== undefined;
        if (broadcast && producers.some((p) => {
          const value = p.counts.get(p.root)?.value;
          return value !== undefined && value !== count.value! * context.count;
        })) throw new Error('Broadcast partition conflict at line ' + node.line);
        const gather = node.operator === 'NetworkCoalesceExec';
        if (direct || twoPhase || broadcast || gather) {
          connection.routing = broadcast ? 'broadcast' : twoPhase ? 'shuffle-two-phase' : direct ? 'shuffle-direct' :
            context.count > 1 ? 'grouped-gather' : 'gather';
          let participants = producers;
          let groupedStreams: number | undefined;
          if (gather && context.count > 1) {
            // NetworkCoalesceExec assigns contiguous producer groups, giving the remainder
            // to the earliest consumers. Use the effective child context inside UNION.
            const base = Math.floor(producers.length / context.count);
            const remainder = producers.length % context.count;
            const length = base + Number(context.index < remainder);
            const start = context.index * base + Math.min(context.index, remainder);
            const maxLength = Math.max(1, Math.ceil(producers.length / context.count));
            participants = producers.slice(start, start + length);
            connection.groupedGather = true;
            if (count?.value !== undefined) {
              groupedStreams = count.value / maxLength;
              if (!Number.isSafeInteger(groupedStreams) || groupedStreams <= 0 ||
                producers.some((p) => {
                  const value = p.counts.get(p.root)?.value;
                  return value !== undefined && value !== groupedStreams;
                })) throw new Error('Grouped gather partition conflict at line ' + node.line);
              count.assigned = length * groupedStreams;
              count.padding = count.value - count.assigned;
              count.evidence = 'grouped gather capacity and contiguous task assignment';
            }
          }
          for (const producer of participants) {
            connection.pairs.push({ from: producer.task, to: task.task,
              streams: twoPhase ? 1 : (direct || broadcast) ? count?.value : groupedStreams ?? producer.counts.get(producer.root)?.value });
          }
          if (gather && context.count === 1 && producers.every((p) => p.counts.get(p.root)?.value !== undefined)) {
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
      count: task.counts.get(n)?.value, assigned: task.counts.get(n)?.assigned,
      padding: task.counts.get(n)?.padding, children: n.children.map(shape),
    });
    const key = JSON.stringify(shape(task.root));
    const group = groups.get(key) ?? []; group.push(task); groups.set(key, group);
  }
  return [...groups.values()];
}
