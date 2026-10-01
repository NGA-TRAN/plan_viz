import * as fs from 'fs';
import * as path from 'path';
import { PlanDocumentParser } from '../plan-document.parser';
import { analyzeDistributed, taskGroups } from '../../analysis/distributed-analysis';
import { ConverterService } from '../../services/converter.service';
import { PlanNode } from '../../types/plan-document.types';

const nodes = (root: PlanNode): PlanNode[] => [root, ...root.children.flatMap(nodes)];
const analyze = (text: string): ReturnType<typeof analyzeDistributed> => {
  const document = new PlanDocumentParser().parse(text);
  if (document.kind === 'single') throw new Error('Expected distributed plan');
  return analyzeDistributed(document);
};
const plan = (producers: number, consumers: number, partitions: number): string => {
  const capacity = Math.ceil(producers / consumers) * partitions;
  return `┌───── DistributedExec
│ CoalescePartitionsExec
│   [Stage 2] => NetworkCoalesceExec: output_partitions=${consumers}, input_tasks=${consumers}
└─────────────────────────
  ┌───── Stage 2 ── tasks=${consumers}, partitions=${consumers}
  │ AggregateExec: mode=PartialReduce, gby=[category@0 as category], aggr=[count(*)]
  │   CoalescePartitionsExec
  │     [Stage 1] => NetworkCoalesceExec: output_partitions=${capacity}, input_tasks=${producers}
  └─────────────────────────
    ┌───── Stage 1 ── tasks=${producers}, partitions=${producers * partitions}
    │ AggregateExec: mode=Partial, gby=[category@0 as category], aggr=[count(*)]
    │   DataSourceExec: file_groups={${partitions} groups: [...]}, projection=[category], file_type=parquet
    └─────────────────────────`;
};

