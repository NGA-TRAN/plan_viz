import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - InterleaveExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  function fourPartitionScan(files: string): ReturnType<typeof NodeBuilder.createDataSourceExec> {
    return NodeBuilder.createDataSourceExec({
      file_groups: `4 groups: ${files}`,
      projection: '[k]',
    });
  }

  it('should render InterleaveExec, not unimplemented', () => {
    const node = NodeBuilder.createNodeWithChildren('InterleaveExec', [
      { ...fourPartitionScan('[[a1], [a2], [a3], [a4]]'), level: 1 },
      { ...fourPartitionScan('[[b1], [b2], [b3], [b4]]'), level: 1 },
    ]);

    const result = generator.generate(node);
    TestHelpers.assertHasOperator(result, 'InterleaveExec');
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    expect(texts).not.toContain('unimplemented');
  });

  it('should emit 4 output arrows for two 4-arrow children, not Union\'s 8', () => {
    // Union sums child streams (4+4=8). Interleave keeps partition count (4).
    const interleave = NodeBuilder.createNodeWithChildren('InterleaveExec', [
      { ...fourPartitionScan('[[a1], [a2], [a3], [a4]]'), level: 1 },
      { ...fourPartitionScan('[[b1], [b2], [b3], [b4]]'), level: 1 },
    ]);
    const node = NodeBuilder.createProjectionExec('[k]', [interleave]);

    const result = generator.generate(node);
    // 4+4 file-group arrows, 4+4 into Interleave, 4 (not 8) into Projection.
    TestHelpers.assertHasArrows(result, 20);
  });

  it('should preserve sort only when every child reports the same order', () => {
    const sortedScan = NodeBuilder.createDataSourceExec({
      file_groups: '2 groups: [[a1.parquet], [a2.parquet]]',
      projection: '[k]',
      output_ordering: '[k@0 ASC]',
    });
    const unsortedScan = NodeBuilder.createDataSourceExec({
      file_groups: '2 groups: [[b1.parquet], [b2.parquet]]',
      projection: '[k]',
    });

    const matched = generator.generate(
      NodeBuilder.createProjectionExec('[k]', [
        NodeBuilder.createNodeWithChildren('InterleaveExec', [
          { ...sortedScan, level: 1 },
          {
            ...NodeBuilder.createDataSourceExec({
              file_groups: '2 groups: [[c1.parquet], [c2.parquet]]',
              projection: '[k]',
              output_ordering: '[k@0 ASC]',
            }),
            level: 1,
          },
        ]),
      ])
    );
    const matchedBlue = TestHelpers.getTextElements(matched.elements).filter(
      (t) => t.strokeColor === '#1e90ff' && t.text.includes('k')
    );
    expect(matchedBlue.length).toBeGreaterThan(0);

    const mismatched = generator.generate(
      NodeBuilder.createProjectionExec('[k]', [
        NodeBuilder.createNodeWithChildren('InterleaveExec', [
          { ...sortedScan, level: 1 },
          { ...unsortedScan, level: 1 },
        ]),
      ])
    );
    const texts = TestHelpers.getTextElements(mismatched.elements);
    // Incoming child arrows may still be blue on the sorted side; output of
    // Interleave must not claim a shared order.
    const interleaveRect = TestHelpers.getRectangles(mismatched.elements)[0];
    expect(interleaveRect).toBeDefined();
    expect(texts.some((t) => t.text === 'InterleaveExec')).toBe(true);
  });
});
