import { webcrypto } from 'node:crypto';
import { analyzePlan, inspectPlan } from '../../../services/plan-view.service';
import { EXPORT_PROFILE, METRIC_PROFILE } from '../catalog';

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
});
const heatmap = { metrics: { display: 'heatmap' as const, metric: 'elapsed_compute' } };
test('missing metrics are a valid plan with no ranking or numeric legend', async () => {
  const result = await analyzePlan('ProjectionExec: expr=[x@0 as x]\n  EmptyExec', heatmap);
  expect(result.metrics.status).toBe('not-reported');
  expect(result.metrics.cohorts).toEqual([]);
  expect(result.metrics.notReportedSourceIds).toHaveLength(2);
});
test('ranks reported timers, distinguishing a measured zero from missing', async () => {
  const result = await analyzePlan('ProjectionExec: expr=[x@0 as x], metrics=[elapsed_compute=0ns]\n  EmptyExec, metrics=[elapsed_compute=2ms]', heatmap);
  expect(result.metrics.status).toBe('ready');
  expect(result.metrics.cohorts[0].ranking.map((r) => r.value.decimal)).toEqual(['2000000', '0']);
  expect(result.metrics.cohorts[0].ranking.map((r) => r.color)).toEqual(['#ffc078', '#ffffff']);
  expect(result.metrics.cohorts[0].legend.stops[0].color).toBe('#ffffff');
});
test('zero-only observations still have a defined legend and missing is not zero', async () => {
  const result = await analyzePlan('EmptyExec, metrics=[elapsed_compute=0ns]', heatmap);
  expect(result.metrics.cohorts[0].legend.allZero).toBe(true);
  expect(result.metrics.cohorts[0].ranking[0].color).toBe('#ffffff');
  expect(result.metrics.cohorts[0].legend.stops.every((s) => s.color === '#ffffff')).toBe(true);
});
test('orange uses white only for exact zero rows, including when positive ratios round to zero', async () => {
  const result = await analyzePlan('UnionExec\n  EmptyExec, metrics=[output_rows=0]\n  EmptyExec, metrics=[output_rows=1]\n  EmptyExec, metrics=[output_rows=4503599627370496]\n  EmptyExec, metrics=[output_rows=9007199254740992]', {
    interpretation: { metricProfile: METRIC_PROFILE }, metrics: { display: 'heatmap', metric: 'output_rows', palette: 'orange' },
  });
  const { ranking, legend } = result.metrics.cohorts[0];
  expect(ranking.map((r) => [r.value.decimal, r.color])).toEqual([
    ['9007199254740992', '#ffc078'], ['4503599627370496', '#ffdcb3'],
    ['1', '#fff8ed'], ['0', '#ffffff'],
  ]);
  expect(ranking[2].intensity).toBe(0);
  expect(legend.stops[0].color).toBe('#ffffff');
  expect(legend.stops[2].color).toBe(ranking[1].color);
});
test.each([
  ['blue', '#edf6ff'], ['purple', '#f7f0ff'],
] as const)('%s keeps its existing zero fill', async (palette, color) => {
  const result = await analyzePlan('EmptyExec, metrics=[elapsed_compute=0ns]', {
    metrics: { display: 'heatmap', metric: 'elapsed_compute', palette },
  });
  expect(result.metrics.cohorts[0].ranking[0].color).toBe(color);
  expect(result.metrics.cohorts[0].legend.stops.every((s) => s.color === color)).toBe(true);
});
test('preserves duplicates and never ranks contradictory values', async () => {
  const result = await analyzePlan('EmptyExec, metrics=[elapsed_compute=1ms, elapsed_compute=2ms]', heatmap);
  expect(result.inspection.observations).toHaveLength(2);
  expect(result.inspection.observations.every((o) => o.status === 'conflicting')).toBe(true);
  expect(result.metrics.status).toBe('incomparable');
});
test('unknown values stay raw and selected absent fields differ from misspelled names', async () => {
  const result = await analyzePlan('EmptyExec, metrics=[custom_time=2ms]', { metrics: { display: 'heatmap', metric: 'custom_time' } });
  expect(result.metrics.status).toBe('incomparable');
  await expect(analyzePlan('EmptyExec', { metrics: { display: 'labels', metric: 'typo' } })).rejects.toMatchObject({ code: 'UNKNOWN_METRIC' });
  await expect(analyzePlan('EmptyExec', { metrics: { display: 'labels', metric: 'query_cpu_time' } })).rejects.toMatchObject({ code: 'METRIC_SCOPE_MISMATCH' });
});
test('counts need a profile, and an assumed profile remains visibly declared', async () => {
  const text = 'EmptyExec, metrics=[output_rows=9007199254740993]';
  expect((await analyzePlan(text, { metrics: { display: 'heatmap', metric: 'output_rows' } })).metrics.status).toBe('incomparable');
  const result = await analyzePlan(text, { interpretation: { metricProfile: METRIC_PROFILE }, metrics: { display: 'heatmap', metric: 'output_rows' } });
  expect(result.metrics.cohorts[0].ranking[0].value.decimal).toBe('9007199254740993');
  expect(result.inspection.observations[0].interpretation).toBe('assumed-profile');
  expect(() => JSON.stringify(result)).not.toThrow();
});
test('selection preserves alternatives without combining their metrics', async () => {
  const text = '| plan_type | plan |\n| logical_plan | Unsupported |\n| Plan with Metrics | EmptyExec, metrics=[elapsed_compute=2ms] |\n| Plan with Full Metrics | EmptyExec, metrics=[elapsed_compute=3ms] |';
  expect((await inspectPlan(text)).selection?.variantId).toBe('v2');
  const selected = await inspectPlan(text, { input: { variant: 'v3' } });
  expect(selected.observations.map((o) => o.raw)).toEqual(['3ms']);
  await expect(inspectPlan(text, { input: { variant: 'v1' } })).rejects.toMatchObject({ code: 'UNSUPPORTED_VARIANT' });
  expect((await inspectPlan('## A\nEmptyExec\n## B\nEmptyExec')).status).toBe('selection-required');
});
test('retains Duration as separate query evidence and does not invent scope for custom query-like names', async () => {
  const result = await inspectPlan('| plan_type | plan |\n| physical_plan | EmptyExec, metrics=[query_custom=2] |\n| Duration | 4ms |');
  expect(result.observations.find((o) => o.metric === 'Duration')?.owner.kind).toBe('query');
  expect(result.observations.find((o) => o.metric === 'query_custom')?.owner.kind).toBe('operator');
});
test('query CPU task maps remain separate raw query details', async () => {
  const result = await analyzePlan('QueryMetricsExec, metrics=[query_cpu_time={0:2ms, 1:3ms}]', {
    ...heatmap, interpretation: { metricProfile: METRIC_PROFILE, exportProfile: EXPORT_PROFILE },
  });
  expect(result.inspection.observations[0].owner.kind).toBe('query');
  expect(result.inspection.observations[0]).toMatchObject({ raw: '{0:2ms, 1:3ms}', status: 'raw-only', value: null });
  expect(result.metrics.queryObservationIds).toHaveLength(1);
});
test.each(['QueryMetricsExec', 'CustomWrapperExec'])('query metrics use the declared metric contract rather than the %s wrapper name', async (operator) => {
  const text = operator + ', metrics=[query_cpu_time=2ms, query_cpu_sample_count=10, query_cpu_custom=7]';
  const unknownProfile = await inspectPlan(text);
  expect(unknownProfile.observations.every((o) => o.value === null)).toBe(true);
  const assumed = await inspectPlan(text, { interpretation: { metricProfile: METRIC_PROFILE } });
  expect(assumed.observations[0]).toMatchObject({ owner: { kind: 'query' }, value: { decimal: '2000000', unit: 'ns' }, interpretation: 'assumed-profile' });
  expect(assumed.observations[1]).toMatchObject({ owner: { kind: 'query' }, value: { decimal: '10', unit: 'count' }, interpretation: 'assumed-profile' });
  expect(assumed.observations[2]).toMatchObject({ owner: { kind: 'operator' }, value: null, interpretation: 'unknown' });
  await expect(analyzePlan(text, { interpretation: { metricProfile: METRIC_PROFILE }, metrics: { display: 'heatmap', metric: 'query_cpu_time' } }))
    .rejects.toMatchObject({ code: 'METRIC_SCOPE_MISMATCH' });
});
test('distributed task maps retain the hidden maximum and scalars are not cloned observations', async () => {
  const text = '┌───── DistributedExec\n│ EmptyExec\n└─────\n┌───── Stage 1 ── tasks=3, partitions=1\n│ EmptyExec, metrics=[elapsed_compute={0:10ms, 1:500ms, 2:20ms}, output_rows=42]\n└─────';
  const result = await analyzePlan(text, { ...heatmap, interpretation: { exportProfile: EXPORT_PROFILE, metricProfile: METRIC_PROFILE } });
  expect(result.metrics.cohorts[0].ranking.map((r) => r.value.decimal)).toEqual(['500000000', '20000000', '10000000']);
  expect(result.inspection.observations.filter((o) => o.metric === 'output_rows')).toHaveLength(1);
  expect(result.inspection.observations.find((o) => o.metric === 'output_rows')?.owner.kind).toBe('operator');
});
test.each([
  ['output_rows', 'EmptyExec', '2.5 K', '2500'], ['output_batches', 'EmptyExec', '3', '3'],
  ['output_bytes', 'EmptyExec', '2 KB', '2048'], ['spill_count', 'EmptyExec', '0', '0'],
  ['spilled_rows', 'EmptyExec', '4', '4'], ['spilled_bytes', 'EmptyExec', '1.5 MB', '1572864'],
  ['build_mem_used', 'HashJoinExec: mode=CollectLeft, join_type=Inner', '2 KB', '2048'],
  ['peak_mem_used', 'AggregateExec: mode=Single, gby=[x@0 as x], aggr=[count(Int64(1))]', '2 KB', '2048'],
  ['max_mem_used', 'BufferExec: capacity=8192', '2 KB', '2048'],
])('interprets qualified %s with the audited unit dialect', async (metric, operator, raw, decimal) => {
  const result = await analyzePlan(operator + ', metrics=[' + metric + '=' + raw + ']', {
    interpretation: { metricProfile: METRIC_PROFILE }, metrics: { display: 'heatmap', metric },
  });
  expect(result.metrics.cohorts[0].ranking[0].value.decimal).toBe(decimal);
});
test('memory names on unsupported operators stay raw, and an incomplete run stays partial', async () => {
  const result = await analyzePlan('EmptyExec, metrics=[build_mem_used=2 KB, output_rows=3]', {
    interpretation: { metricProfile: METRIC_PROFILE }, provenance: { note: 'Declared incomplete capture', executionState: 'running' },
    metrics: { display: 'heatmap', metric: 'build_mem_used' },
  });
  expect(result.metrics.status).toBe('incomparable');
  expect(result.inspection.observations.every((o) => o.completeness === 'partial')).toBe(true);
});
test('identical duplicates retain their raw records but count once in rankings', async () => {
  const result = await analyzePlan('EmptyExec, metrics=[elapsed_compute=1ms, elapsed_compute=1000us]', heatmap);
  expect(result.inspection.observations).toHaveLength(2);
  expect(result.metrics.cohorts[0].ranking).toHaveLength(1);
  expect(result.metrics.cohorts[0].ranking[0].observationIds).toHaveLength(2);
});
test.each(['1000ns, elapsed_compute=1us', '1us, elapsed_compute=1000ns'])('equal duplicate values with mixed precision rank once: %s', async (values) => {
  const result = await analyzePlan('EmptyExec, metrics=[elapsed_compute=' + values + ']', heatmap);
  expect(result.inspection.observations).toHaveLength(2);
  expect(result.inspection.observations.map((o) => o.value?.precision).sort()).toEqual(['exact-token', 'rounded-token']);
  const cohort = result.metrics.cohorts[0];
  expect(cohort.ranking).toHaveLength(1);
  expect(cohort.ranking[0].value).toEqual({ decimal: '1000', unit: 'ns', precision: 'rounded-token' });
  expect(cohort.ranking[0].observationIds).toEqual(result.inspection.observations.map((o) => o.id));
  expect(cohort.ranking[0].raw).toEqual(result.inspection.observations.map((o) => o.raw));
  expect(cohort.coverage.observed).toBe(1);
});
test('ranking distinguishes exact adjacent counts above Number precision and keeps ties', async () => {
  const result = await analyzePlan('UnionExec\n  EmptyExec, metrics=[output_rows=9007199254740992]\n  EmptyExec, metrics=[output_rows=9007199254740993]\n  EmptyExec, metrics=[output_rows=9007199254740993]', {
    interpretation: { metricProfile: METRIC_PROFILE }, metrics: { display: 'heatmap', metric: 'output_rows' },
  });
  expect(result.metrics.cohorts[0].ranking.map((r) => [r.value.decimal, r.rank])).toEqual([
    ['9007199254740993', 1], ['9007199254740993', 1], ['9007199254740992', 3],
  ]);
});
