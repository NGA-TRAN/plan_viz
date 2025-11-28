import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestAssertions } from './assertions';
import { TestHelpers } from './test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('TestAssertions', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('assertGeneratesValidExcalidraw', () => {
    it('should assert valid Excalidraw data for a node', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      expect(() => {
        TestAssertions.assertGeneratesValidExcalidraw(generator, node);
      }).not.toThrow();
    });

    it('should assert valid Excalidraw data for null node', () => {
      expect(() => {
        TestAssertions.assertGeneratesValidExcalidraw(generator, null);
      }).not.toThrow();
    });
  });

  describe('assertHasOperatorText', () => {
    it('should assert operator text exists', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      expect(() => {
        TestAssertions.assertHasOperatorText(result, 'TableScan');
      }).not.toThrow();
    });
  });

  describe('assertHasPropertyText', () => {
    it('should assert property text exists', () => {
      const node = NodeBuilder.createFilterExec('a > 10');
      const result = generator.generate(node);
      expect(() => {
        TestAssertions.assertHasPropertyText(result, 'a > 10');
      }).not.toThrow();
    });

    it('should throw when property text does not exist', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      expect(() => {
        TestAssertions.assertHasPropertyText(result, 'nonexistent');
      }).toThrow();
    });
  });

  describe('assertHasArrows', () => {
    it('should assert arrows exist without count', () => {
      const node = NodeBuilder.createNodeWithChildren('ProjectionExec', [
        NodeBuilder.createSimpleNode('TableScan', 1),
      ]);
      const result = generator.generate(node);
      expect(() => {
        TestAssertions.assertHasArrows(result);
      }).not.toThrow();
    });

    it('should assert exact arrow count', () => {
      const node = NodeBuilder.createNodeWithChildren('JoinExec', [
        NodeBuilder.createSimpleNode('TableScan', 1),
        NodeBuilder.createSimpleNode('TableScan', 1),
      ]);
      const result = generator.generate(node);
      expect(() => {
        TestAssertions.assertHasArrows(result, 2);
      }).not.toThrow();
    });
  });

  describe('assertHasRectangles', () => {
    it('should assert rectangles exist without count', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      expect(() => {
        TestAssertions.assertHasRectangles(result);
      }).not.toThrow();
    });

    it('should assert exact rectangle count', () => {
      const node = NodeBuilder.createNodeWithChildren('JoinExec', [
        NodeBuilder.createSimpleNode('TableScan', 1),
        NodeBuilder.createSimpleNode('TableScan', 1),
      ]);
      const result = generator.generate(node);
      expect(() => {
        TestAssertions.assertHasRectangles(result, 3);
      }).not.toThrow();
    });
  });

  describe('assertHasTextElement', () => {
    it('should assert text element exists', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      expect(() => {
        TestAssertions.assertHasTextElement(result, 'TableScan');
      }).not.toThrow();
    });
  });

  describe('assertTextColor', () => {
    it('should assert text color matches', () => {
      const node = NodeBuilder.createRepartitionExec(
        'Hash([col1@0], 4)',
        [
          {
            ...NodeBuilder.createDataSourceExec({
              file_groups: '1 groups: [[d_1.parquet]]',
            }),
            level: 1,
          },
        ],
        { preserve_order: 'true' }
      );
      const result = generator.generate(node);
      expect(() => {
        TestAssertions.assertTextColor(result, 'preserve_order=true', '#8B0000');
      }).not.toThrow();
    });
  });

  describe('assertGeneratesElements', () => {
    it('should assert elements are generated', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      expect(() => {
        TestAssertions.assertGeneratesElements(generator, node);
      }).not.toThrow();
    });
  });
});

