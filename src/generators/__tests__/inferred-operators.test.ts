import * as fs from 'fs';
import * as path from 'path';
import { convertPlanToExcalidraw } from '../../index';
import { ExecutionPlanParser } from '../../parsers/execution-plan.parser';
import { ExcalidrawGenerator } from '../excalidraw.generator';
import { DataSourceNodeGenerator } from '../generators/data-source-node.generator';
import { HashJoinNodeGenerator } from '../generators/hash-join-node.generator';
import { DefaultNodeGenerator } from '../generators/default-node.generator';
import { NodeGeneratorRegistry } from '../generators/node-generator.registry';
import { resolveOperator } from '../generators/operator-resolver';
import { NodeGeneratorStrategy } from '../generators/node-generator.strategy';
import { PropertyParser } from '../utils/property.parser';
import { assertTextBindings } from './utils/text-binding-assertions';
import { textWidth } from '../utils/adaptive-layout';

const parser = new ExecutionPlanParser();
const fixture = (name: string): string => fs.readFileSync(path.join(__dirname, '../../../tests', name + '.sql'), 'utf8');
const source = 'MeadowScanExec: file_groups={2 groups: [[a.dat], [b.dat]]}, projection=[@host, value], output_ordering=[@host@0 ASC]';

describe('structural operators and inline decorators', () => {
  afterEach(() => jest.restoreAllMocks());

  it('preserves two-space indentation, wrapper arguments, inner properties, and child order', () => {
    const root = parser.parse(fixture('inferred_partitioned')).root!;
    expect(root.children[0].level).toBe(1);
    const join = root.children[0].children[0];
    expect(join.level).toBe(2);
    expect(join.operator).toBe('HashJoinExec');
    expect(join.wrappers?.[0]).toEqual({
      operator: 'BudgetGuardExec',
      argumentsText: 'fanout[enforce]>=500x@8000000rows, build[enforce]>=16.0GiB after 15s',
      rawText: 'BudgetGuardExec(fanout[enforce]>=500x@8000000rows, build[enforce]>=16.0GiB after 15s)',
    });
    expect(join.properties?.mode).toBe('Partitioned');
    expect(join.children.map((child) => [child.operator, child.level])).toEqual([['MeadowScanExec', 3], ['BufferExec', 3]]);
    expect(join.children[1].children[0].children[0].children[0].level).toBe(6);
  });

  it('parses nested wrappers and quotes without moving arguments into join properties', () => {
    const root = parser.parse(fixture('inferred_collect_left')).root!;
    expect(root.wrappers?.map((w) => w.operator)).toEqual(['TraceGuardExec', 'BudgetGuardExec']);
    expect(root.wrappers?.[0].argumentsText).toBe('note="limit: high, mode=safe"');
    expect(root.properties).not.toHaveProperty('note');
    expect(root.children).toHaveLength(2);
  });

  it.each([
    'MysteryLeaf: endpoint=https://example.invalid/data:0..1000, note="a, mode=b"',
    'MysteryLeaf: expr=[Utf8("key=value: x"), @host@1]',
    'MysteryLeaf: note=Utf8("GuardExec: HashJoinExec: mode=Partitioned")',
  ])('does not turn property colons into wrappers: %s', (plan) => {
    const root = parser.parse(plan).root!;
    expect(root.operator).toBe('MysteryLeaf');
    expect(root.wrappers).toBeUndefined();
  });

  it.each(['GuardExec: MeadowExec', 'GuardExec: SortMergeJoin', 'GuardExec(limit=5): Mystery'])('recognizes bare inner headers: %s', (input) => {
    expect(parser.parse(input).root?.wrappers?.[0].operator).toBe('GuardExec');
  });

  it('keeps quoted property delimiters and bitwise pipes in plain and EXPLAIN input', () => {
    const line = 'FilterExec: note="a, limit=7", predicate=flags@0 | 2, fetch=5';
    for (const input of [line, '| physical_plan | ' + line + ' |']) {
      expect(parser.parse(input).root?.properties).toEqual({ note: '"a, limit=7"', predicate: 'flags@0 | 2', fetch: '5' });
    }
  });

  it('removes a copied table border without stripping expression pipes', () => {
    const root = parser.parse('ProjectionExec: expr=[flags@0 | 2 as masked]    |\n  MeadowScanExec    |').root!;
    expect(root.properties?.expr).toBe('[flags@0 | 2 as masked]');
    expect(root.children[0].operator).toBe('MeadowScanExec');
  });

  it('keeps @ identifiers and nested aliases intact', () => {
    const p = new PropertyParser();
    expect(p.extractSortOrder('[@host@1 ASC NULLS LAST, @service@2 DESC]')).toEqual(['@host', '@service']);
    expect(p.extractProjectionColumns('[@host@1, value@2]')).toEqual(['@host', 'value']);
    expect(p.extractColumnName('coalesce(Utf8("x as y"), @host@1) as @name')).toBe('@name');
    expect(p.parseCommaSeparated('a, Utf8("x, y"), f([1, 2], \'a\\\'b,c\')')).toHaveLength(3);
  });

  it.each(['inferred_partitioned', 'inferred_collect_left', 'inferred_generic'])('renders %s with fitted, bound labels and separated panels', (name) => {
    const scene = convertPlanToExcalidraw(fixture(name));
    assertTextBindings(scene.elements);
    expect(scene.elements.some((e) => e.type === 'text' && e.text === 'unimplemented')).toBe(false);
    for (const e of scene.elements) {
      expect([e.x, e.y, e.width, e.height].every(Number.isFinite)).toBe(true);
      if (e.type !== 'arrow') {
        expect(e.width).toBeGreaterThan(0);
        expect(e.height).toBeGreaterThan(0);
      }
      if (e.type === 'text') {
        expect(e.originalText).toBe(e.text);
        expect(Math.max(...e.text.split('\n').map((line) => textWidth(line, e.fontSize)))).toBeLessThanOrEqual(e.width + 10);
      }
    }
    const panelIds = new Set(scene.elements.filter((e) => e.type === 'text' && e.containerId).map((e) => e.type === 'text' && e.containerId));
    const panels = scene.elements.filter((e) => e.type === 'rectangle' && panelIds.has(e.id));
    for (let i = 0; i < panels.length; i++) {
      for (let j = i + 1; j < panels.length; j++) {
        const a = panels[i]; const b = panels[j];
        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        expect(overlapX > 1 && overlapY > 1).toBe(false);
      }
    }
  });

  it.each([1, 2, 4, 6, 8, 12, 16, 24, 48])('bounds complete %i-group sources and hash tables without losing stream counts', (count) => {
    const groups = Array.from({ length: count }, (_, i) => '[sample_' + i + '.dat:0..1000]').join(', ');
    const scan = 'MeadowScanExec: file_groups={' + count + ' groups: [' + groups + ']}, projection=[id]';
    const input = 'BudgetGuardExec(limit=10): HashJoinExec: mode=Partitioned, join_type=Inner, on=[(id@0, id@0)]\n  ' +
      scan + '\n  BufferExec: capacity=_\n    ' + scan;
    const sourceSpy = jest.spyOn(DataSourceNodeGenerator.prototype, 'generate');
    const joinSpy = jest.spyOn(HashJoinNodeGenerator.prototype, 'generate');
    const scene = convertPlanToExcalidraw(input);
    expect(sourceSpy.mock.results[0].value.inputArrowCount).toBe(count);
    expect(joinSpy.mock.results[0].value.inputArrowCount).toBe(count);
    const tables = scene.elements.filter((e) => e.type === 'ellipse' && e.strokeColor === '#f08c00');
    expect(tables).toHaveLength(count > 8 ? 4 : count);
    expect(tables.every((e) => e.width > 20)).toBe(true);
    for (const table of tables) {
      expect(scene.elements.filter((e) => e.type === 'arrow' && e.endBinding?.elementId === table.id)).toHaveLength(2);
    }
    if (count > 8) {
      expect(scene.elements.filter((e) => e.type === 'text' && e.text.startsWith('HT ')).map((e) => e.type === 'text' && e.text))
        .toEqual(['HT 1', 'HT 2', 'HT ' + (count - 1), 'HT ' + count]);
    }
  });

  it.each(['DataSourceExec', 'MeadowScanExec'])('keeps %s centered under its unary ancestors despite asymmetric file and column labels', (operator) => {
    const groups = Array.from({ length: 48 }, (_, i) => '[sample_' + i + '.dat]').join(', ');
    const plan = [
      'BufferExec: capacity=_',
      '  AggregateExec: mode=SinglePartitioned, gby=[@host@0], aggr=[]',
      '    ProjectionExec: expr=[@host@0 as @host, value@1 as value]',
      '      ' + operator + ': file_groups={48 groups: [' + groups + ']}, projection=[@host, value], ' +
        'output_partitioning=RoundRobinBatch(48), max_parallel_files_per_partition=10',
    ].join('\n');
    const scene = convertPlanToExcalidraw(plan);
    const centers = ['BufferExec', 'AggregateExec', 'ProjectionExec', operator].map((label) => {
      const title = scene.elements.find((e) => e.type === 'text' && e.text === label);
      if (!title || title.type !== 'text') throw new Error('Missing title: ' + label);
      const box = scene.elements.find((e) => e.id === title.containerId)!;
      return box.x + box.width / 2;
    });
    for (const center of centers) expect(center).toBeCloseTo(centers[0], 6);
  });

  it('uses explicit output partitioning rather than group count or file concurrency', () => {
    const spy = jest.spyOn(DataSourceNodeGenerator.prototype, 'generate');
    convertPlanToExcalidraw(source + ', output_partitioning=Hash([Column { name: "@host", index: 0 }], 12), max_parallel_files_per_partition=10');
    expect(spy.mock.results[0].value).toMatchObject({
      inputArrowCount: 12, outputColumns: ['@host', 'value'], outputSortOrder: ['@host'],
    });
  });

  it('does not claim unknown unary operators preserve columns, ordering, or streams', () => {
    const spy = jest.spyOn(DefaultNodeGenerator.prototype, 'generate');
    convertPlanToExcalidraw('MysteryUnary: capacity=_\n  ' + source);
    expect(spy.mock.results[0].value).toMatchObject({ outputColumns: [], outputSortOrder: [], streamCountKnown: false });
  });

  it('keeps exact custom registrations ahead of structural inference and wrapper adaptation', () => {
    const custom = new DefaultNodeGenerator();
    const spy = jest.spyOn(custom, 'generate');
    const generator = new ExcalidrawGenerator({ customGenerators: [{ operator: 'MeadowScanExec', generator: custom }] });
    generator.generate(parser.parse(source).root);
    expect(spy).toHaveBeenCalledTimes(1);
    const outer = new ExcalidrawGenerator({ customGenerators: [{ operator: 'BudgetGuardExec', generator: custom }] });
    outer.generate(parser.parse('BudgetGuardExec(limit=5): ' + source).root);
    expect(spy.mock.calls[1][0].operator).toBe('BudgetGuardExec');
  });

  it.each([
    ['MeadowScanExec: file_groups={1 group: [[a.dat]]}', 'DataSourceExec'],
    ['FoldExec: mode=SinglePartitioned, gby=[id@0], aggr=[count(*)]\n  EmptyExec', 'AggregateExec'],
    ['ScatterExec: partitioning=Hash([id@0], 4)\n  EmptyExec', 'RepartitionExec'],
    ['PairExec: mode=CollectLeft, join_type=Inner, on=[(id@0, id@0)]\n  EmptyExec\n  EmptyExec', 'HashJoinExec'],
    ['AmbiguousExec: mode=Single, gby=[], aggr=[], partitioning=RoundRobinBatch(4)\n  EmptyExec', 'default'],
    ['NotASource: file_groups={1 group: [[a]]}\n  EmptyExec', 'default'],
    ['NotAHashJoin: join_type=Inner, on=[(id@0, id@0)]\n  EmptyExec\n  EmptyExec', 'default'],
    ['NotAProjection: expr=[a, b]\n  EmptyExec', 'default'],
    ['NotASource: file_groups=garbage', 'default'],
    ['NotASource: file_groups={2 groups: [a, b]}', 'default'],
    ['NotARepartition: partitioning=RoundRobinBatch(0)\n  EmptyExec', 'default'],
    ['NotASource: file_groups={2 groups: [[a], [b]}', 'default'],
    ['NotARepartition: partitioning=Hash([id], two)\n  EmptyExec', 'default'],
  ])('resolves from evidence: %s', (plan, family) => {
    const registry = new NodeGeneratorRegistry();
    const dummy: NodeGeneratorStrategy = { generate: jest.fn() };
    for (const name of ['default', 'DataSourceExec', 'AggregateExec', 'RepartitionExec', 'HashJoinExec']) registry.register(name, dummy);
    expect(resolveOperator(parser.parse(plan).root!, registry).family).toBe(family);
  });

  it.each(['DistributedExec: x=1', '[Stage 1]', 'NetworkShuffleExec: stage=1', 'GuardExec: NetworkShuffleExec: stage=1'])('rejects distributed input %s', (line) => {
    expect(() => parser.parse('ProjectionExec: expr=[id]\n  ' + line)).toThrow('Distributed plans are not supported');
  });
});
