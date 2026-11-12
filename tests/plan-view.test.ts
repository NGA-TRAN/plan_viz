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
test.each(['orange', 'blue', 'purple'] as const)('%s overlays preserve every original element except an attributable fill', async palette => {
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
