import * as fs from 'fs';
import * as path from 'path';
import { PlanDocumentParser } from '../plan-document.parser';
import { ExecutionPlanParser } from '../execution-plan.parser';
import { analyzeDistributed } from '../../analysis/distributed-analysis';
import { partitionCounts } from '../../analysis/partition-analysis';
import { ConverterService } from '../../services/converter.service';
import { assertTextBindings } from '../../generators/__tests__/utils/text-binding-assertions';

const fixture = (name: string): string => fs.readFileSync(path.join(__dirname, '../../../tests/distributed/' + name + '.sql'), 'utf8');
const analyze = (text: string): ReturnType<typeof analyzeDistributed> => {
  const document = new PlanDocumentParser().parse(text);
  if (document.kind === 'single') throw new Error('Expected distributed plan');
  return analyzeDistributed(document);
};
const networkPlan = (mode: string, producers: number, consumers: number, partitions: number): string => {
  const output = mode === 'shuffle-two-phase' ? producers : partitions;
  const input = mode === 'shuffle-two-phase' ? consumers : consumers * partitions;
  const receiver = mode === 'broadcast' ? 'NetworkBroadcastExec: partitions_per_consumer=' + output + ', stage_partitions=0' :
    'NetworkShuffleExec: output_partitions=' + output;
  const producer = mode === 'broadcast' ? `BroadcastExec: input_partitions=${partitions}, consumer_tasks=${consumers}, output_partitions=${input}` :
    `RepartitionExec: partitioning=Hash([key@0], ${input}), input_partitions=${partitions}`;
  return `┌───── DistributedExec
│ CoalescePartitionsExec
│   [Stage 2] => NetworkCoalesceExec: output_partitions=${consumers * output}, input_tasks=${consumers}
└──────────────────
  ┌───── Stage 2 ── tasks=${consumers}, partitions=${consumers * output}
  │ [Stage 1] => ${receiver}, input_tasks=${producers}
  └──────────────────
    ┌───── Stage 1 ── tasks=${producers}, partitions=${producers * input}
    │ ${producer}
    │   DataSourceExec: file_groups={${partitions} groups: [...]}, projection=[key], file_type=parquet
    └──────────────────`;
};

