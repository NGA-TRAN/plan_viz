import * as fs from 'fs';
import * as path from 'path';
import { ConverterService } from '../src/services/converter.service';
import { ExecutionPlanParser } from '../src/parsers/execution-plan.parser';
import { analyzeDistributed } from '../src/analysis/distributed-analysis';
import { partitionCounts } from '../src/analysis/partition-analysis';
import { PlanNode } from '../src/types/plan-document.types';
import { assertTextBindings } from '../src/generators/__tests__/utils/text-binding-assertions';

const directory = path.join(__dirname, 'upstream/2026-11-08');
const fixture = (name: string): string => fs.readFileSync(path.join(directory, name + '.sql'), 'utf8');
const nodes = (root: PlanNode, operator: string): PlanNode[] => [
  ...(root.operator === operator ? [root] : []), ...root.children.flatMap(child => nodes(child, operator)),
];
const distributed = (name: string): ReturnType<typeof analyzeDistributed> => {
  const result = new ConverterService().convertDetailed(fixture(name));
  expect(result.document.kind).toBe('distributed');
  if (result.document.kind === 'single') throw new Error('Expected a distributed plan');
  expect(result.diagnostics).toEqual([]);
  assertTextBindings(result.scene.elements);
  return analyzeDistributed(result.document);
};

