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
  expect(JSON.parse(result.stdout).defaultDisplay).toBe('off');
  expect(result.stderr).toBe('');
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
])('rejects invalid option combination %j before output', (...args) => {
  const result = cli(args);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
});
test('scene and report sidecar correspond and sidecar omits the scene', () => {
  const scene = join(directory, 'scene.json'); const report = join(directory, 'report.json');
  const result = cli(['--metric-display', 'heatmap', '--metric', 'elapsed_compute', '--palette', 'purple', '-o', scene, '--report', report], 'EmptyExec, metrics=[elapsed_compute=2ms]');
  expect(result.status).toBe(0);
  const detail = JSON.parse(readFileSync(report, 'utf8'));
  expect(detail.scene).toBeUndefined();
  expect(detail.metrics.palette).toBe('purple');
  expect(JSON.parse(readFileSync(scene, 'utf8')).type).toBe('excalidraw');
});
test('rejects duplicate destinations and reports write failures', () => {
  expect(cli(['-o', join(directory, 'same'), '--report', join(directory, 'same')]).status).toBe(1);
  expect(cli(['--report', '-']).status).toBe(1);
  const result = cli(['--report', join(directory, 'missing', 'report.json')]);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  expect(result.stderr).toContain('ENOENT');
});
