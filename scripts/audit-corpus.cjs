#!/usr/bin/env node
// Read-only external corpus audit. Run npm run build before invoking this script.
const fs = require('node:fs');
const path = require('node:path');

function snapshotSections(relativePath, raw) {
  const close = raw.startsWith('---\n') ? raw.indexOf('\n---\n', 4) : -1;
  const header = close >= 0 ? raw.slice(0, close) : '';
  const body = close >= 0 ? raw.slice(close + 5) : raw;
  const sections = [];
  let h2 = '', h3 = '', lines = [];
  const flush = () => {
    const text = lines.join('\n').trim();
    if (text) sections.push({ heading: [h2, h3].filter(Boolean).join(' / '), text });
    lines = [];
  };
  for (const line of body.split('\n')) {
    const heading = line.match(/^(##|###)\s+(.+)$/);
    if (heading) {
      flush();
      if (heading[1] === '##') { h2 = heading[2]; h3 = ''; }
      else h3 = heading[2];
    } else lines.push(line);
  }
  flush();
  return sections.map(section => {
    let excluded;
    if (/@worker_plan|worker_plans?\.snapshot/.test(relativePath + ' ' + header) ||
      /distributed|worker plan|coordinator/i.test(section.heading) ||
      /^\s*(?:\[Stage\s+\d+\]|(?:Network\w*Exec|Distributed\w*Exec)\b|┌────)/m.test(section.text)) {
      excluded = 'distributed';
    } else if (!/^(?:[A-Za-z_]\w*Exec\b|SortMergeJoin\b)/.test(section.text)) {
      excluded = /^[A-Za-z]+:|^Union\b/.test(section.text) ? 'logical-or-other-plan' : 'output';
    }
    return { id: relativePath + (section.heading ? ' / ' + section.heading : ''), ...section, excluded };
  });
}

function validateScene(scene) {
  const errors = [];
  const byId = new Map(scene.elements.map(e => [e.id, e]));
  const panels = [];
  for (const e of scene.elements) {
    if (![e.x, e.y, e.width, e.height].every(Number.isFinite) ||
      e.width < 0 || e.height < 0 || (e.type !== 'arrow' && (!e.width || !e.height))) errors.push('invalid geometry: ' + e.type);
    if (e.type !== 'text') continue;
    if (e.text === 'unimplemented') errors.push('unimplemented label');
    if (e.originalText !== e.text) errors.push('restoration text differs');
    if (e.containerId) {
      const container = byId.get(e.containerId);
      if (!container?.boundElements?.some(b => b.type === 'text' && b.id === e.id)) errors.push('missing reciprocal text binding');
      if (container?.type === 'rectangle') panels.push(container);
      if (container && (e.x < container.x - 1 || e.y < container.y - 1 ||
          e.x + e.width > container.x + container.width + 1 || e.y + e.height > container.y + container.height + 1)) {
        errors.push('bound label outside container: ' + e.text);
      }
    }
  }
  for (let i = 0; i < panels.length; i++) for (let j = i + 1; j < panels.length; j++) {
    const a = panels[i], b = panels[j];
    if (Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 &&
        Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1) errors.push('intersecting operator panels');
  }
  for (const text of scene.elements.filter(e => e.type === 'text' && !e.containerId)) {
    for (const box of panels) {
      const overlapX = Math.min(text.x + text.width, box.x + box.width) - Math.max(text.x, box.x);
      const overlapY = Math.min(text.y + text.height, box.y + box.height) - Math.max(text.y, box.y);
      const owned = text.groupIds.some(group => box.groupIds.includes(group));
      const contained = text.x >= box.x - 1 && text.y >= box.y - 1 &&
        text.x + text.width <= box.x + box.width + 1 && text.y + text.height <= box.y + box.height + 1;
      if (overlapX > 1 && overlapY > 1 && !(owned && contained)) errors.push('label crosses operator panel: ' + text.text);
    }
  }
  return [...new Set(errors)];
}

function audit(root, renderDirectory) {
  const { ExecutionPlanParser } = require('../dist/parsers/execution-plan.parser');
  const { ExcalidrawGenerator } = require('../dist/generators/excalidraw.generator');
  const { resolveOperator } = require('../dist/generators/generators/operator-resolver');
  const { textWidth } = require('../dist/generators/utils/adaptive-layout');
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith('.snap')) files.push(file);
    }
  }
  walk(root);
  if (renderDirectory) fs.mkdirSync(renderDirectory, { recursive: true });
  const cases = [], exclusions = [], families = {};
  let nodes = 0, wrappers = 0, inferred = 0, unresolved = 0;
  for (const file of files.sort()) {
    for (const section of snapshotSections(path.relative(root, file), fs.readFileSync(file, 'utf8'))) {
      if (section.excluded) { exclusions.push({ id: section.id, reason: section.excluded }); continue; }
      try {
        const tree = new ExecutionPlanParser().parse(section.text).root;
        const generator = new ExcalidrawGenerator();
        function visit(node) {
          nodes++;
          wrappers += node.wrappers?.length ?? 0;
          const resolution = resolveOperator(node, generator.nodeGeneratorRegistry);
          if (resolution.inferred) inferred++;
          if (resolution.family === 'default') unresolved++;
          families[resolution.family] = (families[resolution.family] ?? 0) + 1;
          node.children.forEach(visit);
        }
        visit(tree);
        const scene = generator.generate(tree);
        const errors = validateScene(scene);
        for (const e of scene.elements) {
          if (e.type === 'text' && Math.max(...e.text.split('\n').map(line => textWidth(line, e.fontSize))) > e.width + 10) {
            errors.push('estimated text overflow: ' + e.text);
          }
        }
        const entry = { id: section.id, elements: scene.elements.length, errors };
        if (renderDirectory) {
          entry.scene = String(cases.length + 1).padStart(3, '0') + '.excalidraw';
          fs.writeFileSync(path.join(renderDirectory, entry.scene), JSON.stringify(scene));
        }
        cases.push(entry);
      } catch (error) {
        cases.push({ id: section.id, errors: [error.message] });
      }
    }
  }
  return {
    summary: { snapshotFiles: files.length, included: cases.length,
      excluded: exclusions.reduce((counts, e) => { counts[e.reason] = (counts[e.reason] ?? 0) + 1; return counts; }, {}),
      nodes, wrappers, inferred, unresolved, families, failures: cases.filter(c => c.errors.length).length },
    cases, exclusions,
  };
}

if (require.main === module) {
  const [root, ...options] = process.argv.slice(2);
  if (!root) throw new Error('Usage: node scripts/audit-corpus.cjs SNAPSHOT_DIR [--out report.json] [--render-dir DIR]');
  const option = name => options.includes(name) ? options[options.indexOf(name) + 1] : undefined;
  const report = audit(path.resolve(root), option('--render-dir'));
  if (option('--out')) fs.writeFileSync(option('--out'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(option('--out') ? report.summary : report, null, 2));
  if (report.summary.failures) process.exitCode = 1;
}
module.exports = { snapshotSections, validateScene, audit };
