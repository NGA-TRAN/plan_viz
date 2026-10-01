import * as fs from 'fs';
import * as path from 'path';
import { ExecutionPlanParser } from '../execution-plan.parser';
import { PlanDocumentParser } from '../plan-document.parser';
import { partitionCounts } from '../../analysis/partition-analysis';
import { analyzeDistributed } from '../../analysis/distributed-analysis';
import { ConverterService } from '../../services/converter.service';

const counts = (text: string, capacity?: number): Array<number | undefined> => {
  const root = new ExecutionPlanParser().parse(text).root!;
  return [...partitionCounts(root, capacity).values()].map((count) => count.value);
};

describe('partition counts inferred from consumers', () => {
  test('repartition input metadata crosses cooperative and preserving wrappers', () => {
    expect(counts('RepartitionExec: partitioning=RoundRobinBatch(8), input_partitions=1\n' +
      '  CooperativeExec\n    FilterExec: predicate=value@0 > 0\n      SequenceSourceExec: t0:[0-6), t1:[6-11)'))
      .toEqual([1, 1, 1, 8]);
  });
  test('structurally recognized repartition works without a registered name', () => {
    expect(counts('RedistributeExec: partitioning=RoundRobinBatch(8), input_partitions=2\n  FeedSourceExec'))
      .toEqual([2, 8]);
  });
  test('preserving sort and partial aggregates transmit known output capacity', () => {
    expect(counts('SortExec: preserve_partitioning=[true]\n' +
      '  AggregateExec: mode=Partial, gby=[key@0 as key], aggr=[count(*)]\n    FeedSourceExec', 2))
      .toEqual([2, 2, 2]);
  });
  test.each(['MysteryExec', 'CoalescePartitionsExec', 'SortExec: preserve_partitioning=[false]',
    'SortExec', 'AggregateExec: mode=Final, gby=[], aggr=[count(*)]'])('does not infer input counts through %s', (operator) => {
    expect(counts(operator + '\n  FeedSourceExec', 1)[0]).toBeUndefined();
  });
  test('source metadata and local contracts take precedence over contradictory consumer hints', () => {
    expect(counts('RepartitionExec: partitioning=RoundRobinBatch(8), input_partitions=1\n' +
      '  CooperativeExec\n    DataSourceExec: file_groups={4 groups: [...]}')).toEqual([4, 4, 8]);
    expect(counts('FeedSourceExec: output_partitions=3', 2)).toEqual([3]);
    expect(counts('CoalescePartitionsExec\n  FeedSourceExec', 2)).toEqual([undefined, 1]);
  });
  test.each(['unknown', '-1', '1.5', '9007199254740992'])('rejects invalid input count %s', (value) => {
    expect(counts('RepartitionExec: partitioning=RoundRobinBatch(8), input_partitions=' + value + '\n  FeedSourceExec'))
      .toEqual([undefined, 8]);
  });
  test('task ranges and chunk lists alone do not establish a custom source contract', () => {
    expect(counts('SequenceSourceExec: t0:[0-6), t1:[6-11)')).toEqual([undefined]);
    expect(counts('FeedSourceExec: tasks=2, partition_chunks=[[3, 1], [2], [4], [1, 1]]')).toEqual([undefined]);
  });
  test.each([
    ['custom_source_repartition', 1, 16],
    ['work_feed_gather', 2, 2],
  ])('%s resolves custom sources and draws exact stream bundles', (name, sourcePartitions, streams) => {
    const text = fs.readFileSync(path.join(__dirname, '../../../tests/distributed/' + name + '.sql'), 'utf8');
    const document = new PlanDocumentParser().parse(text);
    if (document.kind === 'single') throw new Error('Expected distributed plan');
    const result = analyzeDistributed(document);
    expect(result.diagnostics).toEqual([]);
    const tasks = result.tasks.filter((task) => task.stage === '1');
    for (const task of tasks) {
      const leaf = [...task.counts.keys()].find((node) => node.children.length === 0)!;
      expect(task.counts.get(leaf)?.value).toBe(sourcePartitions);
    }
    expect(result.connections.find((edge) => edge.producer === '1')?.pairs)
      .toEqual([{ from: 0, to: 0, streams }, { from: 1, to: 0, streams }]);
    const scene = new ConverterService().convert(text);
    expect(scene.elements.filter((element) => element.type === 'text')
      .some((element) => element.text.includes('unknown') || element.text.startsWith('Diagnostics'))).toBe(false);
  });
});
