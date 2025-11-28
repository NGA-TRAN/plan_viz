import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - SortPreservingMergeExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('SortPreservingMergeExec operator', () => {
    it('should generate SortPreservingMergeExec', () => {
      const node = NodeBuilder.createSortPreservingMergeExec('[col1@0 ASC]');

      const result = generator.generate(node);

      TestHelpers.assertHasOperator(result, 'SortPreservingMergeExec');
    });

    it('should handle SortPreservingMergeExec with children', () => {
      const node = NodeBuilder.createSortPreservingMergeExec('[col1@0 ASC]', [
        {
          ...NodeBuilder.createSortExec('[col1@0 ASC]'),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should handle SortPreservingMergeExec with expr containing braces and brackets', () => {
      const node = NodeBuilder.createSortPreservingMergeExec('[func(col1@0, {param: value}) ASC, col2@1 DESC]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });
  });
});

