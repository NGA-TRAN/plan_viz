import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - DataSourceExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('DataSourceExec operator', () => {
    it('should generate DataSourceExec with file_groups and projection', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '1 groups: [[d_1.parquet]]',
        projection: '[d_dkey, env, service, host]',
        file_type: 'parquet',
      });

      const result = generator.generate(node);

      TestHelpers.assertHasRectangles(result, 1);
      TestHelpers.assertHasOperator(result, 'DataSourceExec');
    });

    it('should handle DataSourceExec with multiple file groups', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '2 groups: [[d1.parquet], [d2.parquet]]',
        projection: '[d_dkey, env]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle DataSourceExec with 3+ file groups and projection fallback', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '5 groups: [[f1.parquet], [f2.parquet], [f3.parquet], [f4.parquet], [f5.parquet]]',
        projection: '[col1, col2, col3]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle DataSourceExec with output_ordering', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '1 groups: [[d_1.parquet]]',
        projection: '[col1, col2]',
        output_ordering: '[col1@0 ASC]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle DataSourceExec with children', () => {
      const node = NodeBuilder.createDataSourceExec(
        {
          file_groups: '1 groups: [[d_1.parquet]]',
        },
        [NodeBuilder.createSimpleNode('TableScan', 1)]
      );

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });
  });
});

