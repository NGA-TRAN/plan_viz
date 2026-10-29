import * as fs from 'fs';
import * as path from 'path';
import { ConverterService } from '../../services/converter.service';
import { ExecutionPlanParser } from '../../parsers/execution-plan.parser';
import { partitionCounts } from '../../analysis/partition-analysis';
import { ExcalidrawData } from '../../types/excalidraw.types';
import { LeafNodeGenerator } from '../generators/leaf-node.generator';

const source = (count: number): string =>
  `OrchardScanExec: file_groups={${count} groups: [...]}, projection=[id, value], output_partitioning=UnknownPartitioning(${count})`;
const convert = (text: string): ExcalidrawData => new ConverterService().convert(text);
const streams = (scene: ExcalidrawData, operator: string): Array<{ inputs: number; outputs: number }> =>
  scene.elements.flatMap((element) => {
    if (element.type !== 'text' || element.text !== operator || !element.containerId) return [];
    return [{
      inputs: scene.elements.filter((e) => e.type === 'arrow' && e.endBinding?.elementId === element.containerId).length,
      outputs: scene.elements.filter((e) => e.type === 'arrow' && e.startBinding?.elementId === element.containerId).length,
    }];
  });
const counts = (text: string): Array<number | undefined> =>
  [...partitionCounts(new ExecutionPlanParser().parse(text).root!).values()].map((count) => count.value);
const distributedPlan = (local: string, outputCount: number): string => [
  '┌───── DistributedExec ─────',
  `│ [Stage 1] => NetworkCoalesceExec: output_partitions=${outputCount}, input_tasks=1`,
  '└──────────────────────────',
  `  ┌───── Stage 1 ── tasks=1, partitions=${outputCount}`,
  ...local.split('\n').map((line) => '  │ ' + line),
  '  └──────────────────────────',
].join('\n');

