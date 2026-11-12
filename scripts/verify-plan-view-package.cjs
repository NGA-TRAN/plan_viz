#!/usr/bin/env node
// Build first. Check a real local archive without installing or publishing anything.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-viz-package-'));
const consumer = path.join(directory, 'consumer');
function run(command, args, cwd = root) {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' });
}

(async () => {
  const [archive] = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json',
    '--cache', path.join(directory, 'npm-cache'), '--pack-destination', directory]));
  const files = archive.files.map(file => file.path);
  for (const required of ['dist/index.js', 'dist/index.d.ts', 'docs/PLAN_VIEWS.md',
    'docs/PLAN_VISUALIZER_INTEGRATION.md', 'CHANGELOG.md', 'samples/README.md',
    'samples/single-node-metrics.sql', 'samples/distributed-metrics.sql']) assert(files.includes(required), 'Missing packaged file: ' + required);
  assert(!files.some(file => /^(tmp|tests|src)\//.test(file) || /(__tests__|\.test\.|\.spec\.)/.test(file)), 'Development inputs leaked into the package');
  const installed = path.join(consumer, 'node_modules', 'plan-viz');
  fs.mkdirSync(installed, { recursive: true });
  run('tar', ['-xzf', path.join(directory, archive.filename), '--strip-components=1', '-C', installed]);
  // Reuse the already installed runtime dependency; no network or dependency upgrade.
  fs.symlinkSync(path.join(root, 'node_modules', 'commander'), path.join(consumer, 'node_modules', 'commander'), 'dir');

  const guide = fs.readFileSync(path.join(installed, 'docs/PLAN_VISUALIZER_INTEGRATION.md'), 'utf8');
  const example = guide.match(/```ts\n([\s\S]*?)\n```/);
  assert(example, 'Missing integration example');
  fs.writeFileSync(path.join(consumer, 'consumer.ts'), example[1] + `
if (false) {
  // @ts-expect-error Off requests must not carry a selected metric.
  void convertPlanView('EmptyExec', { metrics: { display: 'off', metric: 'output_rows' } });
  // @ts-expect-error Labels requests must not carry a palette.
  void convertPlanView('EmptyExec', { metrics: { display: 'labels', metric: 'output_rows', palette: 'orange' } });
}
`);
  run(process.execPath, [require.resolve('typescript/bin/tsc'), '--noEmit', '--strict', '--target', 'ES2022',
    '--module', 'Node16', '--moduleResolution', 'Node16', '--lib', 'ES2022,DOM',
    '--typeRoots', path.join(root, 'node_modules/@types'), '--types', 'node', 'consumer.ts'], consumer);

  run(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const path = require('node:path');
    const api = require('plan-viz');
    (async () => {
      const input = 'ProjectionExec: expr=[x@0 as x], metrics=[elapsed_compute=0ns]\\n  EmptyExec, metrics=[elapsed_compute=2ms]';
      const ordinary = await api.convertPlanView(input);
      assert.deepEqual(ordinary.scene, api.convertPlanToExcalidraw(input));
      const colored = await api.convertPlanView(input, { metrics: { display: 'heatmap', metric: 'elapsed_compute' } });
      assert.equal(colored.metrics.cohorts[0].ranking.find(r => r.value.decimal === '0').color, '#ffffff');
      const missing = await api.analyzePlan('EmptyExec', { metrics: { display: 'heatmap', metric: 'elapsed_compute' } });
      assert.equal(missing.metrics.status, 'not-reported');
      const inspected = await api.inspectPlan(input);
      assert.equal(inspected.status, 'ready');
      assert.deepEqual(api.getPlanViewCapabilities().palettes.map(p => p.id), ['orange', 'blue', 'purple']);
      const packageRoot = path.dirname(require.resolve('plan-viz/package.json'));
      for (const kind of ['single-node', 'distributed']) {
        const sample = fs.readFileSync(path.join(packageRoot, 'samples', kind + '-metrics.sql'), 'utf8');
        const baseline = await api.convertPlanView(sample);
        assert.deepEqual(baseline.scene, api.convertPlanToExcalidraw(sample));
        assert.equal(baseline.inspection.document.kind, kind === 'single-node' ? 'single' : 'distributed');
        const interpretation = { metricProfile: 'datafusion-7865139',
          exportProfile: 'distributed-b32ee66', operatorProfile: 'datafusion-physical-7865139' };
        for (const metric of ['elapsed_compute', 'output_rows']) {
          const view = await api.convertPlanView(sample, { interpretation, metrics: { display: 'heatmap', metric }, structure: 'explain' });
          assert.equal(view.metrics.status, 'ready', kind + ': ' + metric);
          assert.deepEqual(view.diagnostics, []);
          assert(view.structure.findings.length > 0);
          if (kind === 'distributed') {
            const ranking = view.metrics.cohorts[0].ranking;
            assert(ranking.every(entry => entry.owner.kind === 'instance'));
            assert(ranking.some(entry => entry.value.decimal === '0' && entry.color === '#ffffff'));
          }
        }
        const withoutProfile = await api.analyzePlan(sample, { metrics: { display: 'heatmap', metric: 'output_rows' } });
        assert.equal(withoutProfile.metrics.status, 'incomparable');
      }
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `], consumer);
  run(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { inspectPlan, analyzePlan, convertPlanView, getPlanViewCapabilities } from 'plan-viz';
    assert.equal((await inspectPlan('EmptyExec')).status, 'ready');
    assert.equal((await analyzePlan('EmptyExec')).metrics.status, 'off');
    assert((await convertPlanView('EmptyExec')).scene.elements.length > 0);
    assert.equal(getPlanViewCapabilities().schemaVersion, 1);
  `], consumer);
  const capabilities = JSON.parse(run(process.execPath, [path.join(installed, 'dist/cli.js'), '--capabilities'], consumer));
  assert.equal(capabilities.schemaVersion, 1);
  assert.equal(capabilities.palettes.find(p => p.id === 'orange').zero, '#ffffff');
  for (const kind of ['single-node', 'distributed']) {
    const output = path.join(consumer, kind + '.excalidraw');
    run(process.execPath, [path.join(installed, 'dist/cli.js'), '-i',
      path.join(installed, 'samples', kind + '-metrics.sql'), '--metric-display', 'heatmap',
      '--metric', 'output_rows', '--metric-profile', 'datafusion-7865139',
      '--export-profile', 'distributed-b32ee66', '-o', output], consumer);
    assert(JSON.parse(fs.readFileSync(output, 'utf8')).elements.length > 0);
  }
  await require('esbuild').build({ stdin: { contents: 'import * as api from "plan-viz"; globalThis.planViz = api;',
    resolveDir: consumer }, bundle: true, write: false, platform: 'browser', format: 'iife', logLevel: 'silent' });
  const report = { directory, packageVersion: archive.version, fileCount: files.length,
    packagedDocs: true, packagedSamples: true, sampleDefaultParity: true, sampleMetricProfiles: true,
    guideTypecheck: true, runtimeApi: true, esmImport: true, cli: true, sampleCli: true, browserBundle: true };
  fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error('Package check failed; artifacts: ' + directory, error); process.exitCode = 1; });
