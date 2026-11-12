import { webcrypto } from 'node:crypto';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Command } from 'commander';
import { hasViewOptions, runPlanViewCli, ViewCliOptions } from '../plan-view-cli';

let directory: string;
const stdout: string[] = [];
const stderr: string[] = [];

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
});
beforeEach(() => {
  directory = fs.mkdtempSync(join(tmpdir(), 'plan-view-cli-direct-'));
  stdout.length = 0;
  stderr.length = 0;
  jest.spyOn(console, 'log').mockImplementation((value: unknown) => {
    stdout.push(String(value));
  });
  jest.spyOn(console, 'error').mockImplementation((value: unknown) => {
    stderr.push(String(value));
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  fs.rmSync(directory, { recursive: true, force: true });
});

function programFor(options: ViewCliOptions, extra: Record<string, unknown> = {}): Command {
  const program = new Command();
  for (const [key, value] of Object.entries({ ...options, ...extra })) {
    program.setOptionValueWithSource(key, value, 'cli');
  }
  return program;
}
function inputFile(text = 'EmptyExec'): string {
  const file = join(directory, 'input.sql');
  fs.writeFileSync(file, text);
  return file;
}
function jsonOutput(): unknown {
  expect(stdout).toHaveLength(1);
  return JSON.parse(stdout[0]);
}

test('only explicit view options select the optional CLI path', () => {
  const program = new Command();
  program.setOptionValueWithSource('metricDisplay', 'off', 'default');
  program.setOptionValueWithSource('palette', 'spectrum', 'env');
  program.setOptionValueWithSource('input', 'plan.sql', 'cli');
  expect(hasViewOptions(program)).toBe(false);
  program.setOptionValueWithSource('metricDisplay', 'off', 'cli');
  expect(hasViewOptions(program)).toBe(true);
});

test('capabilities writes one JSON payload without reading a plan or stdin', async () => {
  const read = jest.spyOn(fs, 'readFileSync');
  await runPlanViewCli(programFor({ capabilities: true }), { capabilities: true }, {});
  expect(read).not.toHaveBeenCalled();
  expect(jsonOutput()).toMatchObject({ schemaVersion: 1, defaultDisplay: 'off', defaultHeatmapPalette: 'orange' });
  expect(stderr).toEqual([]);
});

test('capabilities may be written to a file with a JSON success message', async () => {
  const output = join(directory, 'capabilities.json');
  const options = { capabilities: true, output };
  await runPlanViewCli(programFor(options), options, {});
  expect(JSON.parse(fs.readFileSync(output, 'utf8'))).toMatchObject({ schemaVersion: 1 });
  expect(stdout).toEqual(['Successfully wrote JSON to: ' + resolve(output)]);
});

const invalidRequests: Array<{ name: string; options: ViewCliOptions; extra?: Record<string, unknown> }> = [
  { name: 'multiple output modes', options: { capabilities: true, inspect: true } },
  { name: 'capabilities with input', options: { capabilities: true } },
  { name: 'inspection with metric display', options: { inspect: true, metricDisplay: 'off' } },
  { name: 'inspection with rendering', options: { inspect: true }, extra: { allWorkers: true } },
  { name: 'analysis with rendering', options: { analyze: true }, extra: { nodeWidth: 200 } },
  { name: 'analysis with a sidecar', options: { analyze: true, report: 'report.json' } },
  { name: 'off with a metric', options: { metric: 'elapsed_compute' } },
  { name: 'off with a palette', options: { palette: 'spectrum' } },
  { name: 'off with a cohort', options: { metricCohort: 'elapsed_compute:c1' } },
  { name: 'labels without a metric', options: { metricDisplay: 'labels' } },
  { name: 'labels with a palette', options: { metricDisplay: 'labels', metric: 'elapsed_compute', palette: 'blue' } },
  { name: 'unknown display', options: { metricDisplay: 'unknown', metric: 'elapsed_compute' } },
  { name: 'unknown palette', options: { metricDisplay: 'heatmap', metric: 'elapsed_compute', palette: 'unknown' } },
  { name: 'unknown structure mode', options: { structure: 'unknown' } },
  { name: 'stdout sidecar', options: { report: '-' } },
  { name: 'empty sidecar path', options: { report: '  ' } },
];
test.each(invalidRequests)('rejects $name before reading input or emitting output', async ({ options, extra }) => {
  const request = { ...options, input: join(directory, 'does-not-exist.sql') };
  await expect(runPlanViewCli(programFor(request, extra), request, {})).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
  expect(stdout).toEqual([]);
  expect(stderr).toEqual([]);
});

test('inspection preserves section selection supplied by the existing converter configuration', async () => {
  const options = { inspect: true, input: inputFile('## First\nEmptyExec\n## Second\nProjectionExec: expr=[x@0 as x]\n  EmptyExec') };
  await runPlanViewCli(programFor(options), options, { input: { section: 2 } });
  expect(jsonOutput()).toMatchObject({ status: 'ready', selection: { section: 2 }, document: { kind: 'single' } });
  expect(stderr).toEqual([]);
});

test('analysis forwards metric interpretation and Spectrum selection without producing a scene', async () => {
  const options = { analyze: true, input: inputFile('UnionExec\n  EmptyExec, metrics=[output_rows=0]\n  EmptyExec, metrics=[output_rows=100]'),
    metricDisplay: 'heatmap', metric: 'output_rows', palette: 'spectrum', metricProfile: 'datafusion-7865139' };
  await runPlanViewCli(programFor(options), options, {});
  const result = jsonOutput();
  expect(result).toMatchObject({ metrics: { status: 'ready', palette: 'spectrum', cohorts: [{ ranking: [
    { value: { decimal: '100' }, color: '#ed8075' }, { value: { decimal: '0' }, color: '#ffffff' },
  ] }] } });
  expect(result).not.toHaveProperty('scene');
});

test('labels analysis keeps numeric values without assigning heatmap colors', async () => {
  const options = { analyze: true, input: inputFile('EmptyExec, metrics=[elapsed_compute=2ms]'),
    metricDisplay: 'labels', metric: 'elapsed_compute', metricCohort: 'elapsed_compute:c1' };
  await runPlanViewCli(programFor(options), options, {});
  expect(jsonOutput()).toMatchObject({ metrics: { display: 'labels', palette: null,
    selectedCohort: 'elapsed_compute:c1', cohorts: [{ ranking: [{ value: { decimal: '2000000' }, color: null }] }] } });
});

test('scene conversion defaults to the current view and writes valid JSON to stdout', async () => {
  const options = { input: inputFile() };
  await runPlanViewCli(programFor(options), options, {});
  expect(jsonOutput()).toMatchObject({ type: 'excalidraw', elements: expect.any(Array) });
  expect(stderr).toEqual([]);
});

test('scene and sidecar files use the default heatmap palette and distinct payloads', async () => {
  const output = join(directory, 'scene.excalidraw');
  const report = join(directory, 'report.json');
  const options = { input: inputFile('EmptyExec, metrics=[elapsed_compute=2ms]'), output, report,
    metricDisplay: 'heatmap', metric: 'elapsed_compute' };
  await runPlanViewCli(programFor(options), options, {});
  expect(JSON.parse(fs.readFileSync(output, 'utf8'))).toMatchObject({ type: 'excalidraw', elements: expect.any(Array) });
  const detail: unknown = JSON.parse(fs.readFileSync(report, 'utf8'));
  expect(detail).toMatchObject({ metrics: { palette: 'orange', status: 'ready' }, renderIndex: expect.any(Array) });
  expect(detail).not.toHaveProperty('scene');
  expect(stdout).toEqual(['Successfully wrote Excalidraw JSON to: ' + resolve(output)]);
});

test('stdin conversion can write a sidecar while keeping stdout as scene JSON', async () => {
  const originalRead = fs.readFileSync;
  const read = jest.spyOn(fs, 'readFileSync').mockImplementation((file, options) => {
    return file === 0 ? 'EmptyExec, metrics=[elapsed_compute=0ns]' : originalRead(file, options);
  });
  const options = { report: join(directory, 'report.json'), metricDisplay: 'heatmap', metric: 'elapsed_compute' };
  await runPlanViewCli(programFor(options), options, {});
  expect(read).toHaveBeenCalledWith(0, 'utf8');
  expect(jsonOutput()).toMatchObject({ type: 'excalidraw' });
  expect(JSON.parse(originalRead(options.report, 'utf8'))).toMatchObject({ metrics: { status: 'ready' } });
});

test('partial-recording diagnostics use stderr while stdout remains valid scene JSON', async () => {
  const options = { input: inputFile('[Stage 3] => NetworkShuffleExec: output_partitions=4, input_tasks=2') };
  await runPlanViewCli(programFor(options), options, {});
  expect(jsonOutput()).toMatchObject({ type: 'excalidraw' });
  expect(stderr.some((message) => message.startsWith('partial-recording: '))).toBe(true);
});

test.each(['input', 'output'] as const)('rejects a sidecar symlink alias of the %s without overwriting it', async (target) => {
  const input = inputFile();
  const output = join(directory, 'existing-output.json');
  fs.writeFileSync(output, 'keep existing output');
  const report = join(directory, 'alias.json');
  fs.symlinkSync(target === 'input' ? input : output, report);
  const options = { input, output, report };
  await expect(runPlanViewCli(programFor(options), options, {})).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
  expect(fs.readFileSync(input, 'utf8')).toBe('EmptyExec');
  expect(fs.readFileSync(output, 'utf8')).toBe('keep existing output');
  expect(stdout).toEqual([]);
});

test('rejects the same scene and report destination before either file exists', async () => {
  const output = join(directory, 'shared.json');
  const options = { input: inputFile(), output, report: output };
  await expect(runPlanViewCli(programFor(options), options, {})).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
  expect(fs.existsSync(output)).toBe(false);
  expect(stdout).toEqual([]);
});

test('rejects an input/output alias when a distinct report is requested', async () => {
  const input = inputFile();
  const output = join(directory, 'alias.sql');
  fs.symlinkSync(input, output);
  const report = join(directory, 'report.json');
  const options = { input, output, report };
  await expect(runPlanViewCli(programFor(options), options, {})).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
  expect(fs.readFileSync(input, 'utf8')).toBe('EmptyExec');
  expect(fs.existsSync(report)).toBe(false);
  expect(stdout).toEqual([]);
});

test('sidecar write failure emits no successful scene and preserves an existing output', async () => {
  const output = join(directory, 'scene.excalidraw');
  fs.writeFileSync(output, 'keep existing scene');
  const options = { input: inputFile(), output, report: join(directory, 'missing', 'report.json') };
  await expect(runPlanViewCli(programFor(options), options, {})).rejects.toMatchObject({ code: 'ENOENT' });
  expect(fs.readFileSync(output, 'utf8')).toBe('keep existing scene');
  expect(stdout).toEqual([]);
});

test('invalid plan input leaves output files untouched and emits no success message', async () => {
  const output = join(directory, 'scene.excalidraw');
  fs.writeFileSync(output, 'keep existing scene');
  const options = { input: inputFile('???'), output, report: join(directory, 'report.json') };
  await expect(runPlanViewCli(programFor(options), options, {})).rejects.toMatchObject({ code: 'INVALID_PLAN' });
  expect(fs.readFileSync(output, 'utf8')).toBe('keep existing scene');
  expect(fs.existsSync(options.report)).toBe(false);
  expect(stdout).toEqual([]);
});
