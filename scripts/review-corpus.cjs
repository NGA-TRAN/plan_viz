#!/usr/bin/env node
// Source repositories are read only; artifacts go into --output.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process');
const { ConverterService } = require('../dist');
const { planSections } = require('../dist/parsers/plan-document.parser');
const { validateScene } = require('./audit-corpus.cjs');
function dedent(text) {
  const lines = text.replace(/^\n|\n\s*$/g, '').split('\n');
  const n = Math.min(...lines.filter(l => l.trim()).map(l => l.length - l.trimStart().length));
  return lines.map(l => l.slice(n)).join('\n');
}
function rustStrings(text) {
  const result = [], start = /@(?:r(#+)?)?"|(?<!\w)r(#+)?"/g;
  let match;
  while ((match = start.exec(text))) {
    const raw = match[0].includes('r'), hashes = match[1] || match[2] || '';
    let end = start.lastIndex;
    if (raw) end = text.indexOf('"' + hashes, end);
    else while (end < text.length) {
      if (text[end] === '\\') end += 2;
      else if (text[end] === '"') break;
      else end++;
    }
    if (end < 0) continue;
    let value = text.slice(start.lastIndex, end);
    if (!raw) value = value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    result.push({ title: 'line ' + text.slice(0, match.index).split('\n').length, text: dedent(value) });
    start.lastIndex = end + 1 + hashes.length;
  }
  return result;
}
function candidates(file, text) {
  if (/\.(snap|sql)$/.test(file)) return planSections(text);
  if (file.endsWith('.rs')) return rustStrings(text);
  if (/\.(md|rst)$/.test(file)) return [...text.matchAll(/\x60{3}[^\n]*\n([\s\S]*?)\x60{3}/g)].map(m =>
    ({ title: 'line ' + text.slice(0, m.index).split('\n').length, text: dedent(m[1]) }));
  return [];
}
function physical(text) {
  if (/^\s*[A-Za-z_]\w*Exec::/.test(text)) return false;
  return /^(?:┌─+[ ]*(?:Distributed\w*Exec|Stage)|[A-Za-z_]\w*Exec\b|SortMergeJoin\b|\[Stage \d+\]\s*=>)/.test(text.trim()) ||
    /^\s*\|\s*(?:physical_plan|Plan with (?:Full )?Metrics)\s*\|/m.test(text);
}
function walk(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(e => {
    if (['.git', 'target', 'node_modules', '.venv'].includes(e.name)) return [];
    const file = path.join(root, e.name);
    return e.isDirectory() ? walk(file) : /\.(rs|snap|sql|md|rst)$/.test(file) ? [file] : [];
  }).sort();
}
function git(root, args) {
  try { return cp.execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
}
function writeGallery(out, manifest) {
  const data = JSON.stringify(manifest).replace(/</g, '\\u003c');
  const html = [
    '<!doctype html><meta charset="utf-8"><title>EXPLAIN corpus review</title>',
    '<style>body{font:15px system-ui;margin:24px;background:#f5f7fb;color:#18212d}select,input,button,a{margin:5px;padding:7px}#viewport{overflow:auto;height:72vh;background:white;border:1px solid #ccc}img{display:block}pre{white-space:pre-wrap;background:white;padding:12px}</style>',
    '<h1>EXPLAIN corpus review</h1><p><a href="contact-sheets/index.html">Thumbnail overview</a><a href="review-notes.md">Review findings</a></p><p id="totals"></p><label>Search <input id="filter" placeholder="Source, path, kind or status"></label><select id="cases"></select>',
    '<button id="fit">Fit width</button><input id="zoom" type="range" min="5" max="200" value="100"><a id="scene">Editable Excalidraw</a><a id="png">PNG</a><a id="source">Source plan</a>',
    '<p id="status"></p><div id="viewport"><img id="image"></div><details><summary>Diagnostics and provenance</summary><pre id="details"></pre></details>',
    '<script>const manifest=' + data + ', $=id=>document.getElementById(id),img=$("image");',
    '$("totals").textContent=JSON.stringify(manifest.totals);const cases=manifest.cases.filter(c=>c.status!=="excluded");',
    'function select(){const c=cases.find(c=>c.id===$("cases").value);if(!c)return;$("status").textContent=c.id+" — "+c.status;$("details").textContent=JSON.stringify(c,null,2);for(const [id,key] of [["scene","scene"],["png","png"],["source","input"]]){$(id).hidden=!c[key];$(id).href=c[key]||"#";}img.hidden=!c.png;if(c.png)img.src=c.png;else img.removeAttribute("src");}',
    'function options(){const q=$("filter").value.toLowerCase();$("cases").replaceChildren(...cases.filter(c=>(c.id+" "+c.status+" "+(c.kind||"")).toLowerCase().includes(q)).map(c=>new Option(c.id+" ["+c.status+"]",c.id)));select();}',
    'function zoom(){img.style.width=img.naturalWidth*Number($("zoom").value)/100+"px";}function fit(){$("zoom").value=Math.max(5,Math.min(200,Math.floor(($("viewport").clientWidth-20)/img.naturalWidth*100)));zoom();}',
    '$("filter").oninput=options;$("cases").onchange=select;$("zoom").oninput=zoom;$("fit").onclick=fit;img.onload=fit;options();const requested=new URLSearchParams(location.search).get("case");if(cases.some(c=>c.id===requested)){$("cases").value=requested;select();}</script>',
  ].join('\n');
  fs.writeFileSync(path.join(out, 'index.html'), html);
}
async function exportScenes(out, manifest) {
  const { chromium } = require('playwright');
  const bundled = await require('esbuild').build({ entryPoints: [require.resolve('@excalidraw/utils')], bundle: true,
    write: false, format: 'iife', globalName: 'ExcalidrawUtils', platform: 'browser', logLevel: 'silent' });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({ content: bundled.outputFiles[0].text });
    let n = 0;
    for (const item of manifest.cases.filter(c => c.scene && !c.export?.allLabelsExported)) {
      try {
        const scene = JSON.parse(fs.readFileSync(path.join(out, item.scene), 'utf8'));
        const result = await page.evaluate(async scene => {
          const drawn = [], original = CanvasRenderingContext2D.prototype.fillText;
          CanvasRenderingContext2D.prototype.fillText = function(t, ...args) { drawn.push(t); return original.call(this, t, ...args); };
          try {
            const canvas = await ExcalidrawUtils.exportToCanvas({ data: scene, config: { maxWidthOrHeight: 12000 } });
            if (!canvas.width || !canvas.height) throw new Error('Empty export');
            const missing = scene.elements.filter(e => e.type === 'text').flatMap(e => e.text.split('\n')).filter(t => t && !drawn.includes(t));
            if (missing.length) throw new Error('Missing labels: ' + missing.slice(0, 3).join('; '));
            const scale = Math.min(1, 12000 / Math.max(canvas.width, canvas.height), Math.sqrt(24000000 / (canvas.width * canvas.height)));
            const preview = document.createElement('canvas'); preview.width = Math.ceil(canvas.width * scale); preview.height = Math.ceil(canvas.height * scale);
            preview.getContext('2d').drawImage(canvas, 0, 0, preview.width, preview.height);
            const png = preview.toDataURL('image/png');
            if (!png.startsWith('data:image/png;base64,')) throw new Error('Canvas dimensions exceeded browser limits');
            return { png: png.split(',')[1], width: canvas.width, height: canvas.height, previewScale: scale };
          } finally { CanvasRenderingContext2D.prototype.fillText = original; }
        }, scene);
        item.png = item.scene.replace(/\.excalidraw$/, '.png');
        fs.writeFileSync(path.join(out, item.png), Buffer.from(result.png, 'base64'));
        item.export = { width: result.width, height: result.height, previewScale: result.previewScale, allLabelsExported: true };
      } catch (error) { item.exportError = error.message; item.status = 'needs-fix'; }
      if (++n % 25 === 0) console.log('Exported ' + n + ' scenes');
    }
  } finally { await browser.close(); }
}
async function main() {
  const args = process.argv.slice(2), value = key => args[args.indexOf(key) + 1];
  if (!args.includes('--output')) throw new Error('Usage: node scripts/review-corpus.cjs --upstream <checkout> --connector <snapshots> --output <directory> [--render]');
  const out = path.resolve(value('--output')); fs.mkdirSync(out, { recursive: true });
  const previousPath = path.join(out, 'manifest.json');
  const previous = fs.existsSync(previousPath) ? JSON.parse(fs.readFileSync(previousPath, 'utf8')) : { cases: [] };
  const oldCases = new Map(previous.cases.map(c => [c.id, c]));
  const manifest = { createdAt: new Date().toISOString(), converterRevision: git(process.cwd(), ['rev-parse', 'HEAD']),
    converterChanges: git(process.cwd(), ['status', '--short']), sources: [], cases: [], totals: {} };
  for (const name of ['upstream', 'connector', 'fixtures', 'runtime']) {
    if (!args.includes('--' + name)) continue;
    const root = path.resolve(value('--' + name)), files = walk(root);
    manifest.sources.push({ name, root, revision: git(root, ['rev-parse', 'HEAD']), changes: git(root, ['status', '--short', '--', root]), filesScanned: files.length });
    for (const file of files) {
      const raw = fs.readFileSync(file, 'utf8'), relative = path.relative(root, file);
      const sections = candidates(file, raw);
      for (const [index, section] of sections.entries()) {
        const id = name + '/' + relative + '#' + (index + 1);
        const item = { id, source: name, file: relative, section: section.title, sourceHash: crypto.createHash('sha256').update(raw).digest('hex'),
          status: 'excluded', reason: 'Not a physical plan' };
        manifest.cases.push(item);
        if (!physical(section.text)) continue;
        delete item.reason;
        if (/\.(md|rst)$/.test(file) && /[┌▲]/.test(section.text) && !/┌─+ DistributedExec/.test(section.text)) {
          item.status = 'unsupported'; item.reason = 'Illustrative diagram, not a complete indented physical plan.';
          continue;
        }
        const base = name + '/' + relative + '.section-' + (index + 1);
        fs.mkdirSync(path.dirname(path.join(out, base)), { recursive: true });
        item.input = base + '.txt'; fs.writeFileSync(path.join(out, item.input), section.text);
        try {
          const result = new ConverterService().convertDetailed(section.text);
          item.kind = result.document.kind; item.diagnostics = result.diagnostics;
          item.scene = base + '.excalidraw';
          const sceneText = JSON.stringify(result.scene, null, 2);
          item.sceneHash = crypto.createHash('sha256').update(sceneText).digest('hex');
          const old = oldCases.get(id);
          if (old?.sceneHash === item.sceneHash && old.png && fs.existsSync(path.join(out, old.png))) {
            item.png = old.png; item.export = old.export;
          }
          fs.writeFileSync(path.join(out, item.scene), sceneText);
          item.geometryErrors = validateScene(result.scene);
          item.status = item.geometryErrors.length ? 'needs-fix' : result.diagnostics.length ? 'rendered-partial' : 'rendered';
          item.visualReview = old?.sceneHash === item.sceneHash ? old.visualReview : 'pending';
        } catch (error) { item.status = 'failed'; item.reason = error.message; }
      }
      if (/\.rs$/.test(file) && /explain|display_plan_ascii/i.test(raw) && !sections.some(s => physical(s.text))) {
        manifest.cases.push({ id: name + '/' + relative + '#runtime', source: name, file: relative, status: 'unavailable',
          reason: 'References EXPLAIN/display code but has no stored physical-plan literal; review local harness before capture.' });
      }
    }
  }
  const save = () => {
    manifest.totals = {};
    for (const c of manifest.cases) { const key = c.source + ':' + c.status; manifest.totals[key] = (manifest.totals[key] || 0) + 1; }
    fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2)); writeGallery(out, manifest);
  };
  save();
  if (args.includes('--render')) { await exportScenes(out, manifest); save(); }
  console.log(JSON.stringify(manifest.totals, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { candidates, physical, dedent, rustStrings, exportScenes, writeGallery };
