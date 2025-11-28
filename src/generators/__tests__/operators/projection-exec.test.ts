import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - ProjectionExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('ProjectionExec operator', () => {
    it('should generate ProjectionExec with expr property', () => {
      const node = NodeBuilder.createProjectionExec('[env@0 as env, count(Int64(1))@1 as count(*)]');

      const result = generator.generate(node);

      TestHelpers.assertHasOperator(result, 'ProjectionExec');
    });

    it('should handle ProjectionExec with children', () => {
      const node = NodeBuilder.createProjectionExec('[col1@0, col2@1]', [
        {
          ...NodeBuilder.createAggregateExec('Single', '[col1@0]', '[]'),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });
  });
});

