import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - UnionExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('UnionExec operator', () => {
    it('should generate UnionExec', () => {
      const node = NodeBuilder.createUnionExec([
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d1.parquet]]',
          }),
          level: 1,
        },
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d2.parquet]]',
          }),
          level: 1,
        },
      ]);

      const result = generator.generate(node);

      TestHelpers.assertHasOperator(result, 'UnionExec');
    });

    it('should handle UnionExec with 2 arrows', () => {
      const node = NodeBuilder.createUnionExec([
        {
          ...NodeBuilder.createRepartitionExec('RoundRobinBatch(2)', [
            {
              ...NodeBuilder.createDataSourceExec({
                file_groups: '1 groups: [[d1.parquet]]',
              }),
              level: 2,
            },
          ]),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle UnionExec with 3+ arrows', () => {
      const node = NodeBuilder.createUnionExec([
        {
          ...NodeBuilder.createRepartitionExec('RoundRobinBatch(3)', [
            {
              ...NodeBuilder.createDataSourceExec({
                file_groups: '1 groups: [[d1.parquet]]',
              }),
              level: 2,
            },
          ]),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle UnionExec with multiple children', () => {
      const node = NodeBuilder.createUnionExec([
        {
          ...NodeBuilder.createSimpleNode('TableScan', 1),
        },
        {
          ...NodeBuilder.createSimpleNode('TableScan', 1),
        },
        {
          ...NodeBuilder.createSimpleNode('TableScan', 1),
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasRectangles(result, 4); // 1 parent + 3 children
    });
  });
});

