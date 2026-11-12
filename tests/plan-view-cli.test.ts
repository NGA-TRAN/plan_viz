import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'plan-view-cli-'));
beforeAll(() => execFileSync('npm', ['run', 'build'], { stdio: 'pipe' }));
afterAll(() => rmSync(directory, { recursive: true, force: true }));
function cli(args: string[], input = 'EmptyExec') {
  return spawnSync(process.execPath, ['dist/cli.js', ...args], { input, encoding: 'utf8' });
}
test('capabilities returns one JSON payload and needs no plan', () => {
  const result = cli(['--capabilities'], '');
  expect(result.status).toBe(0);
  const capabilities = JSON.parse(result.stdout);
  expect(capabilities.defaultDisplay).toBe('off');
  expect(capabilities.palettes.map((palette: { id: string }) => palette.id)).toEqual(['orange', 'blue', 'purple', 'spectrum']);
  expect(capabilities.palettes.every((palette: { zero: string }) => palette.zero === '#ffffff')).toBe(true);
  expect(result.stderr).toBe('');
});
test('Spectrum analysis colors reported timers and preserves measured zero', () => {
  const result = cli(['--analyze', '--metric-display', 'heatmap', '--metric', 'elapsed_compute', '--palette', 'spectrum'],
    'UnionExec\n  EmptyExec, metrics=[elapsed_compute=0ns]\n  EmptyExec, metrics=[elapsed_compute=20ns]\n  EmptyExec, metrics=[elapsed_compute=100ns]');
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  const metrics = JSON.parse(result.stdout).metrics;
  expect(metrics).toMatchObject({ palette: 'spectrum', status: 'ready' });
  expect(metrics.cohorts[0].ranking.map((entry: { value: { decimal: string }; color: string }) => [entry.value.decimal, entry.color]))
    .toEqual([['100', '#ed8075'], ['20', '#64cdd0'], ['0', '#ffffff']]);
});
test('help advertises Spectrum alongside the existing palettes', () => {
  const result = cli(['--help']);
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('spectrum');
});
test('inspect and analyze report missing metrics without failure', () => {
  const inspect = cli(['--inspect']);
  expect(inspect.status).toBe(0);
  expect(JSON.parse(inspect.stdout).status).toBe('ready');
  const analyze = cli(['--analyze', '--metric-display', 'heatmap', '--metric', 'elapsed_compute']);
  expect(analyze.status).toBe(0);
  expect(JSON.parse(analyze.stdout).metrics.status).toBe('not-reported');
});
test.each([
  ['--metric', 'elapsed_compute'], ['--metric-display', 'labels'], ['--palette', 'purple'],
  ['--metric-display', 'labels', '--metric', 'output_rows', '--palette', 'orange'],
  ['--capabilities', '--input', 'missing.sql'], ['--inspect', '--analyze'],
  ['--inspect', '--all-workers'], ['--analyze', '--node-width', '200'],
  ['--inspect', '--structure', 'off'], ['--analyze', '--report', 'unused.json'],
  ['--metric-display', 'heatmap', '--metric', 'elapsed_compute', '--palette', 'unknown'],
])('rejects invalid option combination %j before output', (...args) => {
  const result = cli(args);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
});
test.each(['purple', 'spectrum'])('%s scene and report sidecar correspond and sidecar omits the scene', (palette) => {
  const scene = join(directory, palette + '-scene.json'); const report = join(directory, palette + '-report.json');
  const result = cli(['--metric-display', 'heatmap', '--metric', 'elapsed_compute', '--palette', palette, '-o', scene, '--report', report], 'EmptyExec, metrics=[elapsed_compute=2ms]');
  expect(result.status).toBe(0);
  const detail = JSON.parse(readFileSync(report, 'utf8'));
  expect(detail.scene).toBeUndefined();
  expect(detail.metrics.palette).toBe(palette);
  const drawing = JSON.parse(readFileSync(scene, 'utf8'));
  expect(drawing.type).toBe('excalidraw');
  const operator = drawing.elements.find((element: { type: string; text?: string }) => element.type === 'text' && element.text === 'EmptyExec');
  const body = drawing.elements.find((element: { id: string }) => element.id === operator.containerId);
  expect(body.backgroundColor).toBe(palette === 'spectrum' ? '#ed8075' : '#c4a1f2');
});
test('rejects duplicate destinations and reports write failures', () => {
  expect(cli(['-o', join(directory, 'same'), '--report', join(directory, 'same')]).status).toBe(1);
  expect(cli(['--report', '-']).status).toBe(1);
  const result = cli(['--report', join(directory, 'missing', 'report.json')]);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  expect(result.stderr).toContain('ENOENT');
});
