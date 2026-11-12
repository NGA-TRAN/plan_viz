#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const { convertPlanView, getPlanViewCapabilities } = require('../dist');

(async () => {
  const out = path.resolve(process.argv[2] || 'tmp/new_requests/phase5/browser');
  const palette = getPlanViewCapabilities().palettes.find(candidate => candidate.id === (process.argv[3] || 'orange'));
  assert(palette, 'Choose a palette listed by getPlanViewCapabilities().');
  fs.mkdirSync(out, { recursive: true });
  const input = fs.readFileSync('tests/plan-views/tasks/input.sql', 'utf8');
  const options = JSON.parse(fs.readFileSync('tests/plan-views/tasks/case.json')).views.orange;
  options.metrics.palette = palette.id;
  const result = await convertPlanView(input, options);
  const entry = 'import React from "react";import{createRoot}from"react-dom/client";import{Excalidraw}from"@excalidraw/excalidraw";import*as planViz from"./src/index";window.planViz=planViz;createRoot(document.getElementById("root")).render(React.createElement(Excalidraw,{initialData:window.scene,excalidrawAPI:api=>window.api=api}));';
  const bundle = await esbuild.build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'js' }, bundle: true,
    write: false, format: 'iife', platform: 'browser', define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent' });
  const css = fs.readFileSync('node_modules/@excalidraw/excalidraw/dist/prod/index.css');
  const server = http.createServer((req, res) => {
    if (req.url === '/app.js') { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(bundle.outputFiles[0].text); }
    else if (req.url === '/app.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); }
    else { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/app.css"><style>html,body,#root{margin:0;width:100%;height:100%}</style><div id="root"></div><script>window.scene=' + JSON.stringify(result.scene).replace(/</g, '\\u003c') + '</script><script src="/app.js"></script>'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => window.api?.getSceneElements().length > 0);
    const browserResult = await page.evaluate(async ({ input, options }) => {
      let converted;
      try { converted = await window.planViz.convertPlanView(input, options); }
      catch (error) { throw new Error(error.message + '\n' + JSON.stringify(new window.planViz.PlanDocumentParser().parse(input))); }
      const missing = await window.planViz.analyzePlan('EmptyExec', { metrics: { display: 'heatmap', metric: 'elapsed_compute' } });
      const extremes = await window.planViz.convertPlanView('UnionExec\n  EmptyExec, metrics=[elapsed_compute=0ns]\n  EmptyExec, metrics=[elapsed_compute=1ns]\n  EmptyExec, metrics=[elapsed_compute=9007199254740993000ns]', options);
      const extremeFills = extremes.metrics.cohorts[0].ranking.map(rank => {
        const reference = extremes.renderIndex.find(ref => ref.sourceId === rank.owner.sourceId);
        const shape = extremes.scene.elements.find(element => reference.elementIds.includes(element.id));
        return { value: rank.value.decimal, intensity: rank.intensity, fill: shape.backgroundColor };
      });
      return { scene: converted.scene, missing: missing.metrics.status, hash: converted.inspection.input.contentHash, extremeFills };
    }, { input, options });
    assert.deepEqual(browserResult.scene, result.scene, 'browser and Node results differ');
    assert.equal(browserResult.missing, 'not-reported');
    assert.equal(browserResult.hash, result.inspection.input.contentHash);
    assert.deepEqual(browserResult.extremeFills.find(value => value.value === '0'), { value: '0', intensity: 0, fill: palette.zero });
    assert.deepEqual(browserResult.extremeFills.find(value => value.value === '1'), { value: '1', intensity: 0, fill: palette.low });
    const reference = result.renderIndex.find(ref => ref.annotationIds.length && ref.instanceId);
    const shape = result.scene.elements.find(e => e.id === reference.elementIds[0]);
    const worker = result.scene.elements.find(e => e.customData?.role === 'worker' && shape.groupIds.includes(e.groupIds[0]));
    async function dragGroup(target, group, editingGroupId, movingIds = reference.annotationIds, stationaryIds = []) {
      await page.evaluate(({ group, editingGroupId }) => {
        const elements = window.api.getSceneElements();
        window.api.scrollToContent(elements.filter(e => e.groupIds.includes(group)), { fitToViewport: true, viewportZoomFactor: .65 });
        window.api.updateScene({ appState: { editingGroupId, selectedElementIds: Object.fromEntries(elements.filter(e => e.groupIds.includes(group)).map(e => [e.id, true])), selectedGroupIds: { [group]: true } } });
      }, { group, editingGroupId });
      await page.waitForTimeout(200);
      const before = await page.evaluate(() => window.api.getSceneElements());
      const point = await page.evaluate(id => {
        const e = window.api.getSceneElements().find(e => e.id === id), s = window.api.getAppState();
        return { x: (e.x + 2 + s.scrollX) * s.zoom.value + s.offsetLeft, y: (e.y + e.height / 2 + s.scrollY) * s.zoom.value + s.offsetTop };
      }, target.id);
      await page.mouse.move(point.x, point.y); await page.mouse.down();
      await page.mouse.move(point.x + 45, point.y + 25, { steps: 12 }); await page.mouse.up();
      const after = await page.evaluate(() => window.api.getSceneElements());
      const original = before.find(e => e.id === target.id), moved = after.find(e => e.id === target.id);
      const dx = moved.x - original.x, dy = moved.y - original.y;
      assert(Math.abs(dx) > 1, 'drag did not move the target');
      for (const id of movingIds) {
        const a = after.find(e => e.id === id), b = before.find(e => e.id === id);
        assert(Math.abs((a.x - b.x) - dx) < .1 && Math.abs((a.y - b.y) - dy) < .1, 'group member detached during drag');
      }
      for (const id of stationaryIds) {
        const a = after.find(e => e.id === id), b = before.find(e => e.id === id);
        assert.equal(a.x, b.x, 'unrelated element moved horizontally during drag');
        assert.equal(a.y, b.y, 'unrelated element moved vertically during drag');
      }
      for (const arrow of after.filter(e => e.type === 'arrow')) for (const binding of [arrow.startBinding, arrow.endBinding]) {
        if (binding) assert(after.some(e => e.id === binding.elementId), 'dangling arrow binding');
      }
    }
    await dragGroup(worker, worker.groupIds[0], null);
    await page.screenshot({ path: path.join(out, 'worker-drag.png') });
    await dragGroup(shape, shape.groupIds.find(g => g !== worker.groupIds[0]), worker.groupIds[0]);
    await page.screenshot({ path: path.join(out, 'operator-drag.png') });
    const legendGroup = 'plan-view-metric-legend';
    const legend = result.scene.elements.filter(element => element.groupIds.includes(legendGroup));
    if (palette.positiveStops) {
      assert.equal(legend.filter(element => element.type === 'rectangle').length, palette.positiveStops.length + 1);
      assert.equal(legend.filter(element => element.type === 'text').length, palette.positiveStops.length + 1);
      await dragGroup(legend.find(element => element.type === 'rectangle'), legendGroup, null, legend.map(element => element.id),
        result.scene.elements.filter(element => !element.groupIds.includes(legendGroup)).map(element => element.id));
      await page.screenshot({ path: path.join(out, 'legend-drag.png') });
    }
    assert.deepEqual(errors, []);
    const report = { palette: palette.id, browserApiParity: true, missingMetrics: true, zeroAndTinyPositive: true,
      workerDrag: true, operatorDrag: true, legendDrag: palette.positiveStops ? true : null, pageErrors: errors };
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
