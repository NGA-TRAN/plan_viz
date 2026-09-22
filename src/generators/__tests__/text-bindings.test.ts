import { convertPlanToExcalidraw } from '../../index';
import { ExcalidrawGenerator } from '../excalidraw.generator';
import { NodeGeneratorRegistry } from '../generators/node-generator.registry';
import { NodeGeneratorStrategy } from '../generators/node-generator.strategy';
import { NodeBuilder } from './builders/node.builder';
import { assertTextBindings } from './utils/text-binding-assertions';

const leafOperators = [
  'DataSourceExec', 'EmptyExec', 'PlaceholderRowExec', 'LazyMemoryExec',
  'ValuesExec', 'ExplainExec', 'WorkTableExec', 'StreamingTableExec',
];
const unaryOperators = [
  'CoalescePartitionsExec', 'CoalesceBatchesExec', 'FilterExec', 'RepartitionExec',
  'AggregateExec', 'ProjectionExec', 'SortExec', 'SortPreservingMergeExec',
  'LocalLimitExec', 'GlobalLimitExec', 'WindowAggExec', 'BoundedWindowAggExec',
  'UnnestExec', 'AnalyzeExec', 'BufferExec', 'CooperativeExec', 'DataSinkExec',
  'FileSinkExec',
];
const binaryOperators = [
  'HashJoinExec', 'SortMergeJoin', 'SortMergeJoinExec', 'CrossJoinExec', 'UnionExec',
  'NestedLoopJoinExec', 'InterleaveExec', 'SymmetricHashJoinExec',
  'PiecewiseMergeJoinExec', 'RecursiveQueryExec', 'ScalarSubqueryExec',
];
const cases = [
  ...leafOperators.map((operator) => ({ operator, childCount: 0 })),
  ...unaryOperators.map((operator) => ({ operator, childCount: 1 })),
  ...binaryOperators.map((operator) => ({ operator, childCount: 2 })),
  { operator: 'UnknownExec', childCount: 1 },
];

describe('scene text bindings', () => {
  it('covers every registered operator and alias, plus the default fallback', () => {
    const registration = jest.spyOn(NodeGeneratorRegistry.prototype, 'register');
    try {
      new ExcalidrawGenerator();
      const registered = registration.mock.calls.map(([operator]) => operator);
      const covered = cases.map(({ operator }) =>
        operator === 'UnknownExec' ? 'default' : operator
      );
      expect(covered.sort()).toEqual(registered.sort());
    } finally {
      registration.mockRestore();
    }
  });

  it.each(cases)('binds the label of $operator', ({ operator, childCount }) => {
    const children = Array.from({ length: childCount }, () =>
      NodeBuilder.createNodeWithChildren('DataSourceExec', [], 1, {
        file_groups: '1 groups: [[data.parquet]]',
        projection: '[id]',
      })
    );
    const result = new ExcalidrawGenerator().generate(
      NodeBuilder.createNodeWithChildren(operator, children)
    );
    const titles = result.elements.filter(
      (element) => element.type === 'text' && element.text === operator
    );
    expect(titles).toHaveLength(1);
    expect(titles[0]).toMatchObject({ containerId: expect.any(String) });
    assertTextBindings(result.elements);
  });

  it('binds all four labels from issue #64 and preserves standalone details', () => {
    const result = convertPlanToExcalidraw(
      'ProjectionExec: expr=[id, name, age]\n' +
      '  FilterExec: age > 18\n' +
      '    DataSourceExec: file_groups={1 groups: [[data.parquet]]}'
    );
    const texts = result.elements.filter((element) => element.type === 'text');
    expect(texts.filter((element) => element.containerId !== null).map(
      (element) => element.text
    )).toEqual(['ProjectionExec', 'FilterExec', 'DataSourceExec', 'data']);
    expect(texts.filter((element) => element.containerId === null).map(
      (element) => element.text
    )).toEqual(['id, name, age', 'age > 18']);
    assertTextBindings(result.elements);
    const arrows = result.elements.filter((element) => element.type === 'arrow');
    expect(arrows.length).toBeGreaterThan(0);
    for (const arrow of arrows) {
      for (const binding of [arrow.startBinding, arrow.endBinding]) {
        const container = result.elements.find((element) => element.id === binding?.elementId);
        expect(container?.boundElements).toContainEqual({ id: arrow.id, type: 'arrow' });
      }
    }
  });

  it('binds DynamicFilter and file ellipse labels while keeping column labels free', () => {
    const result = convertPlanToExcalidraw(
      'FilterExec: id > 0\n' +
      '  DataSourceExec: file_groups={1 groups: [[data.parquet]]}, ' +
      'projection=[id], predicate=DynamicFilter [ empty ]'
    );
    const texts = result.elements.filter((element) => element.type === 'text');
    for (const label of ['DynamicFilter', 'data']) {
      const text = texts.find((element) => element.text === label);
      expect(text).toBeDefined();
      const container = result.elements.find((element) => element.id === text?.containerId);
      expect(container?.type).toBe('ellipse');
    }
    expect(texts.find((element) => element.text === 'id')).toMatchObject({ containerId: null });
    assertTextBindings(result.elements);
  });

  it.each(['CustomExec', 'ProjectionExec'])('binds custom generator labels for %s', (operator) => {
    const custom: NodeGeneratorStrategy = {
      generate: (_node, x, y, _isRoot, context) => {
        const rectId = context.idGenerator.generateId();
        const width = 200;
        const height = 80;
        const rectangle = context.elementFactory.createRectangle({
          id: rectId, x, y, width, height,
        });
        const title = context.elementFactory.createText({
          id: context.idGenerator.generateId(), x, y, width, height: 20,
          text: 'Custom title', containerId: rectId,
        });
        // Finalization must work even when the text precedes its container.
        context.elements.push(title, rectangle);
        return {
          rectId, x, y, width, height, inputArrowCount: 1,
          inputArrowPositions: [x + width / 2], outputColumns: [], outputSortOrder: [],
        };
      },
    };
    const result = convertPlanToExcalidraw(operator, {
      generator: { customGenerators: [{ operator, generator: custom }] },
    });
    expect(result.elements.find(
      (element) => element.type === 'text' && element.text === 'Custom title'
    )).toMatchObject({ containerId: expect.any(String) });
    assertTextBindings(result.elements);
  });
});
