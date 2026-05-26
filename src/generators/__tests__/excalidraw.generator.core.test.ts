import { ExcalidrawGenerator } from '../excalidraw.generator';
import { ExcalidrawElement } from '../../types/excalidraw.types';
import { TestHelpers } from './utils/test-helpers';
import { NodeBuilder } from './builders/node.builder';
import { BaseNodeGenerator as PublicBaseNodeGenerator } from '../../index';
import type {
  ExecutionPlanNode as PublicExecutionPlanNode,
  GenerationContext as PublicGenerationContext,
  NodeGeneratorStrategy as PublicNodeGeneratorStrategy,
  NodeInfo as PublicNodeInfo,
} from '../../index';

class TestCustomNodeGenerator extends PublicBaseNodeGenerator {
  constructor(private readonly label: string) {
    super();
  }

  generate(
    node: PublicExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: PublicGenerationContext
  ): PublicNodeInfo {
    const nodeWidth = context.config.nodeWidth;
    const nodeHeight = context.config.nodeHeight;
    const rectId = context.idGenerator.generateId();

    context.elements.push(context.elementFactory.createRectangle({
      id: rectId,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      strokeColor: context.config.nodeColor,
    }));
    context.elements.push(context.elementFactory.createText({
      id: context.idGenerator.generateId(),
      x,
      y: y + 5,
      width: nodeWidth,
      height: context.config.operatorFontSize + 4,
      text: `${this.label}: ${node.operator}`,
      fontSize: context.config.operatorFontSize,
      fontFamily: 7,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    }));

    return {
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: 1,
      inputArrowPositions: [x + nodeWidth / 2],
      outputColumns: [],
      outputSortOrder: [],
    };
  }
}

