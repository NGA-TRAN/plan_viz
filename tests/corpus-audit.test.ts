const { snapshotSections, validateScene } = require('../scripts/audit-corpus.cjs');

describe('external corpus scope', () => {
  it('excludes worker plans even when they contain ordinary single-node operators', () => {
    expect(snapshotSections('sample@worker_plan.snap', 'MeadowScanExec: file_groups={1 group: [[a]]}')[0].excluded).toBe('distributed');
  });

  it('splits mixed snapshots and preserves the original two-space indentation', () => {
    const sections = snapshotSections('mixed.snap', [
      '---', 'expression: snapshot', '---', '## Single node', '### Physical plan',
      'BudgetGuardExec(rows=10): HashJoinExec: mode=Partitioned',
      '  MeadowScanExec: file_groups={1 group: [[a]]}',
      '  BufferExec: capacity=_',
      '    MeadowScanExec: file_groups={1 group: [[b]]}',
      '## Distributed', 'ProjectionExec: expr=[a]', '  MeadowScanExec',
      '## Results', '+---+', '| a |',
    ].join('\n'));
    expect(sections.map((s: { excluded?: string }) => s.excluded)).toEqual([undefined, 'distributed', 'output']);
    expect(sections[0].text.split('\n')[3]).toBe('    MeadowScanExec: file_groups={1 group: [[b]]}');
  });

  it('does not exclude a quoted mention of a distributed operator', () => {
    expect(snapshotSections('sample.snap', 'MeadowExec: note="DistributedExec: [Stage 1]"')[0].excluded).toBeUndefined();
  });

  it('rejects invalid geometry in the report', () => {
    expect(validateScene({ elements: [{ id: 'x', type: 'ellipse', x: 0, y: 0, width: -2, height: 30 }] })).toContain('invalid geometry: ellipse');
  });
});
