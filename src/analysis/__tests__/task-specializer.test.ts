import * as fs from 'fs';
import * as path from 'path';
import { PlanDocumentParser } from '../../parsers/plan-document.parser';
import { ConverterService } from '../../services/converter.service';
import { analyzeDistributed } from '../distributed-analysis';

const fixture = (name: string): string => fs.readFileSync(
  path.join(__dirname, '../../../tests/distributed', name + '.sql'), 'utf8'
);
const analyze = (text: string): ReturnType<typeof analyzeDistributed> => {
  const document = new PlanDocumentParser().parse(text);
  if (document.kind === 'single') throw new Error('Expected a distributed plan');
  return analyzeDistributed(document);
};

describe('distributed task assignment boundaries', () => {
  test.each([
    ['missing task', 't0:[c0]', 'UNION task map does not match context'],
    ['extra task', 't0:[c0] t1:[] t2:[]', 'UNION task map does not match context'],
    ['out-of-range task', 't0:[c0] t2:[]', 'UNION task map does not match context'],
    ['duplicate child', 't0:[c0, c0] t1:[]', 'Duplicate UNION child'],
    ['duplicate task', 't0:[c0] t0:[]', 'Duplicate UNION task'],
    ['invalid child index', 't0:[c0(2/2)] t1:[]', 'Invalid UNION child context'],
    ['zero child tasks', 't0:[c0(0/0)] t1:[]', 'Invalid UNION child context'],
    ['malformed child', 't0:[child0] t1:[]', 'Invalid UNION assignment'],
  ])('rejects %s with source context', (_name, assignment, message) => {
    const text = fixture('union_empty_assignment').replace('t0:[c0] t1:[]', assignment);
    expect(() => new ConverterService().convert(text)).toThrow(message + ' at line 5');
  });

  test('empty assignment retains padded capacity without activating a child', () => {
    const text = fixture('union_empty_assignment');
    const result = analyze(text);
    const tasks = result.tasks.filter((task) => task.stage === '1');
    expect(result.diagnostics).toEqual([]);
    expect(tasks.map((task) => task.counts.get(task.root))).toEqual([
      { value: 2, assigned: 2, evidence: 'UNION task capacity' },
      { value: 2, assigned: 0, evidence: 'UNION task capacity' },
    ]);
    expect(tasks[1].root.children).toEqual([]);
    expect(tasks[1].root.properties).toMatchObject({ active: 'none', inactive: 'c0' });
    expect(result.connections[0].pairs).toEqual([
      { from: 0, to: 0, streams: 2 }, { from: 1, to: 0, streams: 2 },
    ]);
    const texts = new ConverterService().convert(text).elements
      .filter((element) => element.type === 'text').map((element) => element.text);
    expect(texts).toContain('output partitions = 2\nassigned = 0');
  });

  test('unknown child capacity remains unknown for every task, including an empty task', () => {
    const text = fixture('union_unknown_capacity');
    const result = analyze(text);
    const tasks = result.tasks.filter((task) => task.stage === '1');
    expect(tasks.map((task) => task.root.properties?.capacity)).toEqual(['unknown', 'unknown', 'unknown']);
    expect(tasks.map((task) => task.counts.get(task.root)?.value)).toEqual([undefined, undefined, undefined]);
    expect(tasks.map((task) => task.counts.get(task.root)?.assigned)).toEqual([2, undefined, 0]);
    expect(tasks.map((task) => task.root.children.length)).toEqual([1, 1, 0]);
    expect(tasks[2].root.properties).toMatchObject({ active: 'none', inactive: 'c0, c1' });
    expect(result.connections[0].pairs).toEqual([
      { from: 0, to: 0, streams: undefined },
      { from: 1, to: 0, streams: undefined },
      { from: 2, to: 0, streams: undefined },
    ]);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.node === tasks[0].root.id))
      .toHaveLength(3);
    expect(result.diagnostics.every((diagnostic) => diagnostic.code === 'unknown-count')).toBe(true);
    const texts = new ConverterService().convert(text).elements
      .filter((element) => element.type === 'text').map((element) => element.text);
    expect(texts).toContain('output partitions = unknown\nassigned = 0');
    expect(texts).toContain('output partitions = unknown\nassigned = 2');
    expect(texts.some((text) => text.includes('Streams/bundle: unknown'))).toBe(true);
  });
});