describe('grouped network gathers', () => {
  test.each([
    { producers: 3, consumers: 2, partitions: 3, targets: [0, 0, 1], assigned: [6, 3], padding: [0, 3] },
    { producers: 4, consumers: 2, partitions: 2, targets: [0, 0, 1, 1], assigned: [4, 4], padding: [0, 0] },
    { producers: 5, consumers: 2, partitions: 2, targets: [0, 0, 0, 1, 1], assigned: [6, 4], padding: [0, 2] },
    { producers: 1, consumers: 3, partitions: 2, targets: [0], assigned: [2, 0, 0], padding: [0, 2, 2] },
    { producers: 2, consumers: 5, partitions: 2, targets: [0, 1], assigned: [2, 2, 0, 0, 0], padding: [0, 0, 2, 2, 2] },
  ])('$producers producers to $consumers consumers retain exact routing and padding', (example) => {
    const text = plan(example.producers, example.consumers, example.partitions);
    const result = analyze(text);
    expect(result.diagnostics).toEqual([]);
    const edge = result.connections.find((connection) => connection.producer === '1')!;
    expect(edge.routingKnown).toBe(true);
    expect(edge.pairs).toEqual(example.targets.map((to, from) => ({ from, to, streams: example.partitions })));
    const tasks = result.tasks.filter((task) => task.stage === '2');
    const counts = tasks.map((task) => task.counts.get(nodes(task.root).find((node) => node.network)!));
    expect(counts.map((count) => count?.assigned)).toEqual(example.assigned);
    expect(counts.map((count) => count?.padding)).toEqual(example.padding);
    expect(counts.map((count) => count?.value)).toEqual(Array(example.consumers).fill(Math.ceil(example.producers / example.consumers) * example.partitions));
    expect(tasks.map((task) => task.counts.get(task.root)?.value)).toEqual(Array(example.consumers).fill(1));
    const scene = new ConverterService({ distributed: { workerDisplay: 'all' } }).convert(text);
    const arrows = scene.elements.filter((element) => element.customData?.role === 'network-bundle' && element.customData.boundary === edge.boundary);
    expect(arrows).toHaveLength(example.producers);
    for (const arrow of arrows) {
      if (arrow.type !== 'arrow') throw new Error('Expected arrow');
      const receiver = scene.elements.find((element) => element.id === arrow.endBinding?.elementId)!;
      expect(receiver.customData).toMatchObject({ role: 'network-input', stage: '2', task: example.targets[Number(arrow.customData?.from)] });
    }
  });

  test('the small reduction tree shows all producers and both padded and full receivers', () => {
    const scene = new ConverterService().convert(plan(3, 2, 3));
    expect(scene.elements.filter((element) => element.customData?.role === 'worker' && element.customData.stage === '1')).toHaveLength(3);
    expect(scene.elements.filter((element) => element.customData?.role === 'network-bundle')).toHaveLength(5);
    expect(scene.elements.filter((element) => element.customData?.role === 'network-ellipsis')).toHaveLength(0);
    const labels = scene.elements.filter((element) => element.type === 'text').map((element) => element.text);
    expect(labels).toContain('output partitions = 6\nassigned streams = 6\nempty padding = 0');
    expect(labels).toContain('output partitions = 6\nassigned streams = 3\nempty padding = 3');
  });

  test('larger compacted gathers count only the omitted valid connections', () => {
    const text = plan(5, 2, 2);
    const edge = analyze(text).connections.find((connection) => connection.producer === '1')!;
    const scene = new ConverterService().convert(text);
    const arrows = scene.elements.filter((element) => element.customData?.role === 'network-bundle' && element.customData.boundary === edge.boundary);
    expect(arrows.map((arrow) => [arrow.customData?.from, arrow.customData?.to])).toEqual([[0, 0], [4, 1]]);
    const dots = scene.elements.filter((element) => element.customData?.role === 'network-ellipsis' && element.customData.boundary === edge.boundary);
    expect(dots).toHaveLength(1);
    expect(dots[0].customData?.omitted).toBe(3);
    const receivers = analyze(plan(5, 3, 2)).tasks.filter((task) => task.stage === '2');
    expect(taskGroups(receivers).map((group) => group.map((task) => task.task))).toEqual([[0, 1], [2]]);
  });

  test('UNION child contexts determine the receiver group, not the enclosing stage size', () => {
    const text = fs.readFileSync(path.join(__dirname, '../../../tests/distributed/union_distinct_branches.sql'), 'utf8')
      .replace('NetworkCoalesceExec: output_partitions=12', 'NetworkCoalesceExec: output_partitions=48')
      .replace('NetworkShuffleExec: output_partitions=4', 'NetworkCoalesceExec: output_partitions=16');
    const result = analyze(text);
    expect(result.diagnostics).toEqual([]);
    const edge = result.connections.find((connection) => connection.producer === '1')!;
    expect(edge.pairs).toEqual([
      { from: 0, to: 1, streams: 8 }, { from: 1, to: 1, streams: 8 }, { from: 2, to: 2, streams: 8 },
    ]);
    const scene = new ConverterService().convert(text);
    expect(scene.elements.filter((element) => element.customData?.role === 'network-bundle' && element.customData.boundary === edge.boundary)).toHaveLength(3);
  });

  test('rejects capacity inconsistent with producer partition counts', () => {
    for (const capacity of [5, 8]) {
      expect(() => analyze(plan(3, 2, 3).replace('output_partitions=6', 'output_partitions=' + capacity)))
        .toThrow('Grouped gather partition conflict');
    }
  });

  test('declared receiver capacity establishes stream counts for unknown producer operators', () => {
    const result = analyze(plan(3, 2, 3).replace('AggregateExec: mode=Partial,', 'CustomReduceExec:'));
    expect(result.diagnostics).toEqual([]);
    expect(result.tasks.filter((task) => task.stage === '1').map((task) => task.counts.get(task.root)?.value)).toEqual([3, 3, 3]);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'unknown-routing')).toBe(false);
    expect(result.connections.find((connection) => connection.producer === '1')?.pairs)
      .toEqual([{ from: 0, to: 0, streams: 3 }, { from: 1, to: 0, streams: 3 }, { from: 2, to: 1, streams: 3 }]);
  });
});
