import * as fs from 'fs';
import * as path from 'path';
import { PlanDocumentParser } from '../plan-document.parser';
import { ExecutionPlanParser } from '../execution-plan.parser';
import { analyzeDistributed, taskGroups } from '../../analysis/distributed-analysis';
import { ConverterService } from '../../services/converter.service';
import { ExcalidrawData } from '../../types/excalidraw.types';
import { PlanNode } from '../../types/plan-document.types';
import { PropertyParser } from '../../generators/utils/property.parser';

const fixture = (name: string): string => fs.readFileSync(path.join(__dirname, '../../../tests/distributed', name + '.sql'), 'utf8');
const parser = new PlanDocumentParser();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const validateScene: (scene: ExcalidrawData) => string[] = require('../../../scripts/audit-corpus.cjs').validateScene;

describe('distributed conversion', () => {
  test.each([
    ['gather_four_tasks', 4, 2, 2],
    ['grouped_gather_partial_reduction', 5, 5, 0],
    ['hash_aggregate_four_to_three', 15, 6, 9],
    ['colocated_join_four_tasks', 4, 2, 2],
    ['join_aggregate_six_to_four', 28, 6, 22],
    ['union_distinct_branches', 9, 7, 2],
    ['union_five_branches_metrics', 3, 3, 0],
    ['full_outer_join_two_shuffles', 36, 10, 26],
    ['dynamic_filter_range_join', 6, 6, 0],
    ['count_distinct_union_time_ranges', 9, 7, 2],
  ])('%s preserves all logical connections while drawing representatives', (name, pairs, visible, omitted) => {
    const text = fixture(name as string); const doc = parser.parse(text);
    if (doc.kind === 'single') throw new Error('Expected distributed document');
    const analysis = analyzeDistributed(doc);
    expect(analysis.diagnostics).toEqual([]);
    expect(analysis.connections.reduce((s, c) => s + c.pairs.length, 0)).toBe(pairs);
    const scene = new ConverterService().convert(text);
    expect(validateScene(scene)).toEqual([]);
    const arrows = scene.elements.filter((e) => e.customData?.role === 'network-bundle');
    expect(arrows).toHaveLength(visible as number);
    for (const arrow of arrows) {
      if (arrow.type !== 'arrow') throw new Error('Expected bundle arrow');
      const target = scene.elements.find((e) => e.id === arrow.endBinding?.elementId)!;
      expect(target.customData?.role).toBe('network-input');
      expect(target.customData?.boundary).toBe(arrow.customData?.boundary);
      expect(target.customData?.task).toBe(arrow.customData?.to);
      const end = arrow.points[arrow.points.length - 1];
      expect(arrow.y + end[1]).toBeCloseTo(target.y + target.height + 1);
      expect(arrow.x + end[0]).toBeGreaterThan(target.x);
      expect(arrow.x + end[0]).toBeLessThan(target.x + target.width);
    }
    expect(scene.elements.filter((e) => e.customData?.role === 'network-ellipsis')
      .reduce((s, e) => s + Number(e.customData?.omitted), 0)).toBe(omitted);
    const ids = new Map(scene.elements.map((e) => [e.id, e]));
    expect(ids.size).toBe(scene.elements.length);
    for (const e of scene.elements) {
      if (e.type === 'arrow') {
        for (const b of [e.startBinding, e.endBinding]) {
          if (b) {
            expect(ids.get(b.elementId)?.boundElements).toContainEqual({ id: e.id, type: 'arrow' });
          }
        }
      }
    }
  });
  test('UNION resolves the child-local context, not the whole stage', () => {
    const doc = parser.parse(fixture('union_distinct_branches'));
    if (doc.kind === 'single') throw new Error('Expected distributed document');
    const result = analyzeDistributed(doc);
    const shuffle = result.connections.find((c) => c.operator === 'NetworkShuffleExec')!;
    expect([...new Set(shuffle.pairs.map((p) => p.to))]).toEqual([1, 2]);
    expect(shuffle.pairs.every((p) => p.streams === 4)).toBe(true);
    const tasks = result.tasks.filter((t) => t.stage === '2');
    expect(tasks.map((t) => t.counts.get(t.root)?.value)).toEqual([4, 4, 4]);
    expect(taskGroups(tasks).map((g) => g.length)).toEqual([1, 2]);
  });
  test('UNION assignment parsing preserves appended EXPLAIN ANALYZE metrics', () => {
    const input = fixture('union_distinct_branches').replace(/(DistributedUnionExec:[^\n]+)/,
      '$1, metrics=[output_rows={0:7, 1:9, 2:4}, elapsed_compute=2ms]');
    const doc = parser.parse(input);
    if (doc.kind === 'single') throw new Error('Expected distributed document');
    const analysis = analyzeDistributed(doc);
    expect(analysis.diagnostics).toEqual([]);
    const unions = analysis.tasks.flatMap((t) => {
      const nodes = (n: typeof t.root): typeof t.root[] => [n, ...n.children.flatMap(nodes)];
      return nodes(t.root).filter((n) => n.operator === 'DistributedUnionExec');
    });
    expect(unions).toHaveLength(3);
    expect(unions.every((n) => n.properties?.metrics?.includes('output_rows'))).toBe(true);
    expect(validateScene(new ConverterService().convert(input))).toEqual([]);
  });
  test('expanded display shows all connections without omission labels', () => {
    const scene = new ConverterService({ distributed: { workerDisplay: 'all' } }).convert(fixture('hash_aggregate_four_to_three'));
    expect(scene.elements.filter((e) => e.customData?.role === 'network-bundle')).toHaveLength(15);
    expect(scene.elements.filter((e) => e.customData?.role === 'network-ellipsis')).toHaveLength(0);
  });
  test('sources without file-group metadata do not claim zero groups', () => {
    const scene = new ConverterService().convert('DataSourceExec: table=meadow_archive');
    const labels = scene.elements.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
    expect(labels).toContain('file groups: unknown');
    expect(labels).not.toContain('file groups: 0');
  });
  test('direct tree API still rejects distributed documents', () => {
    expect(() => new ExecutionPlanParser().parse(fixture('gather_four_tasks'))).toThrow('Distributed plans');
  });
  test('sections are explicit and 1-based', () => {
    const text = '---\nsource: invented\n---\n## first\nEmptyExec\n## second\n' + fixture('gather_four_tasks');
    expect(() => parser.parse(text)).toThrow('Select a plan section');
    expect(parser.parse(text, 2).kind).toBe('distributed');
    expect(() => parser.parse(text, 0)).toThrow('Invalid plan section');
  });
  test('rejects missing stages, conflicts, cycles and wrong producer counts', () => {
    const text = fixture('hash_aggregate_four_to_three');
    expect(() => parser.parse(text.replace('[Stage 1]', '[Stage 99]'))).toThrow('Missing producer');
    expect(() => parser.parse(text.replace('[Stage 1]', '[Stage 2]').replace('input_tasks=4', 'input_tasks=3'))).toThrow('cycle');
    expect(() => parser.parse(text.replace('input_tasks=4', 'input_tasks=5'))).toThrow('mismatch');
    expect(() => parser.parse(text + text.replace('tasks=4', 'tasks=5'))).toThrow('Conflicting');
  });
  test('quoted stage text does not change document kind', () => {
    expect(parser.parse('FilterExec: predicate=name = \'[Stage 1] => NetworkShuffleExec\'\n  EmptyExec').kind).toBe('single');
  });
  test('unknown operators retain unknown counts and a visible diagnostic', () => {
    const result = new ConverterService().convertDetailed(fixture('gather_four_tasks').replace(/MeadowScanExec:[^\n]+/, 'MysteryExec\n  │   UnknownSourceExec'));
    expect(result.diagnostics.some((d) => d.code === 'unknown-count')).toBe(true);
    expect(result.scene.elements.some((e) => e.type === 'text' && e.text.includes('output partitions = unknown'))).toBe(true);
  });
  test('worker-only input remains visibly partial with no guessed network edges', () => {
    const result = new ConverterService().convertDetailed('[Stage 3] => NetworkShuffleExec: output_partitions=4, input_tasks=2');
    expect(result.document.kind).toBe('recorded');
    expect(result.diagnostics[0].code).toBe('partial-recording');
    expect(result.scene.elements.filter((e) => e.customData?.role === 'network-bundle')).toHaveLength(0);
  });
});

