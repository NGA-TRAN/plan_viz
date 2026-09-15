/**
 * Convert a DataFusion sqllogictest EXPLAIN snapshot into a plan-viz fixture.
 * Usage: npx tsx scripts/import-datafusion-slt.ts <slt> <tests/name.sql> [match]
 * Optional `match` picks the EXPLAIN whose SQL or physical plan contains that text.
 */
import * as fs from 'fs';
import * as path from 'path';
import { convertPlanToExcalidraw } from '../src/index';

function shortenPaths(text: string): string {
  return text.replace(
    /WORKSPACE_ROOT\/(?:datafusion\/sqllogictest\/test_files\/tpch\/data|testing\/data\/csv|datafusion\/core\/tests\/data\/recursive_cte)\//g,
    ''
  );
}

function sltPhysicalPlanToIndent(physicalBlock: string): string[] {
  return physicalBlock
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => /^\d+\)/.test(line))
    .map((line) => {
      const body = line.replace(/^\d+\)/, '');
      const dashes = (body.match(/^-+/) || [''])[0].length;
      const level = Math.floor(dashes / 2);
      const operator = body.replace(/^-+/, '');
      return '  '.repeat(level) + shortenPaths(operator);
    });
}

function scopeToMatch(content: string, match?: string): string {
  if (!match) {
    return content;
  }
  const idx = content.indexOf(match);
  if (idx < 0) {
    throw new Error(`Could not find match text: ${match}`);
  }
  const start = content.lastIndexOf('query TT', idx);
  if (start < 0) {
    throw new Error(`Could not find query TT before match: ${match}`);
  }
  return content.slice(start);
}

function extractSltExplain(content: string, match?: string): { sql: string; physical: string[] } {
  const scoped = scopeToMatch(content, match);
  const queryMatch = scoped.match(/query TT\s+explain\s+([\s\S]*?)\n----/i);
  if (!queryMatch) {
    throw new Error('Could not find `explain ... ----` block');
  }
  const physicalMatch = scoped.match(
    /\nphysical_plan\n([\s\S]*?)(?:\n(?:logical_plan|query |statement |include |#)|$)/
  );
  if (!physicalMatch) {
    throw new Error('Could not find physical_plan block');
  }
  return {
    sql: queryMatch[1].trim(),
    physical: sltPhysicalPlanToIndent(physicalMatch[1]),
  };
}

function toExplainTable(sql: string, physical: string[]): string {
  const rows = physical.map((line, i) => ({
    type: i === 0 ? 'physical_plan' : '',
    plan: i === 0 ? line : ` ${line}`,
  }));
  const typeWidth = Math.max('plan_type'.length, ...rows.map((r) => r.type.length));
  const planWidth = Math.max('plan'.length, ...rows.map((r) => r.plan.length));
  const rule = `+-${'-'.repeat(typeWidth)}-+-${'-'.repeat(planWidth)}-+`;
  const cell = (text: string, width: number) => text.padEnd(width, ' ');
  const header = `| ${cell('plan_type', typeWidth)} | ${cell('plan', planWidth)} |`;
  const body = rows
    .map((row) => `| ${cell(row.type, typeWidth)} | ${cell(row.plan, planWidth)} |`)
    .join('\n');
  return ['EXPLAIN', sql.replace(/;\s*$/, ''), ';', rule, header, rule, body, rule, ''].join('\n');
}

const [, , sltPath, sqlOut, match] = process.argv;
if (!sltPath || !sqlOut) {
  console.error('Usage: npx tsx scripts/import-datafusion-slt.ts <slt> <tests/name.sql> [match]');
  process.exit(1);
}

const extracted = extractSltExplain(fs.readFileSync(sltPath, 'utf8'), match);
let sourceRel = sltPath;
const datafusionRoot = sltPath.indexOf('arrow-datafusion/');
if (datafusionRoot >= 0) {
  sourceRel = sltPath.slice(datafusionRoot + 'arrow-datafusion/'.length);
}
const fixture =
  `-- Source: Apache DataFusion ${sourceRel}\n` + toExplainTable(extracted.sql, extracted.physical);
fs.mkdirSync(path.dirname(sqlOut), { recursive: true });
fs.writeFileSync(sqlOut, fixture);

const goldenPath = path.join(
  path.dirname(sqlOut),
  'expected',
  `${path.basename(sqlOut, '.sql')}.excalidraw`
);
fs.mkdirSync(path.dirname(goldenPath), { recursive: true });
fs.writeFileSync(goldenPath, JSON.stringify(convertPlanToExcalidraw(fixture), null, 2) + '\n');
console.log(`wrote ${sqlOut}`);
console.log(`wrote ${goldenPath} (${extracted.physical.length} operators)`);
