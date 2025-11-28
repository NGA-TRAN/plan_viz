import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - SortExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('SortExec operator', () => {
    it('should generate SortExec with expr property', () => {
      const node = NodeBuilder.createSortExec('[col1@0 ASC]');

      const result = generator.generate(node);

      TestHelpers.assertHasOperator(result, 'SortExec');
    });

    it('should handle SortExec with preserve_partitioning', () => {
      const node = NodeBuilder.createSortExec('[col1@0 ASC]', [], {
        preserve_partitioning: 'true',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle SortExec with children', () => {
      const node = NodeBuilder.createSortExec('[col1@0 ASC]', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });
  });
});

