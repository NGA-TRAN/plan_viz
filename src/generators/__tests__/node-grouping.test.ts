import { ExcalidrawGenerator } from '../excalidraw.generator';
import { TestHelpers } from './utils/test-helpers';
import { NodeBuilder } from './builders/node.builder';
import { ExcalidrawArrow } from '../../types/excalidraw.types';

describe('Excalidraw node grouping', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('groups a node box with its title and in-box details', () => {
    const node = NodeBuilder.createFilterExec('value > 1', [
      NodeBuilder.createDataSourceExec({
        file_groups: '1 groups: [[t.parquet]]',
        projection: '[value]',
      }),
    ]);
    const result = generator.generate(node);
    const filterBox = TestHelpers.getRectangles(result.elements)[0];
    const title = TestHelpers.findElementByText(result.elements, 'FilterExec');
    const details = TestHelpers.getTextElements(result.elements).find((text) =>
      text.text.includes('value > 1')
    );
    expect(filterBox.groupIds.length).toBe(1);
    const groupId = filterBox.groupIds[0];
    expect(title?.groupIds).toContain(groupId);
    expect(details?.groupIds).toContain(groupId);

    const arrows = TestHelpers.getArrows(result.elements) as ExcalidrawArrow[];
    expect(arrows.length).toBeGreaterThan(0);
    for (const arrow of arrows) {
      expect(arrow.groupIds).not.toContain(groupId);
      expect(arrow.startBinding?.elementId).toBeDefined();
      expect(arrow.endBinding?.elementId).toBeDefined();
    }
  });

  it('groups HashJoin hash table with the join box', () => {
    const node = NodeBuilder.createHashJoinExec(
      { mode: 'CollectLeft', join_type: 'Inner', on: 'a@0 = b@0' },
      [
        NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[l.parquet]]',
          projection: '[a]',
        }),
        NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[r.parquet]]',
          projection: '[b]',
        }),
      ]
    );
    const result = generator.generate(node);
    const joinTitle = TestHelpers.findElementByText(result.elements, 'HashJoinExec: CollectLeft');
    const hashTable = TestHelpers.findElementByText(result.elements, 'HashTable');
    expect(joinTitle?.groupIds.length).toBeGreaterThan(0);
    expect(hashTable?.groupIds).toEqual(expect.arrayContaining(joinTitle!.groupIds));
    const joinBox = TestHelpers.getRectangles(result.elements).find(
      (box) => box.id === joinTitle?.containerId
    );
    expect(joinBox?.groupIds).toEqual(expect.arrayContaining(joinTitle!.groupIds));
  });

  it('groups DynamicFilter with DataSource and leaves file glyphs out', () => {
    const node = NodeBuilder.createDataSourceExec({
      file_groups: '1 groups: [[t.parquet]]',
      projection: '[value]',
      predicate: 'DynamicFilter [ empty ]',
    });
    const result = generator.generate(node);
    const title = TestHelpers.findElementByText(result.elements, 'DataSourceExec');
    const dynamicFilter = TestHelpers.findElementByText(result.elements, 'DynamicFilter');
    const fileLabel = TestHelpers.findElementByText(result.elements, 't');
    expect(title?.groupIds.length).toBe(1);
    expect(dynamicFilter?.groupIds).toContain(title!.groupIds[0]);
    expect(fileLabel?.groupIds ?? []).not.toContain(title!.groupIds[0]);
  });

  it('attaches side column labels to the child node group', () => {
    const node = NodeBuilder.createFilterExec('value > 1', [
      NodeBuilder.createDataSourceExec({
        file_groups: '1 groups: [[t.parquet]]',
        projection: '[value, f_dkey]',
      }),
    ]);
    const result = generator.generate(node);
    const dataSourceTitle = TestHelpers.findElementByText(result.elements, 'DataSourceExec');
    const labels = TestHelpers.getTextElements(result.elements).filter((text) =>
      text.text.includes('value')
    );
    const sideLabel = labels.find((text) => text.containerId === null && text.text.includes(','));
    expect(dataSourceTitle?.groupIds.length).toBe(1);
    expect(sideLabel).toBeDefined();
    expect(sideLabel?.groupIds).toContain(dataSourceTitle!.groupIds[0]);
  });

  it('attaches join side column labels to each child group', () => {
    const node = NodeBuilder.createHashJoinExec(
      { mode: 'CollectLeft', join_type: 'Inner', on: 'a@0 = b@0' },
      [
        NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[l.parquet]]',
          projection: '[a, left_extra]',
        }),
        NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[r.parquet]]',
          projection: '[b, right_extra]',
        }),
      ]
    );
    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements);
    const sources = texts.filter((text) => text.text === 'DataSourceExec');
    expect(sources).toHaveLength(2);
    const leftSource = sources.reduce((a, b) => (a.x < b.x ? a : b));
    const rightSource = sources.reduce((a, b) => (a.x > b.x ? a : b));
    const leftLabel = texts.find((text) => text.text.includes('left_extra'));
    const rightLabel = texts.find((text) => text.text.includes('right_extra'));
    expect(leftLabel?.groupIds).toContain(leftSource.groupIds[0]);
    expect(rightLabel?.groupIds).toContain(rightSource.groupIds[0]);
  });
});
