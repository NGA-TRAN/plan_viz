import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';

const { classifyCandidate } = require('../scripts/review-corpus.cjs');

const plan = [
  '┌───── DistributedExec',
  '│ CoalescePartitionsExec',
  '│   [Stage 1] => NetworkCoalesceExec: output_partitions=1, input_tasks=1',
  '└──────────────────',
  '  ┌───── Stage 1 ── tasks=1, partitions=1',
  '  │ DataSourceExec: format=iceberg, planned_files=3',
  '  └──────────────────',
].join('\n');
const trailer = '\n\nTask 0 -> http://url-0/\n  day=2024-01-08/part.parquet\n+---+\n| n |\n+---+\n| 3 |\n+---+\n';

describe('review corpus input classification', () => {
  test('reports the annotated planner dialect even when ordinary operator names would parse', () => {
    for (const operator of ['RepartitionExec(Hash)', 'RepartitionExec(RoundRobinBatch)', 'SortExec']) {
      expect(classifyCandidate('planner.rs', `${operator}: task_count=TaskCountAnnotation: soft=2.67, exact=3`))
        .toMatchObject({ status: 'unsupported', inputKind: 'planner-debug' });
    }
  });

  test('does not classify quoted debug annotations or unfamiliar physical operators as debug dialect', () => {
    for (const text of ['CustomSourceExec: note="task_count=TaskCountAnnotation: soft=2"',
      'CustomSourceExec: partitions=2', plan + '\n  InvalidExec: task_count=TaskCountAnnotation: soft=2']) {
      expect(classifyCandidate('input.snap', text)).toMatchObject({ status: 'candidate', text });
    }
  });

  test('excludes assertions consisting only of stage headers, including custom metrics', () => {
    expect(classifyCandidate('headers.rs', [
      '┌───── Stage 2 ── tasks=3, partitions=3 finished_tasks={0:1, 1:1, 2:1}',
      '┌───── Stage 1 ── tasks=3, partitions=9 finished_tasks={0:1, 1:1, 2:1}',
    ].join('\n'))).toMatchObject({ status: 'excluded', inputKind: 'stage-header-fragment' });
  });

  test('passes incomplete complete-plan candidates to the converter so they remain failures', () => {
    for (const text of ['┌───── DistributedExec\n└─────',
      '┌───── Stage 1 ── tasks=1, partitions=1\n│ NumbersExec', plan + '\nunexpected text']) {
      expect(classifyCandidate('broken.snap', text)).toMatchObject({ status: 'candidate', text });
    }
  });

  test('extracts a boxed plan followed by known task/file routing logs and a result table', () => {
    expect(classifyCandidate('routing.snap', plan + trailer)).toMatchObject({
      status: 'candidate', text: plan,
      extraction: { kind: 'routing-log-trailer', startLine: 1, endLine: 7 },
    });
  });

  test.each([
    trailer + 'unexpected text',
    trailer.replace('  day=2024-01-08/part.parquet', '  unrecognized log entry'),
    trailer + '\n┌───── Stage 2 ── tasks=1, partitions=1',
    '\nTask 0 -> http://url-0/\n  part.parquet',
  ])('does not discard an unrecognized or incomplete suffix: %s', (suffix) => {
    const text = plan + suffix;
    expect(classifyCandidate('routing.snap', text)).toMatchObject({ status: 'candidate', text });
    expect(classifyCandidate('routing.snap', text).extraction).toBeUndefined();
  });

  test('keeps existing non-plan and illustrative-diagram classifications', () => {
    expect(classifyCandidate('code.rs', 'SortExec::new()')).toMatchObject({ status: 'excluded' });
    expect(classifyCandidate('guide.md', 'SortExec\n  ▲')).toMatchObject({ status: 'unsupported' });
  });
});

test('corpus CLI keeps original evidence, extracts known logs, and still reports malformed plans', () => {
  // CI runs tests before its build job; exercise the real CLI against a fresh build.
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.build.json']);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-viz-corpus-'));
  try {
    const input = path.join(root, 'input'), output = path.join(root, 'output');
    fs.mkdirSync(input);
    fs.writeFileSync(path.join(input, 'mixed.snap'), plan + trailer);
    fs.writeFileSync(path.join(input, 'broken.snap'), plan.replace('│ CoalescePartitionsExec', '│ BadOperator(') + trailer);
    fs.writeFileSync(path.join(input, 'garbage.snap'), plan + '\nunexpected text');
    fs.writeFileSync(path.join(input, 'sketch.rs'), 'assert_snapshot!(@"RepartitionExec(Hash): task_count=TaskCountAnnotation: soft=2");');
    execFileSync(process.execPath, ['scripts/review-corpus.cjs', '--fixtures', input, '--output', output]);
    const manifest = JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8'));
    expect(manifest.totals).toEqual({ 'fixtures:failed': 2, 'fixtures:rendered': 1, 'fixtures:unsupported': 1 });
    const mixed = manifest.cases.find((item: { file: string }) => item.file === 'mixed.snap');
    expect(fs.readFileSync(path.join(output, mixed.originalInput), 'utf8')).toBe((plan + trailer).trim());
    expect(fs.readFileSync(path.join(output, mixed.input), 'utf8')).toBe(plan);
    expect(mixed.extraction).toMatchObject({ startLine: 1, endLine: 7 });
    const sketch = manifest.cases.find((item: { file: string }) => item.file === 'sketch.rs');
    expect(fs.readFileSync(path.join(output, sketch.input), 'utf8')).toContain('TaskCountAnnotation');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30000);