describe('custom operator partition fallback', () => {
  test.each(['RelayEnvelopeExec', 'BatchTapExec', 'StreamGateExec'])('%s preserves four streams in both plan types', (operator) => {
    const local = `ProjectionExec: expr=[id@0 as id]\n  ${operator}\n    ${source(4)}`;
    for (const plan of [local, distributedPlan(local, 4)]) {
      expect(streams(convert(plan), operator)).toEqual([{ inputs: 4, outputs: 4 }]);
    }
  });

  test('preserves custom wrappers around both sides of a partitioned join and its aggregates', () => {
    const scene = convert(fs.readFileSync(path.join(__dirname, '../../../tests/inferred_custom_partitioned_join.sql'), 'utf8'));
    expect(streams(scene, 'RelayEnvelopeExec')).toEqual(Array(5).fill({ inputs: 4, outputs: 4 }));
    const tables = scene.elements.filter((e) => e.type === 'ellipse' && e.strokeColor === '#f08c00');
    expect(tables).toHaveLength(4);
    for (const table of tables) {
      const inputs = scene.elements.filter((e) => e.type === 'arrow' && e.endBinding?.elementId === table.id);
      expect(inputs).toHaveLength(2);
      expect(new Set(inputs.map((e) => e.type === 'arrow' && e.startBinding?.elementId)).size).toBe(2);
    }
  });

  test.each([
    'output_partitions=6',
    'output_partitioning=UnknownPartitioning(6)',
    'output_partitioning=Range([id@0 ASC], [(1), (2)], 6)',
    'partitions=6',
    'partitioning=Hash([id@0], 6)',
  ])('uses custom output metadata before the child count: %s', (properties) => {
    expect(streams(convert(`ProjectionExec: expr=[id@0 as id]\n  CustomExec: ${properties}\n    ${source(4)}`), 'CustomExec'))
      .toEqual([{ inputs: 4, outputs: 6 }]);
  });

  test('uses explicit input and output counts independently through nested custom operators', () => {
    const plan = 'ProjectionExec: expr=[id@0 as id]\n' +
      '  CustomExec: input_partitions=3, output_partitions=6\n' +
      '    AnotherCustomExec\n      UnknownSourceExec';
    const scene = convert(plan);
    expect(counts(plan)).toEqual([3, 3, 6, 6]);
    expect(streams(scene, 'CustomExec')).toEqual([{ inputs: 3, outputs: 6 }]);
    expect(streams(scene, 'AnotherCustomExec')).toEqual([{ inputs: 3, outputs: 3 }]);
  });

  test('does not mistake a custom parent output count for a known child input count', () => {
    const plan = 'ProjectionExec: expr=[id@0 as id]\n  CustomExec: output_partitions=6\n' +
      '    AnotherCustomExec\n      ' + source(4);
    expect(counts(plan)).toEqual([4, 4, 6, 6]);
    const scene = convert(plan);
    expect(streams(scene, 'CustomExec')).toEqual([{ inputs: 4, outputs: 6 }]);
    expect(streams(scene, 'AnotherCustomExec')).toEqual([{ inputs: 4, outputs: 4 }]);
  });

  test('uses a printed custom input count when the output count is omitted', () => {
    expect(counts('CustomExec: input_partitions=3\n  UnknownSourceExec')).toEqual([3, 3]);
  });

  test('prefers printed output metadata over other counts and consumer hints', () => {
    const plan = 'RepartitionExec: partitioning=RoundRobinBatch(8), input_partitions=2\n' +
      '  CustomExec: output_partitioning=UnknownPartitioning(6), output_partitions=5, partitions=4, input_partitions=3\n' +
      '    UnknownSourceExec';
    expect(counts(plan)).toEqual([3, 6, 8]);
  });

  test('preserves the full count when twelve custom streams are drawn with omission markers', () => {
    const plan = `ProjectionExec: expr=[id@0 as id]\n  CustomExec\n    ${source(12)}`;
    expect(counts(plan)).toEqual([12, 12, 12]);
    const scene = convert(plan);
    expect(streams(scene, 'CustomExec')).toEqual([{ inputs: 4, outputs: 4 }]);
    const title = scene.elements.find((e) => e.type === 'text' && e.text === 'CustomExec');
    if (!title || title.type !== 'text') throw new Error('Missing custom operator');
    const inputs = scene.elements.filter((e) => e.type === 'arrow' && e.endBinding?.elementId === title.containerId);
    expect(inputs.map((e) => e.customData?.partitionIndex)).toEqual([0, 1, 10, 11]);
    expect(inputs.every((e) => e.customData?.partitionTotal === 12)).toBe(true);
  });

  test.each(['unknown', '-1', '1.5', '9007199254740992'])('ignores invalid custom counts: %s', (value) => {
    expect(counts(`CustomExec: output_partitions=${value}, input_partitions=${value}, partitions=${value}\n  ${source(4)}`))
      .toEqual([4, 4]);
  });

  test.each([2, 3])('inherits four output partitions shared by %i children in both plan types', (childCount) => {
    const plan = 'ProjectionExec: expr=[id@0 as id]\n  CustomExec\n' +
      Array(childCount).fill('    ' + source(4)).join('\n');
    expect(counts(plan)).toEqual(Array(childCount + 2).fill(4));
    for (const text of [plan, distributedPlan(plan, 4)]) {
      expect(streams(convert(text), 'CustomExec')).toEqual([{ inputs: childCount * 4, outputs: 4 }]);
    }
  });

  test('leaves the custom output count unknown when children disagree', () => {
    const plan = `ProjectionExec: expr=[id@0 as id]\n  CustomExec\n    ${source(2)}\n    ${source(3)}`;
    expect(counts(plan)).toEqual([2, 3, undefined, undefined]);
    expect(streams(convert(plan), 'CustomExec')).toEqual([{ inputs: 5, outputs: 1 }]);
  });

  test('does not infer a shared count when one child count is unknown', () => {
    expect(counts(`CustomExec\n  ${source(4)}\n  UnknownSourceExec`)).toEqual([4, undefined, undefined]);
    expect(counts(`CustomExec\n  UnknownSourceExec\n  ${source(4)}`)).toEqual([undefined, 4, undefined]);
  });

  test('prefers explicit output metadata over the shared child count in both plan types', () => {
    const plan = `ProjectionExec: expr=[id@0 as id]\n  CustomExec: output_partitions=6\n    ${source(4)}\n    ${source(4)}`;
    expect(counts(plan)).toEqual([4, 4, 6, 6]);
    for (const text of [plan, distributedPlan(plan, 6)]) {
      expect(streams(convert(text), 'CustomExec')).toEqual([{ inputs: 8, outputs: 6 }]);
    }
  });

  test.each([0, 12])('preserves a shared count of %i through multiple custom inputs', (count) => {
    const plan = 'ProjectionExec: expr=[id@0 as id]\n  CustomExec\n' +
      `    OrchardFeedExec: output_partitions=${count}\n    MeadowFeedExec: output_partitions=${count}`;
    expect(counts(plan)).toEqual([count, count, count, count]);
    const visibleCount = count > 8 ? 4 : count;
    expect(streams(convert(plan), 'CustomExec')).toEqual([{ inputs: visibleCount * 2, outputs: visibleCount }]);
  });

  test('retains unknown counts when child metadata is absent', () => {
    expect(counts('CustomExec\n  UnknownSourceExec')).toEqual([undefined, undefined]);
  });

  test('inherits streaming source partitions', () => {
    const plan = 'ProjectionExec: expr=[id@0 as id]\n  CustomExec\n' +
      '    StreamingTableExec: partition_sizes=[10, 20, 30, 40]';
    expect(counts(plan)).toEqual([4, 4, 4]);
    expect(streams(convert(plan), 'CustomExec')).toEqual([{ inputs: 4, outputs: 4 }]);
  });

  test('uses a registered child renderer count when plan analysis has no count', () => {
    const plan = 'ProjectionExec: expr=[id@0 as id]\n  CustomExec\n    UserSourceExec';
    expect(counts(plan)).toEqual([undefined, undefined, undefined]);
    const converter = new ConverterService({ generator: { customGenerators: [{
      operator: 'UserSourceExec',
      generator: new LeafNodeGenerator({ details: () => [], outputArrows: () => 4 }),
    }] } });
    expect(streams(converter.convert(plan), 'CustomExec')).toEqual([{ inputs: 4, outputs: 4 }]);
  });

  test.each([4, 6])('compares multiple registered child counts: four and %i', (secondCount) => {
    const plan = 'ProjectionExec: expr=[id@0 as id]\n  CustomExec\n    OrchardFeedExec\n    MeadowFeedExec';
    const converter = new ConverterService({ generator: { customGenerators: [
      { operator: 'OrchardFeedExec', generator: new LeafNodeGenerator({ details: () => [], outputArrows: () => 4 }) },
      { operator: 'MeadowFeedExec', generator: new LeafNodeGenerator({ details: () => [], outputArrows: () => secondCount }) },
    ] } });
    expect(streams(converter.convert(plan), 'CustomExec'))
      .toEqual([{ inputs: 4 + secondCount, outputs: secondCount === 4 ? 4 : 1 }]);
  });

  test('preserves zero explicit partitions without inventing a stream', () => {
    const plan = 'ProjectionExec: expr=[id@0 as id]\n  CustomExec\n    UnknownSourceExec: output_partitions=0';
    expect(counts(plan)).toEqual([0, 0, 0]);
    expect(streams(convert(plan), 'CustomExec')).toEqual([{ inputs: 0, outputs: 0 }]);
  });

  test('does not replace known repartition, aggregate or coalesce contracts with the fallback', () => {
    expect(counts('CustomExec\n  CoalescePartitionsExec\n    ' + source(4))).toEqual([4, 1, 1]);
    expect(counts('CustomExec\n  AggregateExec: mode=Final, gby=[], aggr=[count(*)]\n    ' + source(4)))
      .toEqual([4, 1, 1]);
    expect(counts('CustomExec\n  RepartitionExec: partitioning=RoundRobinBatch(8), input_partitions=4\n    ' + source(4)))
      .toEqual([4, 8, 8]);
  });
});
