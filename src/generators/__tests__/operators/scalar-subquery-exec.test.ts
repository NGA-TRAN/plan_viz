import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';
import { ExcalidrawArrow } from '../../../types/excalidraw.types';
import { assertTextBindings } from '../utils/text-binding-assertions';

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

  it('keeps partitioned scalar inputs attached within both edges of the parent', () => {
    const inputs = ['main', 'left_scalar', 'right_scalar'].map((name) =>
      NodeBuilder.createDataSourceExec({
        file_groups: `2 groups: [[${name}_a.parquet], [${name}_b.parquet]]`,
        projection: '[id]',
      })
    );
    const result = generator.generate(NodeBuilder.createNodeWithChildren('ScalarSubqueryExec', inputs));
    const title = TestHelpers.findElementByText(result.elements, 'ScalarSubqueryExec')!;
    const parent = result.elements.find((element) => element.id === title.containerId)!;
    const children = TestHelpers.getTextElements(result.elements)
      .filter((text) => text.text === 'DataSourceExec')
      .map((text) => text.containerId);
    const connections = result.elements.filter((element): element is ExcalidrawArrow =>
      element.type === 'arrow' && element.endBinding?.elementId === parent.id
    );
    expect(connections).toHaveLength(6);
    for (const child of children) {
      const bundle = connections.filter((arrow) => arrow.startBinding?.elementId === child);
      expect(bundle).toHaveLength(2);
      expect(bundle[0].points[1][0]).toBeCloseTo(bundle[1].points[1][0], 5);
    }
    const endpoints = connections.map((arrow) => arrow.x + arrow.points[arrow.points.length - 1][0]);
    expect(Math.min(...endpoints)).toBeCloseTo(parent.x, 5);
    expect(Math.max(...endpoints)).toBeCloseTo(parent.x + parent.width, 5);
    expect(TestHelpers.findElementByText(result.elements, 'subqueries=2')).toBeDefined();
    assertTextBindings(result.elements);
  });
});
