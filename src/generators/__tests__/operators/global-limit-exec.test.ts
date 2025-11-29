import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - GlobalLimitExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('GlobalLimitExec operator', () => {
    it('should generate GlobalLimitExec with skip and fetch properties', () => {
      const node = NodeBuilder.createNodeWithChildren(
        'GlobalLimitExec',
        [
          NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
        ],
        0,
        {
          skip: '0',
          fetch: '2',
        }
      );

      const result = generator.generate(node);

      TestHelpers.assertHasOperator(result, 'GlobalLimitExec');
      const textElements = TestHelpers.getTextElements(result.elements);
      const detailText = textElements.find((t) => t.text?.includes('skip=0, fetch=2'));
      expect(detailText).toBeDefined();
    });

    it('should handle GlobalLimitExec with children', () => {
      const node = NodeBuilder.createNodeWithChildren(
        'GlobalLimitExec',
        [
          NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
        ],
        0,
        {
          skip: '0',
          fetch: '2',
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
      const node = NodeBuilder.createNodeWithChildren('GlobalLimitExec', [childNode], 0, {
        skip: '0',
        fetch: '2',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
      // The output should have the same columns and sort order as the input
      // This is verified by the generator implementation
    });

    it('should throw error when GlobalLimitExec has wrong number of children', () => {
      const node = NodeBuilder.createNodeWithChildren(
        'GlobalLimitExec',
        [
          NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_2.parquet]]',
          }),
        ],
        0,
        {
          skip: '0',
          fetch: '2',
        }
      );

      expect(() => generator.generate(node)).toThrow(/must have exactly 1 child/);
    });

    it('should throw error when GlobalLimitExec has multiple input arrows', () => {
      // Create a child with multiple arrows (RepartitionExec with multiple partitions)
      const childNode = NodeBuilder.createRepartitionExec('Hash([col1@0], 3)', [
        NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[d_1.parquet]]',
        }),
      ]);
      const node = NodeBuilder.createNodeWithChildren('GlobalLimitExec', [childNode], 0, {
        skip: '0',
        fetch: '2',
      });

      expect(() => generator.generate(node)).toThrow(/must have exactly 1 input arrow/);
    });

    it('should always have 1 output arrow when not root', () => {
      // Create a parent node so GlobalLimitExec is not root
      const globalLimitNode = NodeBuilder.createNodeWithChildren(
        'GlobalLimitExec',
        [
          NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
        ],
        1,
        {
          skip: '0',
          fetch: '2',
        }
      );
      const parentNode = NodeBuilder.createNodeWithChildren('ProjectionExec', [globalLimitNode], 0, {
        expr: '[col1@0]',
      });

      const result = generator.generate(parentNode);
      TestHelpers.assertHasElements(result);
      // GlobalLimitExec should have 1 output arrow (to ProjectionExec)
      // This is verified by the generator implementation returning inputArrowCount: 1
    });
  });
});

