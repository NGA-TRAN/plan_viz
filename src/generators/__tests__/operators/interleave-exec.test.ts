import * as fs from 'fs';
import * as path from 'path';
import { ConverterService } from '../../../services/converter.service';
import { ExcalidrawArrow, ExcalidrawData, ExcalidrawElement, ExcalidrawText } from '../../../types/excalidraw.types';
import { arrowEndpoint } from '../../utils/arrow-binding';
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

  function operatorBox(scene: ExcalidrawData, operator: string): ExcalidrawElement {
    const title = TestHelpers.findElementByText(scene.elements, operator);
    const rectangle = scene.elements.find((element) => element.id === title?.containerId);
    if (!rectangle || rectangle.type !== 'rectangle') throw new Error('Missing box: ' + operator);
    return rectangle;
  }

  function incomingArrows(scene: ExcalidrawData, operator: string): ExcalidrawArrow[] {
    const rectangle = operatorBox(scene, operator);
    return scene.elements.filter((element): element is ExcalidrawArrow =>
      element.type === 'arrow' && element.endBinding?.elementId === rectangle.id
    );
  }

  // Scope assertions to the actual edge band; sorted child labels must not make
  // an incorrect Interleave output appear to pass.
  function incomingLabels(scene: ExcalidrawData, operator: string): ExcalidrawText[] {
    const rectangle = operatorBox(scene, operator);
    const arrows = incomingArrows(scene, operator);
    expect(arrows.length).toBeGreaterThan(0);
    const childTop = Math.min(...arrows.map((arrow) => arrowEndpoint(arrow, 'start').y));
    return TestHelpers.getTextElements(scene.elements).filter((text) =>
      !text.containerId && text.y > rectangle.y + rectangle.height && text.y + text.height < childTop
    );
  }

  function fixture(name: string): ExcalidrawData {
    return new ConverterService().convert(fs.readFileSync(
      path.join(__dirname, '../../../../tests', name + '.sql'), 'utf8'
    ));
  }

  it.each([
    ['both inputs sorted', true, true, '#1e90ff'],
    ['second input unsorted', true, false, '#1e1e1e'],
    ['first input unsorted', false, true, '#1e1e1e'],
  ])('checks the outgoing order when %s', (_name, leftSorted, rightSorted, expectedColor) => {
    const scan = (sorted: boolean, name: string): ReturnType<typeof fourPartitionScan> =>
      NodeBuilder.createDataSourceExec({
        file_groups: `2 groups: [[${name}1.parquet], [${name}2.parquet]]`,
        projection: '[k]',
        ...(sorted ? { output_ordering: '[k@0 ASC]' } : {}),
      });
    const scene = generator.generate(NodeBuilder.createProjectionExec('[k]', [
      NodeBuilder.createNodeWithChildren('InterleaveExec', [
        { ...scan(leftSorted, 'a'), level: 1 }, { ...scan(rightSorted, 'b'), level: 1 },
      ]),
    ]));
    const interleave = operatorBox(scene, 'InterleaveExec');
    const output = incomingArrows(scene, 'ProjectionExec');
    expect(output).toHaveLength(2);
    expect(output.every((arrow) => arrow.startBinding?.elementId === interleave.id)).toBe(true);
    expect(incomingLabels(scene, 'ProjectionExec').map((text) => [text.text, text.strokeColor]))
      .toEqual([['k', expectedColor]]);
    expect(incomingLabels(scene, 'InterleaveExec').map((text) => text.strokeColor))
      .toEqual([leftSorted ? '#1e90ff' : '#1e1e1e', rightSorted ? '#1e90ff' : '#1e1e1e']);
  });

  it('does not claim shared ordering when the same keys appear in a different order', () => {
    const scene = fixture('interleave_mismatched_ordering');
    expect(incomingLabels(scene, 'InterleaveExec').map((text) => [text.text, text.strokeColor]))
      .toEqual([['a, b', '#1e90ff'], ['a, b', '#1e90ff']]);
    expect(incomingLabels(scene, 'ProjectionExec').map((text) => [text.text, text.strokeColor]))
      .toEqual([['a, b', '#1e1e1e']]);
  });

  it('keeps ordered and unordered column groups distinct on inputs and output', () => {
    const scene = fixture('interleave_mixed_ordering');
    const groups = [['a', '#1e90ff'], [', b, c', '#1e1e1e'], [', d', '#1e90ff']];
    const inputs = incomingLabels(scene, 'InterleaveExec');
    expect(inputs.map((text) => [text.text, text.strokeColor])).toEqual([...groups, ...groups]);
    expect(incomingLabels(scene, 'ProjectionExec').map((text) => [text.text, text.strokeColor]))
      .toEqual(groups);
    for (let start = 0; start < inputs.length; start += groups.length) {
      for (let index = start + 1; index < start + groups.length; index++) {
        expect(inputs[index].x).toBeCloseTo(inputs[index - 1].x + inputs[index - 1].width);
        expect(inputs[index].groupIds).toEqual(inputs[start].groupIds);
      }
    }
    expect(incomingArrows(scene, 'InterleaveExec')).toHaveLength(4);
    expect(incomingArrows(scene, 'ProjectionExec')).toHaveLength(2);
  });

  it('centers a single-partition input and retains its output order and bindings', () => {
    const scene = fixture('interleave_single_partition');
    const interleave = operatorBox(scene, 'InterleaveExec');
    const source = operatorBox(scene, 'DataSourceExec');
    const inputs = incomingArrows(scene, 'InterleaveExec');
    expect(inputs).toHaveLength(1);
    expect(incomingArrows(scene, 'ProjectionExec')).toHaveLength(1);
    expect(inputs[0].startBinding?.elementId).toBe(source.id);
    expect(source.boundElements).toContainEqual({ id: inputs[0].id, type: 'arrow' });
    expect(interleave.boundElements).toContainEqual({ id: inputs[0].id, type: 'arrow' });
    expect(arrowEndpoint(inputs[0], 'start')).toEqual({ x: source.x + source.width / 2, y: source.y });
    expect(arrowEndpoint(inputs[0], 'end')).toEqual({
      x: interleave.x + interleave.width / 2, y: interleave.y + interleave.height,
    });
    expect(incomingLabels(scene, 'ProjectionExec').map((text) => [text.text, text.strokeColor]))
      .toEqual([['k', '#1e90ff']]);
  });
});