describe('audited upstream network contracts', () => {
  test.each(['broadcast', 'shuffle-direct', 'shuffle-two-phase'])('%s uses exact producer/consumer pairs and stream multiplicity', (mode) => {
    for (const [producers, consumers, partitions] of [[3, 2, 2], [4, 3, 5], [2, 1, 3]]) {
      const text = networkPlan(mode, producers, consumers, partitions);
      const result = analyze(text);
      expect(result.diagnostics).toEqual([]);
      const edge = result.connections.find((connection) => connection.producer === '1')!;
      expect(edge.routing).toBe(mode);
      expect(edge.pairs).toEqual(Array.from({ length: consumers }, (_, to) =>
        Array.from({ length: producers }, (_, from) => ({ from, to, streams: mode === 'shuffle-two-phase' ? 1 : partitions }))).flat());
      const scene = new ConverterService({ distributed: { workerDisplay: 'all' } }).convert(text);
      const arrows = scene.elements.filter((element) => element.customData?.role === 'network-bundle' && element.customData.boundary === edge.boundary);
      expect(arrows).toHaveLength(producers * consumers);
      for (const arrow of arrows) {
        if (arrow.type !== 'arrow') throw new Error('Expected arrow');
        expect(scene.elements.find((element) => element.id === arrow.endBinding?.elementId)?.customData)
          .toMatchObject({ role: 'network-input', boundary: edge.boundary, task: arrow.customData?.to });
      }
      assertTextBindings(scene.elements);
    }
  });
  test('single producer mode overlap has identical one-stream bundles', () => {
    const result = analyze(networkPlan('shuffle-two-phase', 1, 3, 2));
    expect(result.connections.find((edge) => edge.producer === '1')?.pairs)
      .toEqual([0, 1, 2].map((to) => ({ from: 0, to, streams: 1 })));
  });
  test('partial reduction above repartition retains direct routing and sort-merge details', () => {
    const text = fixture('shuffle_partial_reduce');
    expect(analyze(text).connections.find((edge) => edge.producer === '1')?.routing).toBe('shuffle-direct');
    expect(analyze(text).diagnostics).toEqual([]);
    expect(new ConverterService().convert(text).elements.some((element) => element.type === 'text' && element.text.includes('sort-merge'))).toBe(true);
  });
  test('broadcast inside UNION uses the branch-local consumer count', () => {
    const text = fixture('union_distinct_branches')
      .replace('NetworkShuffleExec: output_partitions=4', 'NetworkBroadcastExec: partitions_per_consumer=4')
      .replace('RepartitionExec: partitioning=Hash([region@0], 8), input_partitions=4',
        'BroadcastExec: input_partitions=4, consumer_tasks=2, output_partitions=8');
    const edge = analyze(text).connections.find((connection) => connection.producer === '1')!;
    expect(edge.routing).toBe('broadcast');
    expect(new Set(edge.pairs.map((pair) => pair.to))).toEqual(new Set([1, 2]));
    expect(edge.pairs).toHaveLength(6);
    expect(edge.pairs.every((pair) => pair.streams === 4)).toBe(true);
  });
  test('broadcast capacity mismatch is rejected', () => {
    expect(() => analyze(networkPlan('broadcast', 3, 2, 2).replace('output_partitions=4\n    │', 'output_partitions=5\n    │')))
      .toThrow('Broadcast partition conflict');
  });
  test('missing producer evidence does not fabricate a shuffle mode', () => {
    const text = networkPlan('shuffle-direct', 3, 2, 2).replace(/RepartitionExec:[^\n]+\n    │   DataSourceExec:[^\n]+/, 'UnspecifiedSourceExec');
    const result = analyze(text);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'unknown-routing')).toBe(true);
    expect(result.connections.find((edge) => edge.producer === '1')?.pairs).toEqual([]);
  });
  test('worker-only broadcast preserves output capacity without invented producers', () => {
    const result = analyze('[Stage 1] => NetworkBroadcastExec: partitions_per_consumer=3, stage_partitions=0, input_tasks=4');
    expect(result.connections).toEqual([]);
    expect(result.tasks[0].counts.get(result.tasks[0].root)?.value).toBe(3);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['partial-recording']);
  });
});

