import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { webcrypto } from 'node:crypto';
import { convertPlanToExcalidraw } from '../src';
import { convertPlanView } from '../src/services/plan-view.service';
import { OPERATOR_PROFILE, EXPORT_PROFILE, METRIC_PROFILE } from '../src/analysis/metrics/catalog';
import { assertTextBindings } from '../src/generators/__tests__/utils/text-binding-assertions';

beforeAll(() => { Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true }); });
function sqlFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() && entry.name !== 'expected' ? sqlFiles(join(directory, entry.name)) :
    entry.isFile() && entry.name.endsWith('.sql') ? [join(directory, entry.name)] : []);
}
const fixtures = sqlFiles(__dirname).filter(file => !file.includes('plan-views/'));
describe('optional plan view compatibility across the existing SQL corpus', () => {
  test.each(fixtures.map(file => [relative(__dirname, file), file]))('%s: default output is exactly unchanged', async (_, file) => {
    const text = readFileSync(file, 'utf8');
    const legacy = convertPlanToExcalidraw(text);
    const result = await convertPlanView(text);
    expect(result.scene).toEqual(legacy);
    const off = await convertPlanView(text, { metrics: { display: 'off' }, structure: 'off' });
    expect(off.scene).toEqual(legacy);
    expect(() => JSON.stringify(result)).not.toThrow();
    assertTextBindings(result.scene.elements);
    const missing = await convertPlanView(text, { metrics: { display: 'heatmap', metric: 'peak_mem_used' } });
    expect(['ready', 'not-reported', 'incomparable', 'cohort-required']).toContain(missing.metrics.status);
  });
});
test.each(['orange', 'blue', 'purple', 'spectrum'] as const)('%s overlays preserve every original element except an attributable fill', async palette => {
  const text = 'ProjectionExec: expr=[x@0 as x], metrics=[elapsed_compute=1ms]\n  EmptyExec, metrics=[elapsed_compute=2ms]';
  const base = convertPlanToExcalidraw(text);
  const result = await convertPlanView(text, { metrics: { display: 'heatmap', metric: 'elapsed_compute', palette }, structure: 'explain', interpretation: { operatorProfile: OPERATOR_PROFILE } });
  for (const before of base.elements) {
    const after = result.scene.elements.find(e => e.id === before.id)!;
    expect({ ...after, backgroundColor: before.backgroundColor }).toEqual(before);
  }
  expect(result.scene.elements.length).toBeGreaterThan(base.elements.length);
  expect(result.renderIndex.filter(r => r.status === 'visible')).toHaveLength(2);
  expect(new Set(result.scene.elements.map(e => e.id)).size).toBe(result.scene.elements.length);
  assertTextBindings(result.scene.elements);
});
test('Spectrum paints reported values without changing ranks or treating missing and raw values as zero', async () => {
  const text = 'UnionExec, metrics=[elapsed_compute=unknown]\n  EmptyExec, metrics=[elapsed_compute=0ns]\n  EmptyExec, metrics=[elapsed_compute=20ns]\n  EmptyExec, metrics=[elapsed_compute=100ns]\n  EmptyExec';
  const base = convertPlanToExcalidraw(text);
  const spectrum = await convertPlanView(text, { metrics: { display: 'heatmap', metric: 'elapsed_compute', palette: 'spectrum' } });
  const orange = await convertPlanView(text, { metrics: { display: 'heatmap', metric: 'elapsed_compute', palette: 'orange' } });
  expect(spectrum.metrics.status).toBe('ready');
  expect(spectrum.metrics.cohorts[0].ranking.map(rank => ({ ...rank, color: null })))
    .toEqual(orange.metrics.cohorts[0].ranking.map(rank => ({ ...rank, color: null })));
  const painted = spectrum.renderIndex.filter(ref => ref.status === 'visible').map(ref => {
    const body = spectrum.scene.elements.find(element => ref.elementIds.includes(element.id))!;
    const before = base.elements.find(element => element.id === body.id)!;
    const observations = spectrum.inspection.observations.filter(observation => 'sourceId' in observation.owner && observation.owner.sourceId === ref.sourceId);
    return { raw: observations.map(observation => observation.raw), fill: body.backgroundColor, originalFill: before.backgroundColor };
  });
  for (const [raw, fill] of [['0ns', '#ffffff'], ['20ns', '#64cdd0'], ['100ns', '#ed8075']]) {
    expect(painted.find(body => body.raw.includes(raw))?.fill).toBe(fill);
  }
  const unpainted = painted.filter(body => body.raw.length === 0 || body.raw.includes('unknown'));
  expect(unpainted).toHaveLength(2);
  for (const body of unpainted) expect(body.fill).toBe(body.originalFill);
  expect(spectrum.metrics.unrankedObservationIds).toHaveLength(1);
  expect(spectrum.metrics.notReportedSourceIds).toHaveLength(1);
});
test('Spectrum legend separates white zero from six labeled positive colors in one editable group', async () => {
  const result = await convertPlanView('EmptyExec, metrics=[elapsed_compute=1ms]', {
    metrics: { display: 'heatmap', metric: 'elapsed_compute', palette: 'spectrum' }
  });
  const positiveLabel = result.scene.elements.find(element => element.type === 'text' && element.text === '>0');
  expect(positiveLabel).toBeDefined();
  expect(positiveLabel?.groupIds).toHaveLength(1);
  const group = positiveLabel!.groupIds[0];
  const legend = result.scene.elements.filter(element => element.groupIds.includes(group));
  const swatches = legend.filter(element => element.type === 'rectangle');
  const labels = legend.filter(element => element.type === 'text');
  expect(swatches.map(element => element.backgroundColor)).toEqual(['#ffffff', '#8db8f2', '#64cdd0', '#7fd18c', '#ead568', '#f5b65f', '#ed8075']);
  expect(labels.map(element => element.text)).toEqual(['0', '>0', '20%', '40%', '60%', '80%', '100%']);
  expect(legend).toHaveLength(14);
  expect(swatches[6].x + swatches[6].width - swatches[0].x).toBe(620);
  expect(swatches[1].x - (swatches[0].x + swatches[0].width)).toBe(10);
  labels.forEach((label, index) => {
    expect(label.textAlign).toBe('center');
    expect(label.fontSize).toBe(12);
    expect(label.x + label.width / 2).toBe(swatches[index].x + swatches[index].width / 2);
    expect(label.y).toBe(swatches[index].y + 25);
  });
  assertTextBindings(result.scene.elements);
});
test('an all-zero Spectrum legend displays only its grouped white zero swatch', async () => {
  const result = await convertPlanView('EmptyExec, metrics=[elapsed_compute=0ns]', {
    metrics: { display: 'heatmap', metric: 'elapsed_compute', palette: 'spectrum' }
  });
  const zeroLabel = result.scene.elements.find(element => element.type === 'text' && element.text === '0');
  expect(zeroLabel).toBeDefined();
  expect(zeroLabel?.groupIds).toHaveLength(1);
  const legend = result.scene.elements.filter(element => element.groupIds.includes(zeroLabel!.groupIds[0]));
  expect(legend).toHaveLength(2);
  expect(legend.filter(element => element.type === 'rectangle').map(element => element.backgroundColor)).toEqual(['#ffffff']);
  expect(result.metrics.cohorts[0].legend.allZero).toBe(true);
  expect(result.scene.elements.some(element => element.type === 'text' && element.text === '>0')).toBe(false);
  assertTextBindings(result.scene.elements);
});
test('Spectrum paints each distributed task from its own value while preserving operator geometry', async () => {
  const text = '┌───── DistributedExec\n│ EmptyExec\n└─────\n┌───── Stage 1 ── tasks=3, partitions=1\n│ EmptyExec, metrics=[elapsed_compute={0:0ns, 1:20ns, 2:100ns}]\n└─────';
  const base = await convertPlanView(text, { distributed: { workerDisplay: 'all' } });
  const result = await convertPlanView(text, {
    metrics: { display: 'heatmap', metric: 'elapsed_compute', palette: 'spectrum' },
    interpretation: { metricProfile: METRIC_PROFILE, exportProfile: EXPORT_PROFILE },
    distributed: { workerDisplay: 'all' }
  });
  const taskFills = result.inspection.observations.map(observation => {
    const owner = observation.owner;
    if (owner.kind !== 'instance') throw new Error('Expected a per-task observation.');
    const ref = result.renderIndex.find(reference => reference.instanceId === owner.instanceId)!;
    const body = result.scene.elements.find(element => ref.elementIds.includes(element.id))!;
    return { raw: observation.raw, fill: body.backgroundColor };
  });
  expect(taskFills).toEqual([
    { raw: '0ns', fill: '#ffffff' },
    { raw: '20ns', fill: '#64cdd0' },
    { raw: '100ns', fill: '#ed8075' }
  ]);
  for (const before of base.scene.elements) {
    const after = result.scene.elements.find(element => element.id === before.id)!;
    expect({ ...after, backgroundColor: before.backgroundColor }).toEqual(before);
  }
  assertTextBindings(result.scene.elements);
});
test('distributed mapping uses final IDs and hidden task values remain in the scale', async () => {
  const text = '┌───── DistributedExec\n│ EmptyExec\n└─────\n┌───── Stage 1 ── tasks=3, partitions=1\n│ EmptyExec, metrics=[elapsed_compute={0:10ms, 1:500ms, 2:20ms}]\n└─────';
  const result = await convertPlanView(text, { metrics: { display: 'heatmap', metric: 'elapsed_compute' }, interpretation: { metricProfile: METRIC_PROFILE, exportProfile: EXPORT_PROFILE } });
  expect(result.renderIndex.some(r => r.status === 'omitted-task')).toBe(true);
  for (const ref of result.renderIndex) for (const id of ref.elementIds) expect(result.scene.elements.some(e => e.id === id)).toBe(true);
  expect(result.metrics.cohorts[0].legend.maximum.decimal).toBe('500000000');
});
test('badges avoid other operator bodies in a compact multi-input plan', async () => {
  const text = 'UnionExec\n  EmptyExec, metrics=[elapsed_compute=1ms]\n  EmptyExec, metrics=[elapsed_compute=2ms]';
  const result = await convertPlanView(text, { metrics: { display: 'heatmap', metric: 'elapsed_compute' }, generator: { horizontalSpacing: 20 } });
  const bodies = result.renderIndex.flatMap(r => r.elementIds).map(id => result.scene.elements.find(e => e.id === id)!);
  const badges = result.scene.elements.filter(e => e.id.startsWith('plan-view-') && e.type === 'rectangle' && e.groupIds.length);
  for (const badge of badges) for (const body of bodies) expect(badge.x < body.x + body.width && badge.x + badge.width > body.x &&
    badge.y < body.y + body.height && badge.y + badge.height > body.y).toBe(false);
});
