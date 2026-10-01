#!/usr/bin/env node
// Read-only inventory check against a local upstream checkout; no private paths required.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const audit = require('../docs/operators/distributed-datafusion-audit.json');
const root = process.argv[2];
if (!root) throw new Error('Usage: node scripts/audit-upstream-operators.cjs <upstream-checkout>');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : file.endsWith('.rs') ? [file] : [];
});
const actual = audit.scope.flatMap((folder) => walk(path.join(root, folder))).flatMap((file) =>
  [...fs.readFileSync(file, 'utf8').matchAll(/impl\s+ExecutionPlan\s+for\s+(\w+)/g)]
    .map((match) => ({ operator: match[1], source: path.relative(root, file).split(path.sep).join('/') })));
const key = (entry) => entry.operator + ':' + entry.source;
const missing = actual.filter((entry) => !audit.operators.some((row) => key(row) === key(entry)));
const stale = audit.operators.filter((row) => !actual.some((entry) => key(row) === key(entry)));
const revision = cp.execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const missingTests = audit.operators.filter((row) => !fs.existsSync(path.resolve(__dirname, '..', row.tests)));
console.log(JSON.stringify({ revision, auditedRevision: audit.revision, operators: actual.length, missing, stale, missingTests }, null, 2));
if (missing.length || stale.length || missingTests.length || revision !== audit.revision) process.exitCode = 1;
