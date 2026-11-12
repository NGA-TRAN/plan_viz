import { webcrypto } from 'node:crypto';
import { analyzePlan } from '../../../services/plan-view.service';
import { OPERATOR_PROFILE } from '../../metrics/catalog';

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
});
const options = { structure: 'explain' as const, interpretation: { operatorProfile: OPERATOR_PROFILE } };
test('scalar COUNT distinguishes compact state, mergeability and completion', async () => {
  const result = await analyzePlan('AggregateExec: mode=Single, gby=[], aggr=[count(Int64(1))]\n  EmptyExec', options);
  const count = result.structure.findings.filter((f) => f.ruleId === 'P2');
  expect(count.map((f) => f.property)).toEqual(['waiting', 'retained-state', 'decomposition']);
  expect(count.find((f) => f.property === 'waiting')?.explanation).toContain('completion');
  expect(count.every((f) => f.assessment === 'conditional')).toBe(true);
});
test('missing contracts and custom approximate algorithms are unknown', async () => {
  const result = await analyzePlan('ApproxTopExec: k=10\n  EmptyExec', options);
  expect(result.structure.findings.every((f) => f.assessment === 'unknown')).toBe(true);
  const noProfile = await analyzePlan('AggregateExec: mode=Single, gby=[], aggr=[count(Int64(1))]', { structure: 'explain' });
  expect(noProfile.structure.findings.every((f) => f.assessment === 'unknown')).toBe(true);
});
test('ordinary projection adds no own full-input barrier but preserves inherited dependencies', async () => {
  const result = await analyzePlan('ProjectionExec: expr=[n@0 as n]\n  AggregateExec: mode=Single, gby=[], aggr=[count(Int64(1))]', options);
  expect(result.structure.findings.find((f) => f.ruleId === 'P1')?.explanation).toContain('inherited');
});
test('hash join identifies left input and never certifies storage locality', async () => {
  const result = await analyzePlan('HashJoinExec: mode=Partitioned, join_type=Inner, on=[(a@0, b@0)]\n  EmptyExec\n  EmptyExec', options);
  const join = result.structure.findings.find((f) => f.ruleId === 'P5' && f.property === 'waiting');
  expect(join?.dependencies[0].inputIndex).toBe(0);
  expect(result.structure.findings.find((f) => f.ruleId === 'P5' && f.property === 'layout')?.assessment).toBe('unknown');
});
test('TopK is a row candidate bound, not a frequency counting or memory bound', async () => {
  const result = await analyzePlan('SortExec: fetch=10, expr=[n@0 DESC NULLS LAST]\n  AggregateExec: mode=Single, gby=[key@0 as key], aggr=[count(Int64(1)) as n]\n    EmptyExec', options);
  expect(result.structure.findings.find((f) => f.ruleId === 'P4' && f.property === 'retained-state')?.explanation).toContain('frequency');
});
test('buffer capacity is per partition with the oversized-batch exception', async () => {
  const result = await analyzePlan('BufferExec: capacity=8192\n  EmptyExec', options);
  expect(result.structure.findings.find((f) => f.ruleId === 'P7')?.explanation).toMatch(/per partition.*oversized/);
});
test.each(['DESC NULLS LAST', 'ASC NULLS FIRST'])('sort does not match different direction/null placement: %s', async (ordering) => {
  const result = await analyzePlan('SortExec: expr=[x@0 ASC NULLS LAST]\n  DataSourceExec: output_ordering=[x@0 ' + ordering + ']', options);
  expect(result.structure.findings.find((f) => f.ruleId === 'P4')?.missingEvidence.length).toBeGreaterThan(0);
});
test('direct column projection remaps order but a custom wrapper stops proof', async () => {
  const plan = 'SortExec: fetch=3, expr=[renamed@0 ASC NULLS LAST]\n  ProjectionExec: expr=[x@0 as renamed]\n    DataSourceExec: output_ordering=[x@0 ASC NULLS LAST]';
  const known = await analyzePlan(plan, options);
  expect(known.structure.findings.find((f) => f.ruleId === 'P4')?.missingEvidence).toEqual([]);
  const opaque = await analyzePlan(plan.replace('ProjectionExec: expr=[x@0 as renamed]', 'CustomExec: expr=[x@0 as renamed]'), options);
  expect(opaque.structure.findings.find((f) => f.ruleId === 'P4')?.missingEvidence.length).toBeGreaterThan(0);
});
test('network exchanges retain a qualified layout explanation', async () => {
  const result = await analyzePlan('[Stage 1] => NetworkCoalesceExec: output_partitions=2, input_tasks=2', options);
  expect(result.structure.findings.find((f) => f.ruleId === 'P6')?.explanation).toContain('upstream');
});
