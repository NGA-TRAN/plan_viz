import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestNodes } from './test-nodes';
import { TestHelpers } from '../utils/test-helpers';

describe('TestNodes fixtures', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should generate valid Excalidraw from simpleTableScan', () => {
    const result = generator.generate(TestNodes.simpleTableScan);
    TestHelpers.assertValidExcalidrawData(result);
    TestHelpers.assertHasOperator(result, 'TableScan');
  });

  it('should generate valid Excalidraw from dataSourceWithSingleFile', () => {
    const result = generator.generate(TestNodes.dataSourceWithSingleFile);
    TestHelpers.assertValidExcalidrawData(result);
    TestHelpers.assertHasOperator(result, 'DataSourceExec');
  });

  it('should generate valid Excalidraw from dataSourceWithMultipleFiles', () => {
    const result = generator.generate(TestNodes.dataSourceWithMultipleFiles);
    TestHelpers.assertValidExcalidrawData(result);
    TestHelpers.assertHasOperator(result, 'DataSourceExec');
  });

  it('should generate valid Excalidraw from filterWithPredicate', () => {
    const result = generator.generate(TestNodes.filterWithPredicate);
    TestHelpers.assertValidExcalidrawData(result);
    TestHelpers.assertHasOperator(result, 'FilterExec');
  });

  it('should generate valid Excalidraw from repartitionHash', () => {
    const result = generator.generate(TestNodes.repartitionHash);
    TestHelpers.assertValidExcalidrawData(result);
    TestHelpers.assertHasOperator(result, 'RepartitionExec');
  });

  it('should generate valid Excalidraw from repartitionRoundRobin', () => {
    const result = generator.generate(TestNodes.repartitionRoundRobin);
    TestHelpers.assertValidExcalidrawData(result);
    TestHelpers.assertHasOperator(result, 'RepartitionExec');
  });

  it('should generate valid Excalidraw from aggregateSingle', () => {
    const result = generator.generate(TestNodes.aggregateSingle);
    TestHelpers.assertValidExcalidrawData(result);
    TestHelpers.assertHasOperator(result, 'AggregateExec');
  });

  it('should generate valid Excalidraw from aggregatePartial', () => {
    const result = generator.generate(TestNodes.aggregatePartial);
    TestHelpers.assertValidExcalidrawData(result);
    TestHelpers.assertHasOperator(result, 'AggregateExec');
  });

  it('should generate valid Excalidraw from aggregateFinal', () => {
    const result = generator.generate(TestNodes.aggregateFinal);
    TestHelpers.assertValidExcalidrawData(result);
    TestHelpers.assertHasOperator(result, 'AggregateExec');
  });

  it('should generate valid Excalidraw from projectionSimple', () => {
    const result = generator.generate(TestNodes.projectionSimple);
    TestHelpers.assertValidExcalidrawData(result);
    TestHelpers.assertHasOperator(result, 'ProjectionExec');
  });

  it('should generate valid Excalidraw from sortSimple', () => {
    const result = generator.generate(TestNodes.sortSimple);
    TestHelpers.assertValidExcalidrawData(result);
    TestHelpers.assertHasOperator(result, 'SortExec');
  });

  it('should generate valid Excalidraw from coalesceBatches', () => {
    const result = generator.generate(TestNodes.coalesceBatches);
    TestHelpers.assertValidExcalidrawData(result);
    TestHelpers.assertHasOperator(result, 'CoalesceBatchesExec');
  });

  it('should generate valid Excalidraw from coalescePartitions', () => {
    const result = generator.generate(TestNodes.coalescePartitions);
    TestHelpers.assertValidExcalidrawData(result);
    TestHelpers.assertHasOperator(result, 'CoalescePartitionsExec');
  });

  it('should generate valid Excalidraw from hashJoinInner', () => {
    const left = TestNodes.simpleTableScan;
    const right = TestNodes.simpleTableScan;
    const node = TestNodes.hashJoinInner(left, right);
    const result = generator.generate(node);
    TestHelpers.assertValidExcalidrawData(result);
    TestHelpers.assertHasOperator(result, 'HashJoinExec');
  });

  it('should generate valid Excalidraw from unionWithTwoChildren', () => {
    const child1 = TestNodes.simpleTableScan;
    const child2 = TestNodes.simpleTableScan;
    const node = TestNodes.unionWithTwoChildren(child1, child2);
    const result = generator.generate(node);
    TestHelpers.assertValidExcalidrawData(result);
    TestHelpers.assertHasOperator(result, 'UnionExec');
  });
});

