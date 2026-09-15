import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';
import { ExcalidrawArrow } from '../../../types/excalidraw.types';

describe('ExcalidrawGenerator - ScalarSubqueryExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should render ScalarSubqueryExec and pass through main partitions', () => {
    const node = NodeBuilder.createNodeWithChildren(
      'ScalarSubqueryExec',
      [
        NodeBuilder.createDataSourceExec({
          file_groups: '2 groups: [[a.parquet], [b.parquet]]',
          projection: '[id]',
        }),
        NodeBuilder.createNodeWithChildren('PlaceholderRowExec', []),
      ],
      0,
      { subqueries: '1' }
    );
    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    TestHelpers.assertHasOperator(result, 'ScalarSubqueryExec');
    expect(texts.some((text) => text.includes('subqueries=1'))).toBe(true);
    expect(texts).not.toContain('unimplemented');
  });

  it('should throw without a main input child', () => {
    const node = NodeBuilder.createNodeWithChildren('ScalarSubqueryExec', []);
    expect(() => generator.generate(node)).toThrow(/at least one child/);
  });

  it('should space children by subtree width so wide inputs do not overlap', () => {
    const join = (suffix: string): ReturnType<typeof NodeBuilder.createHashJoinExec> =>
      NodeBuilder.createHashJoinExec(
        { mode: 'Partitioned', join_type: 'Inner', on: '[(a@0, b@0)]' },
        [
          NodeBuilder.createDataSourceExec({
            file_groups: `1 group: [[l${suffix}.parquet]]`,
            projection: '[id]',
          }),
          NodeBuilder.createDataSourceExec({
            file_groups: `1 group: [[r${suffix}.parquet]]`,
            projection: '[id]',
          }),
        ]
      );
    const node = NodeBuilder.createNodeWithChildren(
      'ScalarSubqueryExec',
      [join('main'), join('sub')],
      0,
      { subqueries: '1' }
    );
    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements);
    const dsRects = texts
      .filter((text) => text.text === 'DataSourceExec')
      .map((text) =>
        TestHelpers.getRectangles(result.elements).find((box) => box.id === text.containerId)
      )
      .filter((box): box is NonNullable<typeof box> => box !== undefined)
      .sort((a, b) => a.x - b.x);
    expect(dsRects.length).toBe(4);
    expect(dsRects[1].x + dsRects[1].width).toBeLessThan(dsRects[2].x);
  });

  it('should draw parallel arrows from the main DataSource', () => {
    const node = NodeBuilder.createNodeWithChildren(
      'ScalarSubqueryExec',
      [
        NodeBuilder.createDataSourceExec({
          file_groups: '2 groups: [[a.parquet], [b.parquet]]',
          projection: '[id]',
        }),
        NodeBuilder.createNodeWithChildren('PlaceholderRowExec', []),
      ],
      0,
      { subqueries: '1' }
    );
    const result = generator.generate(node);
    const boxes = TestHelpers.getRectangles(result.elements).sort((a, b) => a.y - b.y);
    const subqueryBox = boxes[0];
    const dataSourceBox = boxes.find((box) => box.y > subqueryBox.y && box.x < subqueryBox.x);
    expect(dataSourceBox).toBeDefined();
    const arrows = TestHelpers.getArrows(result.elements) as ExcalidrawArrow[];
    const fromMain = arrows.filter(
      (arrow) =>
        arrow.startBinding?.elementId === dataSourceBox!.id &&
        arrow.endBinding?.elementId === subqueryBox.id
    );
    expect(fromMain.length).toBe(2);
    const dx = fromMain.map((arrow) => arrow.points[1][0] - arrow.points[0][0]);
    expect(dx[0]).toBeCloseTo(dx[1], 5);
  });
});
