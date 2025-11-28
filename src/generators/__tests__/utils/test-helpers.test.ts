import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { ExcalidrawElement } from '../../../types/excalidraw.types';
import { TestHelpers } from './test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('TestHelpers', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('createGenerator', () => {
    it('should create generator with default config', () => {
      const gen = TestHelpers.createGenerator();
      expect(gen).toBeInstanceOf(ExcalidrawGenerator);
    });

    it('should create generator with custom config', () => {
      const gen = TestHelpers.createGenerator({
        nodeWidth: 300,
        nodeHeight: 120,
      });
      expect(gen).toBeInstanceOf(ExcalidrawGenerator);
    });
  });

  describe('findElementByType', () => {
    it('should find rectangle element', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      const rectangle = TestHelpers.findElementByType<ExcalidrawElement & { type: 'rectangle' }>(
        result.elements,
        'rectangle'
      );
      expect(rectangle).toBeDefined();
      expect(rectangle?.type).toBe('rectangle');
    });

    it('should return undefined when element not found', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      const ellipse = TestHelpers.findElementByType<ExcalidrawElement & { type: 'ellipse' }>(
        result.elements,
        'ellipse'
      );
      expect(ellipse).toBeUndefined();
    });
  });

  describe('findElementByText', () => {
    it('should find text element by text content', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      const textElement = TestHelpers.findElementByText(result.elements, 'TableScan');
      expect(textElement).toBeDefined();
      expect(textElement?.text).toBe('TableScan');
    });

    it('should return undefined when text not found', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      const textElement = TestHelpers.findElementByText(result.elements, 'Nonexistent');
      expect(textElement).toBeUndefined();
    });
  });

  describe('filterElementsByType', () => {
    it('should filter elements by type', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      const rectangles = TestHelpers.filterElementsByType(result.elements, 'rectangle');
      expect(rectangles.length).toBeGreaterThan(0);
      rectangles.forEach((rect) => {
        expect(rect.type).toBe('rectangle');
      });
    });
  });

  describe('getTextElements', () => {
    it('should get all text elements', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);
      expect(textElements.length).toBeGreaterThan(0);
      textElements.forEach((text) => {
        expect(text.type).toBe('text');
      });
    });
  });

  describe('getRectangles', () => {
    it('should get all rectangle elements', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      const rectangles = TestHelpers.getRectangles(result.elements);
      expect(rectangles.length).toBeGreaterThan(0);
      rectangles.forEach((rect) => {
        expect(rect.type).toBe('rectangle');
      });
    });
  });

  describe('getArrows', () => {
    it('should get all arrow elements', () => {
      const node = NodeBuilder.createNodeWithChildren('ProjectionExec', [
        NodeBuilder.createSimpleNode('TableScan', 1),
      ]);
      const result = generator.generate(node);
      const arrows = TestHelpers.getArrows(result.elements);
      expect(arrows.length).toBeGreaterThan(0);
      arrows.forEach((arrow) => {
        expect(arrow.type).toBe('arrow');
      });
    });
  });

  describe('getEllipses', () => {
    it('should get all ellipse elements', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '3 groups: [[f1.parquet], [f2.parquet], [f3.parquet]]',
      });
      const result = generator.generate(node);
      const ellipses = TestHelpers.getEllipses(result.elements);
      expect(ellipses.length).toBeGreaterThan(0);
      ellipses.forEach((ellipse) => {
        expect(ellipse.type).toBe('ellipse');
      });
    });
  });

  describe('assertValidExcalidrawData', () => {
    it('should assert valid Excalidraw data structure', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      expect(() => {
        TestHelpers.assertValidExcalidrawData(result);
      }).not.toThrow();
    });
  });

  describe('assertHasElements', () => {
    it('should assert elements exist without minCount', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      expect(() => {
        TestHelpers.assertHasElements(result);
      }).not.toThrow();
    });

    it('should assert elements exist with minCount', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      expect(() => {
        TestHelpers.assertHasElements(result, 2);
      }).not.toThrow();
    });
  });

  describe('assertHasRectangles', () => {
    it('should assert rectangles exist without count', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      expect(() => {
        TestHelpers.assertHasRectangles(result);
      }).not.toThrow();
    });

    it('should assert exact rectangle count', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      expect(() => {
        TestHelpers.assertHasRectangles(result, 1);
      }).not.toThrow();
    });
  });

  describe('assertHasArrows', () => {
    it('should assert arrows exist without count', () => {
      const node = NodeBuilder.createNodeWithChildren('ProjectionExec', [
        NodeBuilder.createSimpleNode('TableScan', 1),
      ]);
      const result = generator.generate(node);
      expect(() => {
        TestHelpers.assertHasArrows(result);
      }).not.toThrow();
    });

    it('should assert exact arrow count', () => {
      const node = NodeBuilder.createNodeWithChildren('JoinExec', [
        NodeBuilder.createSimpleNode('TableScan', 1),
        NodeBuilder.createSimpleNode('TableScan', 1),
      ]);
      const result = generator.generate(node);
      expect(() => {
        TestHelpers.assertHasArrows(result, 2);
      }).not.toThrow();
    });
  });

  describe('assertHasText', () => {
    it('should assert text exists', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      expect(() => {
        TestHelpers.assertHasText(result, 'TableScan');
      }).not.toThrow();
    });
  });

  describe('assertHasOperator', () => {
    it('should assert operator exists', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = generator.generate(node);
      expect(() => {
        TestHelpers.assertHasOperator(result, 'TableScan');
      }).not.toThrow();
    });
  });
});

