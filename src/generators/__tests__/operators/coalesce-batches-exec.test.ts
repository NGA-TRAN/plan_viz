import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - CoalesceBatchesExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('CoalesceBatchesExec operator', () => {
    it('should generate CoalesceBatchesExec with target_batch_size', () => {
      const node = NodeBuilder.createCoalesceBatchesExec('8192');

      const result = generator.generate(node);

      TestHelpers.assertHasOperator(result, 'CoalesceBatchesExec');
    });

    it('should handle CoalesceBatchesExec with children', () => {
      const node = NodeBuilder.createCoalesceBatchesExec('8192', [
        NodeBuilder.createFilterExec('a > 10'),
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });
  });
});