describe('distributed edge cases found during corpus review', () => {
  const source = (n: number, name = 'part'): string =>
    'MeadowScanExec: file_groups={' + n + ' groups: [[' + name + '.parquet]]}, projection=[region], file_type=parquet';
  const boxed = (head: string, child: string, tasks: number): string =>
    '┌───── DistributedExec\n│ ' + head.replace(/\n/g, '\n│ ') + '\n└────\n' +
    '  ┌───── Stage 1 ── tasks=' + tasks + ', partitions=12\n  │ ' + child.replace(/\n/g, '\n  │ ') + '\n  └────';
  test('leaf specialization chooses the same task on both sides of a join', () => {
    const leaf = 'DistributedLeafExec:\n  t0: ' + source(2, 'first') + '\n  t1: ' + source(2, 'last');
    const tree = 'HashJoinExec: mode=Partitioned, join_type=Inner, on=[(region@0, region@0)]\n' +
      leaf.split('\n').map((l) => '  ' + l).join('\n') + '\n' + leaf.split('\n').map((l) => '  ' + l).join('\n');
    const text = boxed('[Stage 1] => NetworkCoalesceExec: output_partitions=4, input_tasks=2', tree, 2);
    const doc = parser.parse(text);
    if (doc.kind === 'single') throw new Error('Expected distributed');
    const tasks = analyzeDistributed(doc).tasks.filter((t) => t.stage === '1');
    for (const task of tasks) {
      expect(task.root.children[0].properties?.file_groups).toBe(task.root.children[1].properties?.file_groups);
      expect(task.root.children[0].properties?.file_groups).toContain(task.task === 0 ? 'first' : 'last');
    }
    expect(() => new ConverterService().convert(text.replace('t1:', 't0:'))).toThrow('Invalid leaf variants');
  });
  test('two boundaries from the same producer bind to their own network operators', () => {
    const head = 'HashJoinExec: mode=Partitioned, join_type=Inner, on=[(region@0, region@0)]\n' +
      '  [Stage 1] => NetworkCoalesceExec: output_partitions=4, input_tasks=2\n' +
      '  BufferExec: capacity=_\n    [Stage 1] => NetworkCoalesceExec: output_partitions=4, input_tasks=2';
    const scene = new ConverterService().convert(boxed(head, source(2), 2));
    const targets = new Map<string, Set<string>>();
    for (const arrow of scene.elements) {
      if (arrow.type !== 'arrow' || arrow.customData?.role !== 'network-bundle') continue;
      const target = scene.elements.find((e) => e.id === arrow.endBinding?.elementId)!;
      const boundary = String(arrow.customData.boundary);
      expect(target.customData?.boundary).toBe(boundary);
      expect(target.customData?.operator).toBe('NetworkCoalesceExec');
      if (!targets.has(boundary)) targets.set(boundary, new Set());
      targets.get(boundary)!.add(target.id);
    }
    expect(targets.size).toBe(2);
    expect([...targets.values()].map((s) => s.size)).toEqual([1, 1]);
    expect(new Set([...targets.values()].flatMap((s) => [...s])).size).toBe(2);
  });
  test('multiple UNION children and unequal assignments retain padded capacity', () => {
    const tree = 'DistributedUnionExec: t0:[c0, c2] t1:[c1]\n  ' + source(3) + '\n  ' + source(3) + '\n  ' + source(3);
    const text = boxed('[Stage 1] => NetworkCoalesceExec: output_partitions=12, input_tasks=2', tree, 2);
    const doc = parser.parse(text);
    if (doc.kind === 'single') throw new Error('Expected distributed');
    const tasks = analyzeDistributed(doc).tasks.filter((t) => t.stage === '1');
    expect(tasks.map((t) => t.counts.get(t.root))).toEqual([
      { value: 6, assigned: 6, evidence: 'UNION task capacity' },
      { value: 6, assigned: 3, evidence: 'UNION task capacity' },
    ]);
    expect(validateScene(new ConverterService().convert(text))).toEqual([]);
    expect(() => new ConverterService().convert(text.replace('c2]', 'c8]'))).toThrow('Missing UNION child');
  });
  test('nested UNION uses its parent child context', () => {
    const tree = 'DistributedUnionExec: t0:[c0] t1:[c1]\n' +
      '  DistributedUnionExec: t0:[c0, c1]\n    ' + source(2) + '\n    ' + source(2) + '\n  ' + source(4);
    const doc = parser.parse(boxed('[Stage 1] => NetworkCoalesceExec: output_partitions=8, input_tasks=2', tree, 2));
    if (doc.kind === 'single') throw new Error('Expected distributed');
    expect(analyzeDistributed(doc).tasks.filter((t) => t.stage === '1').map((t) => t.counts.get(t.root)?.value)).toEqual([4, 4]);
  });
  test('trailing result tables do not become operators', () => {
    const text = fixture('gather_four_tasks') + '+-----+\n| sum |\n+-----+\n|  8  |\n+-----+';
    expect(new ConverterService().convert(text)).toEqual(new ConverterService().convert(fixture('gather_four_tasks')));
  });
  test('custom task ranges are preserved rather than parsed as decorators', () => {
    const text = boxed('[Stage 1] => NetworkCoalesceExec: output_partitions=2, input_tasks=2',
      'RangeSourceExec: t0:[0-6), t1:[6-11)', 2);
    const doc = parser.parse(text);
    if (doc.kind === 'single') throw new Error('Expected distributed');
    expect(doc.stages[1].root.operator).toBe('RangeSourceExec');
    expect(doc.stages[1].root.raw).toContain('t0:[0-6)');
  });
  test('unknown routing draws no speculative task-pair arrows', () => {
    const text = fixture('gather_four_tasks').replace('NetworkCoalesceExec', 'NetworkMysteryExec');
    const result = new ConverterService().convertDetailed(text);
    expect(result.diagnostics.some((d) => d.code === 'unknown-routing')).toBe(true);
    expect(result.scene.elements.filter((e) => e.customData?.role === 'network-bundle')).toHaveLength(0);
  });
});

