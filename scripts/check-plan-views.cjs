#!/usr/bin/env node
// Local/private input check. Discover every SQL file each run; never copy inputs into fixtures.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { ConverterService } = require('../dist');
const { convertPlanView } = require('../dist/services/plan-view.service');
const { getPlanViewCapabilities } = require('../dist/analysis/metrics/catalog');
const { METRIC_PROFILE, OPERATOR_PROFILE, EXPORT_PROFILE } = require('../dist/analysis/metrics/catalog');

function sqlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry =>
    entry.isDirectory() && entry.name !== 'expected' ? sqlFiles(path.join(directory, entry.name)) :
      entry.isFile() && entry.name.endsWith('.sql') ? [path.join(directory, entry.name)] : []);
}
(async () => {
  const directory = process.argv[2] || 'tmp/plan_examples';
  const results = [];
  for (const file of sqlFiles(directory)) {
    const text = fs.readFileSync(file, 'utf8');
    let baseline, baselineError;
    try { baseline = new ConverterService().convert(text); }
    catch (error) { baselineError = error.message; }
    if (baselineError) {
      await assert.rejects(convertPlanView(text), { code: 'INVALID_PLAN' });
      results.push({ file: path.relative(directory, file), status: 'existing-input-error', error: baselineError });
      continue;
    }
    const ordinary = await convertPlanView(text);
    assert.deepEqual(ordinary.scene, baseline, file + ': default visualization changed');
    const metrics = {};
    const assumedProfileMetrics = {};
    for (const metric of getPlanViewCapabilities().metrics.filter(m => m.placement === 'operator')) {
      const view = await convertPlanView(text, { metrics: { display: 'heatmap', metric: metric.name } });
      assert(['ready', 'not-reported', 'incomparable', 'cohort-required'].includes(view.metrics.status));
      assert.doesNotThrow(() => JSON.stringify(view));
      metrics[metric.name] = view.metrics.status;
      const assumed = await convertPlanView(text, { metrics: { display: 'heatmap', metric: metric.name },
        interpretation: { metricProfile: METRIC_PROFILE, exportProfile: EXPORT_PROFILE } });
      assert.doesNotThrow(() => JSON.stringify(assumed));
      assumedProfileMetrics[metric.name] = assumed.metrics.status;
    }
    const structure = await convertPlanView(text, { structure: 'explain', interpretation: { operatorProfile: OPERATOR_PROFILE } });
    assert.doesNotThrow(() => JSON.stringify(structure));
    results.push({ file: path.relative(directory, file), status: 'passed', metrics, assumedProfileMetrics,
      structuralFindings: structure.structure.findings.length, note: 'Profile passes are explicit test assumptions, not verified input provenance.' });
  }
  const report = { checked: results.length, passed: results.filter(r => r.status === 'passed').length, results };
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
