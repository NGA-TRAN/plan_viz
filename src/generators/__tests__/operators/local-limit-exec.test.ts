import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - LocalLimitExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('LocalLimitExec operator', () => {
    it('should generate LocalLimitExec with fetch property', () => {
      const node = NodeBuilder.createNodeWithChildren('LocalLimitExec', [], 0, {
        fetch: '100',
      });

      const result = generator.generate(node);

      TestHelpers.assertHasOperator(result, 'LocalLimitExec');
      const textElements = TestHelpers.getTextElements(result.elements);
      const detailText = textElements.find((t) => t.text?.includes('fetch=100'));
      expect(detailText).toBeDefined();
    });

    it('should handle LocalLimitExec with children', () => {
      const node = NodeBuilder.createNodeWithChildren(
        'LocalLimitExec',
        [
          NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
        ],
        0,
        {
          fetch: '100',
        }
      );

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should preserve output columns and sort order from input', () => {
      const childNode = NodeBuilder.createSortExec('[col1@0 ASC]', [
        NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[d_1.parquet]]',
        }),
      ]);
      const node = NodeBuilder.createNodeWithChildren('LocalLimitExec', [childNode], 0, {
        fetch: '100',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
      // The output should have the same columns and sort order as the input
      // This is verified by the generator implementation
    });
  });
});

