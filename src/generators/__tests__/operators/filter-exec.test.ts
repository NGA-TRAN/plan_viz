import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - FilterExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('FilterExec operator', () => {
    it('should generate FilterExec with filter expression', () => {
      const node = NodeBuilder.createFilterExec('service@2 = log');

      const result = generator.generate(node);

      TestHelpers.assertHasOperator(result, 'FilterExec');
    });

    it('should handle FilterExec with projection', () => {
      const node = NodeBuilder.createFilterExec('a > 10', [], {
        projection: '[col1, col2]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle FilterExec with predicate property', () => {
      const node = NodeBuilder.createFilterExec('', [], {
        predicate: 'a@0 > 10',
      });

      const result = generator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);
      const filterText = textElements.find(
        (t) => t.text?.includes('a@0 > 10') || t.text?.includes('a > 10')
      );
      expect(filterText).toBeDefined();
    });

    it('should handle FilterExec with children', () => {
      const node = NodeBuilder.createFilterExec('a > 10', [
        NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[d_1.parquet]]',
        }),
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });
  });
});

