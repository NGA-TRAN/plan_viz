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

  it.each([true, false])('detects rendered multiline overflow even with an understated text height (bound=%s)', bound => {
    const detail = { id: 'detail', type: 'text', x: 10, y: 40, width: 280, height: 35,
      text: 'one\ntwo\nthree', originalText: 'one\ntwo\nthree', fontSize: 14, lineHeight: 1.25,
      groupIds: ['operator'], containerId: bound ? 'box' : null };
    const box = { id: 'box', type: 'rectangle', x: 0, y: 0, width: 300, height: 80,
      groupIds: ['operator'], boundElements: [{ id: 'title', type: 'text' }, ...(bound ? [{ id: 'detail', type: 'text' }] : [])] };
    const title = { ...detail, id: 'title', y: 5, height: 25, text: 'SortExec', originalText: 'SortExec', containerId: 'box' };
    const scene = { elements: [box, title, detail] };
    expect(validateScene(scene)).toContain((bound ? 'bound label outside container: ' : 'label crosses operator panel: ') + detail.text);
    expect(validateScene({ elements: [{ ...box, height: 100 }, title, detail] })).toEqual([]);
  });
});
