import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';
import { COLORS } from '../../constants';

describe('ExcalidrawGenerator - BoundedWindowAggExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should render BoundedWindowAggExec, not WindowAggExec or unimplemented', () => {
    const node = NodeBuilder.createNodeWithChildren('BoundedWindowAggExec', [], 0, {
      wdw: '[sum(val): Field { name: "sum" }, frame: WindowFrame { units: Rows }]',
      mode: 'Sorted',
    });

    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);

    TestHelpers.assertHasOperator(result, 'BoundedWindowAggExec');
    expect(texts).not.toContain('WindowAggExec');
    expect(texts).not.toContain('unimplemented');
  });

  it('should render mode in purple', () => {
    const node = NodeBuilder.createNodeWithChildren('BoundedWindowAggExec', [], 0, {
      wdw: '[sum(val): Field { name: "sum" }]',
      mode: '[Sorted]',
    });

    const result = generator.generate(node);
    const modeText = TestHelpers.getTextElements(result.elements).find((t) =>
      t.text.includes('mode=Sorted')
    );
    expect(modeText).toBeDefined();
    expect(modeText?.strokeColor).toBe(COLORS.PURPLE_MODE);
  });

  it('should pass through child arrows', () => {
    const windowNode = NodeBuilder.createNodeWithChildren(
      'BoundedWindowAggExec',
      [
        NodeBuilder.createDataSourceExec({
          file_groups: '2 groups: [[t1.parquet], [t2.parquet]]',
          projection: '[user_id, val]',
        }),
      ],
      0,
      {
        wdw: '[sum(val): Field { name: "sum" }]',
        mode: 'Sorted',
      }
    );
    const node = NodeBuilder.createProjectionExec('[user_id, val, sum]', [windowNode]);

    const result = generator.generate(node);
    // 2 file-group arrows + 2 into Window + 2 into Projection
    TestHelpers.assertHasArrows(result, 6);
  });
});
