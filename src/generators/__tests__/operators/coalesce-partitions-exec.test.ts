import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - CoalescePartitionsExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('CoalescePartitionsExec operator', () => {
    it('should generate CoalescePartitionsExec', () => {
      const node = NodeBuilder.createCoalescePartitionsExec();

      const result = generator.generate(node);

      TestHelpers.assertHasOperator(result, 'CoalescePartitionsExec');
    });

    it('should handle CoalescePartitionsExec with children', () => {
      const node = NodeBuilder.createCoalescePartitionsExec([
        NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[d_1.parquet]]',
        }),
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle CoalescePartitionsExec with 2 arrows from child', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(2)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createCoalescePartitionsExec([repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });
  });
});