test('EXPLAIN tables preserve literal pipes and stop at the next named row', () => {
  const plan = fixture('gather_four_tasks').trimEnd().replace('MeadowScanExec:', 'MeadowScanExec: predicate=label = \'plan_type|west\',');
  const table = plan.split('\n').map((line, i) => '| ' + (i ? '             ' : 'physical_plan') + ' | ' + line + ' |').join('\n') +
    '\n| Output Rows | 8 |';
  const doc = parser.parse(table);
  if (doc.kind === 'single') throw new Error('Expected distributed');
  expect(doc.stages[1].root.properties?.predicate).toBe('label = \'plan_type|west\'');
  expect(new ConverterService().convert(table).elements.length).toBeGreaterThan(0);
});


describe('representative complex distributed fixtures', () => {
  const nodes = (root: PlanNode): PlanNode[] => [root, ...root.children.flatMap(nodes)];
  const analyze = (name: string): ReturnType<typeof analyzeDistributed> => {
    const document = parser.parse(fixture(name));
    if (document.kind === 'single') throw new Error('Expected distributed document');
    return analyzeDistributed(document);
  };

  test('five UNION branches retain unequal assignments, padding and runtime metrics', () => {
    const result = analyze('union_five_branches_metrics');
    const tasks = result.tasks.filter((task) => task.stage === '1');
    expect(tasks.map((task) => task.root.children.length)).toEqual([2, 2, 1]);
    expect(tasks.map((task) => task.counts.get(task.root)?.value)).toEqual([6, 6, 6]);
    expect(tasks.map((task) => task.counts.get(task.root)?.assigned)).toEqual([6, 6, 3]);
    expect(tasks.map((task) => task.root.properties?.active)).toEqual([
      'c0 (0/1), c3 (0/1)', 'c1 (0/1), c4 (0/1)', 'c2 (0/1)',
    ]);
    expect(tasks.every((task) => task.root.properties?.metrics?.includes('output_rows=924'))).toBe(true);
    expect(result.connections[0].pairs.map((pair) => pair.streams)).toEqual([6, 6, 6]);
  });

  test('full outer join keeps independent shuffle boundaries on both inputs', () => {
    const result = analyze('full_outer_join_two_shuffles');
    const shuffles = result.connections.filter((edge) => edge.operator === 'NetworkShuffleExec');
    expect(shuffles.map((edge) => edge.producer)).toEqual(['1', '2']);
    expect(new Set(shuffles.map((edge) => edge.boundary)).size).toBe(2);
    for (const edge of shuffles) {
      expect(edge.consumer).toBe('3');
      expect(edge.pairs).toHaveLength(16);
      expect(new Set(edge.pairs.map((pair) => pair.from + '/' + pair.to)).size).toBe(16);
      expect(edge.pairs.every((pair) => pair.streams === 3)).toBe(true);
    }
    const joins = result.tasks.filter((task) => task.stage === '3');
    expect(joins).toHaveLength(4);
    expect(joins.every((task) => task.root.properties?.join_type === 'Full')).toBe(true);
    expect(joins.map((task) => task.counts.get(task.root)?.value)).toEqual([3, 3, 3, 3]);
  });

  test('range-partitioned scans retain task-specific dynamic filters', () => {
    const result = analyze('dynamic_filter_range_join');
    const tasks = result.tasks.filter((task) => task.stage === '1');
    expect(taskGroups(tasks).map((group) => group.length)).toEqual([1, 1]);
    tasks.forEach((task, index) => {
      const scans = nodes(task.root).filter((node) => node.operator === 'DataSourceExec');
      expect(scans).toHaveLength(2);
      expect(scans.every((node) => node.properties?.output_partitioning?.startsWith('Range('))).toBe(true);
      expect(scans.map((node) => task.counts.get(node)?.value)).toEqual([2, 2]);
      const filtered = scans.find((node) => node.properties?.predicate?.includes('DynamicFilter'))!;
      expect(filtered.properties?.predicate).toContain('event_key@2 >= ' + (index === 0 ? 'A' : 'B'));
      expect(filtered.properties?.dynamic_rg_pruning).toBe('eligible');
    });
  });

  test('time-range UNION preserves local empty groups and routes shuffle only to assigned children', () => {
    const result = analyze('count_distinct_union_time_ranges');
    const shuffle = result.connections.find((edge) => edge.operator === 'NetworkShuffleExec')!;
    expect([...new Set(shuffle.pairs.map((pair) => pair.to))]).toEqual([1, 2]);
    const local = result.tasks.find((task) => task.stage === '2' && task.task === 0)!;
    const scans = nodes(local.root).filter((node) => node.operator === 'ConcurrentFileScanExec');
    expect(scans).toHaveLength(2);
    expect(scans.map((node) => node.properties?.file_type)).toEqual(['metadata', 'measurements']);
    for (const scan of scans) {
      const groups = new PropertyParser().parseFileGroups(scan.properties);
      expect(groups).toHaveLength(4);
      expect(groups.slice(2)).toEqual([[], []]);
      expect(local.counts.get(scan)?.value).toBe(4);
    }
    const join = nodes(local.root).find((node) => node.operator === 'HashJoinExec')!;
    expect(join.wrappers?.map((wrapper) => wrapper.operator)).toEqual(['ResourceGuardExec']);
    const scene = new ConverterService().convert(fixture('count_distinct_union_time_ranges'));
    expect(scene.elements.filter((element) => element.customData?.role === 'empty-file-group')).toHaveLength(4);
    expect(scene.elements.filter((element) => element.customData?.role === 'union-selection')
      .every((element) => element.backgroundColor === 'transparent')).toBe(true);
  });
});