describe('2026-11-08 source-derived compatibility regressions', () => {
  test.each(['5', '0'])('TopK fetch=%s details fit above the incoming arrow with their full rendered height', fetch => {
    const scene = new ConverterService().convert(fixture('replacement-topk').replace('fetch=5', 'fetch=' + fetch));
    const title = scene.elements.find(element => element.type === 'text' && element.text === 'SortExec');
    if (!title || title.type !== 'text') throw new Error('Missing sort title');
    const box = scene.elements.find(element => element.id === title.containerId)!;
    const detail = scene.elements.find(element => element.type === 'text' && element.text.includes('TopK('));
    if (!detail || detail.type !== 'text') throw new Error('Missing TopK details');
    const renderedHeight = detail.text.split('\n').length * detail.fontSize * detail.lineHeight;
    expect(detail.height).toBeGreaterThanOrEqual(renderedHeight);
    expect(detail.y).toBeGreaterThanOrEqual(title.y + title.height);
    expect(detail.y + renderedHeight).toBeLessThanOrEqual(box.y + box.height - 5);
    const incoming = scene.elements.find(element => element.type === 'arrow' && element.endBinding?.elementId === box.id);
    if (!incoming || incoming.type !== 'arrow') throw new Error('Missing incoming arrow');
    const end = incoming.points[incoming.points.length - 1];
    expect(incoming.y + end[1]).toBeCloseTo(box.y + box.height);
    assertTextBindings(scene.elements);
  });

  test('distributed TopK preserves its already fitted scene', () => {
    const input = '┌───── DistributedExec\n' + fixture('replacement-topk').trimEnd().split('\n').map(line => '│ ' + line).join('\n') + '\n└──────────────────';
    const before = JSON.parse(fs.readFileSync(path.join(directory, 'expected/derived/distributed-topk.excalidraw'), 'utf8'));
    expect(JSON.parse(JSON.stringify(new ConverterService().convert(input)))).toEqual(before);
  });

  test.each(['coalesce-fetch', 'ordered-merge-fetch', 'replacement-topk'])('%s retains its selection label and partition capacity', name => {
    const result = new ConverterService().convertDetailed(fixture(name));
    if (result.document.kind !== 'single') throw new Error('Expected a single plan');
    const counts = partitionCounts(result.document.root);
    expect(counts.get(result.document.root)?.value).toBe(1);
    let source = result.document.root;
    while (source.children.length) source = source.children[0];
    expect(source.operator).toBe('DataSourceExec');
    expect(counts.get(source)?.value).toBe(2);
    expect(result.scene.elements.some(element => element.type === 'text' && element.text.includes('fetch=5'))).toBe(true);
    expect(result.diagnostics).toEqual([]);
    assertTextBindings(result.scene.elements);
  });

  test.each([
    ['sorted-direct', 'shuffle-direct', 2],
    ['sorted-two-phase', 'shuffle-two-phase', 1],
  ] as const)('%s retains ordering metadata and exact shuffle pairs', (name, routing, streams) => {
    const result = distributed(name);
    const edge = result.connections.find(connection => connection.producer === '1');
    expect(edge?.routing).toBe(routing);
    expect(edge?.pairs).toEqual([
      { from: 0, to: 0, streams }, { from: 1, to: 0, streams },
      { from: 0, to: 1, streams }, { from: 1, to: 1, streams },
    ]);
    for (const task of result.tasks.filter(task => task.stage === '1')) {
      const source = nodes(task.root, 'DataSourceExec')[0];
      expect(task.counts.get(source)?.value).toBe(2);
      expect(source.properties?.output_ordering).toBe('[value@0 ASC NULLS LAST]');
      expect(task.root.properties).toMatchObject({ preserve_order: 'true', sort_exprs: 'value@0 ASC NULLS LAST' });
    }
    for (const task of result.tasks.filter(task => task.stage === '2')) {
      expect(nodes(task.root, 'NetworkShuffleExec')[0].properties?.sort_exprs).toBe('[value@0 ASC NULLS LAST]');
      expect(nodes(task.root, 'AggregateExec')[0].properties?.ordering_mode).toBe('Sorted');
    }
  });

  test.each(['unordered-ranges', 'uneven-file-groups'])('%s retains task-local sorts without inventing source ordering', name => {
    const tasks = distributed(name).tasks.filter(task => task.stage === '1');
    expect(tasks).toHaveLength(2);
    for (const task of tasks) {
      const source = nodes(task.root, 'DataSourceExec')[0];
      expect(task.root.operator).toBe('SortExec');
      expect(task.root.properties?.preserve_partitioning).toBe('[true]');
      expect(source.properties?.output_ordering).toBeUndefined();
      expect(task.counts.get(source)?.value).toBe(2);
      expect(task.counts.get(task.root)?.value).toBe(2);
    }
    if (name === 'uneven-file-groups') {
      expect(tasks.map(task => nodes(task.root, 'DataSourceExec')[0].properties?.file_groups?.match(/\.csv/g)?.length))
        .toEqual([3, 2]);
    }
  });

  test('empty task input still has one partition slot and participates in the gather', () => {
    const result = distributed('empty-task');
    const tasks = result.tasks.filter(task => task.stage === '1');
    expect(tasks).toHaveLength(2);
    expect(nodes(tasks[1].root, 'DataSourceExec')[0].properties?.file_groups).toBe('{1 group: [[]]}');
    expect(tasks.map(task => task.counts.get(nodes(task.root, 'DataSourceExec')[0])?.value)).toEqual([1, 1]);
    expect(result.connections[0].pairs).toEqual([
      { from: 0, to: 0, streams: 2 }, { from: 1, to: 0, streams: 2 },
    ]);
  });

  test('Iceberg planned files stay task-specific and distinct from inferred partition capacity', () => {
    const tasks = distributed('iceberg-assigned-files').tasks.filter(task => task.stage === '1');
    expect(tasks).toHaveLength(3);
    expect(tasks.map(task => nodes(task.root, 'DataSourceExec')[0].properties?.planned_files)).toEqual(['3', '2', '2']);
    for (const task of tasks) {
      expect(task.counts.get(nodes(task.root, 'DataSourceExec')[0])).toEqual({
        value: 4, evidence: 'consumer input partition contract',
      });
    }
    const source = new ExecutionPlanParser().parse('DataSourceExec: format=iceberg, planned_files=3').root!;
    expect(partitionCounts(source).get(source)?.value).toBeUndefined();
  });
});
