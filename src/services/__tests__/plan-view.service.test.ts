import { webcrypto } from 'node:crypto';
import { analyzePlan, convertPlanView, inspectPlan, getPlanViewCapabilities, PlanViewOptions, PlanViewError, convertPlanToExcalidraw } from '../../index';
import { LeafNodeGenerator } from '../../generators/generators/leaf-node.generator';
import { METRIC_PROFILE, OPERATOR_PROFILE } from '../../analysis/metrics/catalog';

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
});
test('callers can recognize validation errors with the public error class', async () => {
  await expect(convertPlanView('EmptyExec', { input: { section: 0 } })).rejects.toBeInstanceOf(PlanViewError);
});
test.each([
  [null, 'INVALID_OPTIONS'], [{ input: null }, 'INVALID_OPTIONS'], [{ input: { section: 0 } }, 'INVALID_SECTION'],
  [{ input: { section: 2 } }, 'INVALID_SECTION'], [{ input: { variant: 3 } }, 'INVALID_VARIANT'], [{ input: { variant: 'v99' } }, 'INVALID_VARIANT'],
  [{ metrics: null }, 'INVALID_OPTIONS'], [{ metrics: { display: 'wrong' } }, 'INVALID_OPTIONS'],
  [{ metrics: { display: 'off', metric: 'output_rows' } }, 'INVALID_OPTIONS'],
  [{ metrics: { display: 'off', palette: 'blue' } }, 'INVALID_OPTIONS'],
  [{ metrics: { display: 'labels' } }, 'INVALID_OPTIONS'], [{ metrics: { display: 'labels', metric: '' } }, 'INVALID_OPTIONS'],
  [{ metrics: { display: 'labels', metric: 'output_rows', palette: 'blue' } }, 'INVALID_OPTIONS'],
  [{ metrics: { display: 'heatmap', metric: 'output_rows', palette: 'green' } }, 'INVALID_OPTIONS'],
  [{ metrics: { display: 'labels', metric: 'output_rows', cohort: '' } }, 'INVALID_OPTIONS'],
  [{ metrics: { display: 'labels', metric: 'output_rows', cohort: 'bad' } }, 'INVALID_COHORT'],
  [{ structure: true }, 'INVALID_OPTIONS'], [{ interpretation: { metricProfile: 'unverified-version' } }, 'UNKNOWN_PROFILE'],
  [{ provenance: {} }, 'INVALID_OPTIONS'], [{ provenance: { note: 'Declared', engine: 2 } }, 'INVALID_OPTIONS'],
  [{ provenance: { note: 'Declared', executionState: 'done' } }, 'INVALID_OPTIONS'],
])('validates JavaScript request %j with a stable error code', async (request, code) => {
  // JSON represents untyped JavaScript callers, deliberately outside the TypeScript union.
  const options: PlanViewOptions = JSON.parse(JSON.stringify(request));
  await expect(convertPlanView('EmptyExec', options)).rejects.toMatchObject({ code });
});
test('catalog is detached from caller mutation and reports all approved choices', () => {
  const first = getPlanViewCapabilities();
  expect(first.palettes.map((p) => p.id)).toEqual(['orange', 'blue', 'purple', 'spectrum']);
  expect(first.palettes[0]).toMatchObject({ zero: '#ffffff', low: '#fff8ed', high: '#ffc078' });
  expect(first.palettes.every((p) => p.zero === '#ffffff')).toBe(true);
  const spectrum = first.palettes.find((p) => p.id === 'spectrum');
  expect(spectrum).toMatchObject({ low: '#8db8f2', high: '#ed8075', positiveStops: [
    { position: 0, color: '#8db8f2' }, { position: .2, color: '#64cdd0' },
    { position: .4, color: '#7fd18c' }, { position: .6, color: '#ead568' },
    { position: .8, color: '#f5b65f' }, { position: 1, color: '#ed8075' },
  ] });
  expect(first.metrics.filter((m) => m.placement === 'operator')).toHaveLength(10);
  first.palettes[0].low = '#000000';
  expect(getPlanViewCapabilities().palettes[0].low).toBe('#fff8ed');
  if (!spectrum?.positiveStops) throw new Error('Expected Spectrum color stops');
  spectrum.positiveStops[0].color = '#000000';
  expect(getPlanViewCapabilities().palettes.find((p) => p.id === 'spectrum')?.positiveStops?.[0].color).toBe('#8db8f2');
});
test('selection-required and malformed selected input are explicit errors', async () => {
  const multiple = '## A\nEmptyExec\n## B\nEmptyExec';
  await expect(analyzePlan(multiple)).rejects.toMatchObject({ code: 'SELECTION_REQUIRED' });
  await expect(convertPlanView(multiple)).rejects.toMatchObject({ code: 'SELECTION_REQUIRED' });
  expect((await inspectPlan(multiple, { input: { section: 2 } })).selection?.section).toBe(2);
  expect((await inspectPlan('| logical_plan | Projection: x |')).status).toBe('selection-required');
  await expect(inspectPlan('')).rejects.toMatchObject({ code: 'INVALID_PLAN' });
  await expect(inspectPlan('???')).rejects.toMatchObject({ code: 'INVALID_PLAN' });
  await expect(inspectPlan('┌───── Stage 1 ── tasks=1, partitions=1\n│ EmptyExec\n└─────')).rejects.toMatchObject({ code: 'INVALID_PLAN' });
});
test('malformed unselected variants are retained and diagnosed without invalidating the selected one', async () => {
  const result = await inspectPlan('| plan_type | plan |\n| physical_plan | EmptyExec |\n| Plan with Full Metrics | ??? |');
  expect(result.status).toBe('ready');
  expect(result.input.sections[0].variants[1].normalizedText).toBe('???');
  expect(result.diagnostics.some((d) => d.code === 'unselected-variant-invalid')).toBe(true);
});
test('missing WebCrypto affects only new APIs', async () => {
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
  try {
    expect(convertPlanToExcalidraw('EmptyExec').type).toBe('excalidraw');
    await expect(inspectPlan('EmptyExec')).rejects.toMatchObject({ code: 'HASH_UNAVAILABLE' });
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  }
});
test('custom generators keep precedence and optional overlays do not change raw properties', async () => {
  const text = 'EmptyExec, metrics=[elapsed_compute=2ms]';
  const config = { generator: { customGenerators: [{ operator: 'EmptyExec', generator: new LeafNodeGenerator({ details: () => ['Custom renderer'], outputArrows: () => 1 }) }] } };
  expect((await convertPlanView(text, config)).scene).toEqual(convertPlanToExcalidraw(text, config));
  const result = await convertPlanView(text, { ...config, metrics: { display: 'heatmap', metric: 'elapsed_compute' } });
  expect(result.scene.elements.some((e) => e.type === 'text' && e.text === 'Custom renderer')).toBe(true);
  if (result.inspection.document.kind !== 'single') throw new Error('Expected single tree');
  expect(result.inspection.document.root.properties).toEqual({ metrics: '[elapsed_compute=2ms]' });
});
test.each(['', 'metrics=[]', 'metrics=[elapsed_compute=]', 'metrics=[elapsed_compute=unavailable]', 'metrics=[elapsed_compute=-2ms]'])('tolerates absent or non-numeric metric values: %s', async (suffix) => {
  const result = await convertPlanView('EmptyExec' + (suffix ? ', ' + suffix : ''), { metrics: { display: 'heatmap', metric: 'elapsed_compute' } });
  expect(['not-reported', 'incomparable']).toContain(result.metrics.status);
  expect(result.metrics.cohorts).toHaveLength(0);
});
test.each(['purple', 'spectrum'] as const)('%s requires a comparison cohort and preserves source identities', async (palette) => {
  const text = 'ProjectionExec: expr=[x@0 as x], metrics=[output_rows=2]\n  EmptyExec, metrics=[output_rows{partition=0}=3]';
  const base = { interpretation: { metricProfile: METRIC_PROFILE } };
  const options = { ...base, metrics: { display: 'heatmap' as const, metric: 'output_rows', palette } };
  const result = await convertPlanView(text, options);
  expect(result.metrics.status).toBe('cohort-required');
  expect(result.metrics.cohorts.every((c) => c.ranking.every((r) => r.color === null))).toBe(true);
  const selected = await convertPlanView(text, { ...base, metrics: { ...options.metrics, cohort: result.metrics.cohorts[0].cohort.id } });
  expect(selected.metrics.status).toBe('ready');
  expect(selected.inspection.index).toEqual(result.inspection.index);
});
test('metrics off and structure on are independent, with explicit caller provenance', async () => {
  const result = await convertPlanView('BufferExec: capacity=8192\n  EmptyExec', { metrics: { display: 'off' }, structure: 'explain',
    provenance: { note: 'User reports this run was cancelled', executionState: 'cancelled' }, interpretation: { operatorProfile: OPERATOR_PROFILE } });
  expect(result.metrics.status).toBe('off');
  expect(result.structure.findings.length).toBeGreaterThan(0);
  expect(result.inspection.input.callerProvenance?.executionState).toBe('cancelled');
  expect(result.inspection.evidence.some((e) => e.origin === 'caller' && e.kind === 'declared')).toBe(true);
});
test('profile assumptions have evidence records and every dependency resolves', async () => {
  const result = await analyzePlan('EmptyExec, metrics=[output_rows=3]', { metrics: { display: 'labels', metric: 'output_rows' }, interpretation: { metricProfile: METRIC_PROFILE } });
  expect(result.inspection.evidence.some((e) => e.profileId === METRIC_PROFILE && e.origin === 'caller')).toBe(true);
  const ids = new Set(result.inspection.evidence.map((e) => e.id));
  for (const e of result.inspection.evidence) for (const id of e.dependsOn) expect(ids.has(id)).toBe(true);
});