describe('audited public local operator counts', () => {
  test.each([
    ['NumbersExec: t0:[0-4), t1:[4-8)', 1],
    ['SamplerExec: partitions=3\n  UnspecifiedSourceExec', 3],
    ['SamplerExec\n  NumbersExec: t0:[0-4)', 1],
    ['CacheExec\n  DataSourceExec: file_groups={2 groups: [...]}', 2],
    ['BroadcastExec: input_partitions=2, consumer_tasks=3\n  UnspecifiedSourceExec', 6],
    ['URLEmitterExec: tasks=2 partitions=4 tag=demo', 4],
    ['RemoteScanExec: tasks=2, partition_chunks=[[3, 1], [2], [4], [1, 1]]', 4],
    ['RowGeneratorExec: tasks=2, partition_ops=[[rows(2)], [], [rows(1)], [rows(3)]]', 4],
    ['PartitionIsolatorExec: tasks=3 partitions=7\n  UnknownSourceExec', 3],
    ['PartitionIsolatorExec: tasks=0 partitions=7\n  UnknownSourceExec', undefined],
    ['MockExec', undefined],
    ['StatefulPassThroughExec\n  NumbersExec', 1],
    ['CustomPassThroughExec\n  NumbersExec', 1],
    ['CustomConfigExtensionRequiredExec\n  NumbersExec', 1],
    ['ErrorThrowingExec\n  NumbersExec', 1],
    ['RemoteScanExec: tasks=2, partition_chunks=[broken]', undefined],
    ['SamplerExec: partitions=invalid\n  UnknownSourceExec', undefined],
    ['MysteryExec\n  NumbersExec', undefined],
  ])('%s has capacity %s', (text, expected) => {
    const root = new ExecutionPlanParser().parse(text as string).root!;
    expect(partitionCounts(root).get(root)?.value).toBe(expected);
  });
  test('feed counts use effective distributed context, not the global metadata task count', () => {
    const text = fixture('work_feed_gather').replace('WorkFeedSourceExec', 'RowGeneratorExec')
      .replace('partition_chunks=[[3, 1], [2], [4], [1, 1]]', 'partition_ops=[[rows(2)], [], [rows(1)], [rows(3)]]');
    const result = analyze(text);
    expect(result.diagnostics).toEqual([]);
    for (const task of result.tasks.filter((task) => task.stage === '1')) {
      expect(task.counts.get(task.root.children[0])?.value).toBe(2);
    }
  });
  test('DistributedAnalyzeExec accepts the upstream colonless display and exposes one result partition', () => {
    const result = analyze('DistributedAnalyzeExec verbose=true\n  DistributedExec\n    CoalescePartitionsExec\n      NumbersExec');
    expect(result.tasks[0].root.operator).toBe('DistributedAnalyzeExec');
    expect(result.tasks[0].root.properties?.verbose).toBe('true');
    expect(result.tasks[0].counts.get(result.tasks[0].root)?.value).toBe(1);
  });
  test.each(['Inner', 'Left', 'Right', 'Full', 'LeftSemi', 'RightAnti', 'LeftMark'])('nested-loop %s keeps probe partition capacity', (joinType) => {
    const root = new ExecutionPlanParser().parse('NestedLoopJoinExec: join_type=' + joinType +
      '\n  NumbersExec\n  DataSourceExec: file_groups={3 groups: [...]}').root!;
    expect(partitionCounts(root).get(root)?.value).toBe(3);
  });
  test('legacy isolation assigns contiguous groups with empty output padding', () => {
    const result = analyze(fixture('legacy_partition_isolator'));
    expect(result.diagnostics).toEqual([]);
    const counts = result.tasks.filter((task) => task.stage === '1').map((task) => task.counts.get(task.root));
    expect(counts.map((count) => count?.value)).toEqual([3, 3, 3]);
    expect(counts.map((count) => count?.assigned)).toEqual([3, 2, 2]);
    expect(counts.map((count) => count?.padding)).toEqual([0, 1, 1]);
  });
  test('standalone sampler propagates inferred counts through its preserving children', () => {
    const scene = new ConverterService().convert('SamplerExec: partitions=3\n  CooperativeExec\n    UnknownSourceExec');
    for (const operator of ['UnknownSourceExec', 'CooperativeExec']) {
      const title = scene.elements.find((element) => element.type === 'text' && element.text === operator);
      if (!title || title.type !== 'text') throw new Error('Missing operator');
      expect(scene.elements.filter((element) => element.type === 'arrow' && element.startBinding?.elementId === title.containerId))
        .toHaveLength(3);
    }
    assertTextBindings(scene.elements);
  });
  test('standalone sampler retains topology when a source omits partition metadata', () => {
    const scene = new ConverterService().convert('SamplerExec\n  CustomWrapperExec\n    DataSourceExec');
    for (const operator of ['DataSourceExec', 'CustomWrapperExec']) {
      const title = scene.elements.find((element) => element.type === 'text' && element.text === operator);
      if (!title || title.type !== 'text') throw new Error('Missing operator');
      expect(scene.elements.filter((element) => element.type === 'arrow' && element.startBinding?.elementId === title.containerId))
        .toHaveLength(1);
    }
    assertTextBindings(scene.elements);
  });
  test('resolved custom sources draw two arrows instead of a single topology edge', () => {
    const scene = new ConverterService().convert(fixture('work_feed_gather'));
    const sources = scene.elements.filter((element) => element.type === 'text' && element.text === 'WorkFeedSourceExec');
    expect(sources).toHaveLength(2);
    for (const source of sources) {
      if (source.type !== 'text') throw new Error('Expected text');
      expect(scene.elements.filter((element) => element.type === 'arrow' && element.startBinding?.elementId === source.containerId)).toHaveLength(2);
    }
  });
});
