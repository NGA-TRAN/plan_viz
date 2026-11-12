import { PlanDocumentParser } from '../../parsers/plan-document.parser';
import { analyzeDistributed } from '../../analysis/distributed-analysis';
import { PlanNode } from '../../types/plan-document.types';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { inspectPlan } from '../../services/plan-view.service';

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
});

test('specialization reports original nodes without adding properties or changing task results', () => {
  const document = new PlanDocumentParser().parse(readFileSync(resolve('tests/distributed/gather_four_tasks.sql'), 'utf8'));
  if (document.kind === 'single') throw new Error('Expected distributed fixture');
  const originals = new Set<PlanNode>();
  const visit = (n: PlanNode): void => {
    originals.add(n); n.children.forEach(visit);
  };
  document.stages.forEach((s) => visit(s.root));
  const origins = new Map<PlanNode, PlanNode>();
  const baseline = analyzeDistributed(document);
  const result = analyzeDistributed(document, (clone, source) => origins.set(clone, source));
  expect(result).toEqual(baseline);
  const check = (n: PlanNode): void => {
    expect(originals.has(origins.get(n)!)).toBe(true);
    expect(n.properties ?? {}).not.toHaveProperty('sourceId');
    n.children.forEach(check);
  };
  result.tasks.forEach((t) => check(t.root));
});
test('known stage tasks and effective contexts link to their derivation evidence', async () => {
  const result = await inspectPlan(readFileSync(resolve('tests/distributed/union_distinct_branches.sql'), 'utf8'));
  if (result.status !== 'ready') throw new Error('Expected selection');
  const evidenceIds = new Set(result.evidence.map((e) => e.id));
  for (const instance of result.index.instances) {
    for (const knowledge of [instance.stageTask, instance.effectiveContext]) {
      if (knowledge.state === 'known') {
        expect(knowledge.evidenceIds.length).toBeGreaterThan(0);
        for (const id of knowledge.evidenceIds) expect(evidenceIds.has(id)).toBe(true);
      }
    }
  }
  const contexts = result.index.instances.filter((i) => i.stageTask.state === 'known' && i.effectiveContext.state === 'known' && i.stageTask.value !== i.effectiveContext.value.index);
  expect(contexts.length).toBeGreaterThan(0);
});
test('copied-plan punctuation does not shift source spans or metric ownership', async () => {
  const projection = 'ProjectionExec: expr=[x@0 as x], metrics=[elapsed_compute=1ms]';
  const source = '  EmptyExec, metrics=[elapsed_compute=2ms]';
  const text = ['`', projection, '|', source].join('\n');
  const result = await inspectPlan(text);
  if (result.status !== 'ready') throw new Error('Expected selection');
  expect(result.index.nodes.map((node) => node.spans.map((span) => text.slice(span.start, span.end)).join(''))).toEqual([projection, source]);
  expect(result.observations.map((observation) => {
    const owner = observation.owner;
    if (owner.kind !== 'operator') throw new Error('Expected an operator observation');
    const node = result.index.nodes.find((node) => node.id === owner.sourceId);
    return [node?.operator, observation.raw];
  })).toEqual([['ProjectionExec', '1ms'], ['EmptyExec', '2ms']]);
});