describe('ExcalidrawGenerator - Core', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('generate', () => {
    it('should generate valid Excalidraw data structure', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');

      const result = generator.generate(node);

      TestHelpers.assertValidExcalidrawData(result);
    });

    it('should generate rectangle and text for single node', () => {
      const node = NodeBuilder.createSimpleNode('TableScan');

      const result = generator.generate(node);

      expect(result.elements.length).toBeGreaterThanOrEqual(2);
      TestHelpers.assertHasRectangles(result, 1);
      TestHelpers.assertHasOperator(result, 'TableScan');
    });

    it('should generate arrows for parent-child relationships', () => {
      const node = NodeBuilder.createNodeWithChildren('ProjectionExec', [
        NodeBuilder.createSimpleNode('TableScan', 1),
      ]);

      const result = generator.generate(node);

      TestHelpers.assertHasArrows(result);
    });

    it('should handle multiple children', () => {
      const node = NodeBuilder.createNodeWithChildren('JoinExec', [
        NodeBuilder.createNodeWithChildren('TableScan', [], 1, { table: 'left' }),
        NodeBuilder.createNodeWithChildren('TableScan', [], 1, { table: 'right' }),
      ]);

      const result = generator.generate(node);

      // Should have elements for: 1 parent + 2 children = 3 rectangles, 3 texts, 2 arrows
      expect(result.elements.length).toBeGreaterThanOrEqual(8);
      TestHelpers.assertHasRectangles(result, 3);
      TestHelpers.assertHasArrows(result, 2);
    });

    it('should include properties in text elements', () => {
      const node = NodeBuilder.createNodeWithChildren('FilterExec', [], 0, {
        predicate: 'a > 10',
        limit: '100',
      });

      const result = generator.generate(node);

      TestHelpers.assertHasOperator(result, 'FilterExec');
      // Check that the detail text contains the predicate (it may be on a separate line from limit)
      const textElements = TestHelpers.getTextElements(result.elements);
      const hasPredicate = textElements.some((t) => t.text && t.text.includes('a > 10'));
      expect(hasPredicate).toBe(true);
    });

    it('should handle null root node', () => {
      const result = generator.generate(null);

      expect(result.type).toBe('excalidraw');
      expect(result.elements).toHaveLength(0);
    });

    it('should handle deep nested structures', () => {
      const node = NodeBuilder.createNestedNode(3);

      const result = generator.generate(node);

      TestHelpers.assertHasElements(result);
      TestHelpers.assertHasRectangles(result, 4);
      TestHelpers.assertHasArrows(result, 3);
    });
  });

  describe('custom configuration', () => {
    it('should respect custom node dimensions', () => {
      const customGenerator = TestHelpers.createGenerator({
        nodeWidth: 300,
        nodeHeight: 120,
      });

      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = customGenerator.generate(node);
      const rectangle = TestHelpers.findElementByType<ExcalidrawElement & { type: 'rectangle' }>(
        result.elements,
        'rectangle'
      );

      expect(rectangle?.width).toBe(300);
      expect(rectangle?.height).toBe(120);
    });

    it('should respect custom colors', () => {
      const customGenerator = TestHelpers.createGenerator({
        nodeColor: '#ff0000',
        arrowColor: '#00ff00',
      });

      const node = NodeBuilder.createNodeWithChildren('ProjectionExec', [
        NodeBuilder.createSimpleNode('TableScan', 1),
      ]);

      const result = customGenerator.generate(node);

      const rectangle = TestHelpers.findElementByType<ExcalidrawElement & { type: 'rectangle' }>(
        result.elements,
        'rectangle'
      );
      expect(rectangle?.strokeColor).toBe('#ff0000');

      const arrow = TestHelpers.findElementByType<ExcalidrawElement & { type: 'arrow' }>(
        result.elements,
        'arrow'
      );
      expect(arrow?.strokeColor).toBe('#00ff00');
    });

    it('should respect custom font size', () => {
      const customGenerator = TestHelpers.createGenerator({
        fontSize: 20,
      });

      const node = NodeBuilder.createSimpleNode('TableScan');
      const result = customGenerator.generate(node);

      const operatorText = TestHelpers.findElementByText(result.elements, 'TableScan');
      expect(operatorText).toBeDefined();
      // operatorFontSize should be 1.25 * fontSize = 25
      expect(operatorText?.fontSize).toBe(25);
    });

    it('should use a custom generator for an unrecognized operator', () => {
      const customGenerator = TestHelpers.createGenerator({
        customGenerators: [
          {
            operator: 'CustomExec',
            generator: new TestCustomNodeGenerator('custom'),
          },
        ],
      });

      const node = NodeBuilder.createSimpleNode('CustomExec');
      const result = customGenerator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);

      expect(textElements.some((text) => text.text === 'custom: CustomExec')).toBe(true);
      expect(textElements.some((text) => text.text === 'unimplemented')).toBe(false);
    });

    it('should allow a custom generator to override a built-in operator', () => {
      const customGenerator = TestHelpers.createGenerator({
        customGenerators: [
          {
            operator: 'FilterExec',
            generator: new TestCustomNodeGenerator('override'),
          },
        ],
      });

      const node = NodeBuilder.createNodeWithChildren('FilterExec', [], 0, {
        predicate: 'a > 10',
      });
      const result = customGenerator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);

      expect(textElements.some((text) => text.text === 'override: FilterExec')).toBe(true);
      expect(textElements.some((text) => text.text.includes('a > 10'))).toBe(false);
    });

    it('should expose the extension API from the package entry point', () => {
      const generator: PublicNodeGeneratorStrategy = new TestCustomNodeGenerator('public');
      const node: PublicExecutionPlanNode = NodeBuilder.createSimpleNode('PublicExec');
      const acceptsPublicTypes = (
        _generator: PublicNodeGeneratorStrategy,
        _node?: PublicExecutionPlanNode,
        _context?: PublicGenerationContext,
        _info?: PublicNodeInfo
      ): boolean => true;

      expect(generator).toBeInstanceOf(PublicBaseNodeGenerator);
      expect(acceptsPublicTypes(generator, node)).toBe(true);
    });
  });
});
