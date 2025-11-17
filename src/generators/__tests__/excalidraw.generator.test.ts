import { ExcalidrawGenerator } from '../excalidraw.generator';
import {
  ExcalidrawElement,
  ExcalidrawText,
} from '../../types/excalidraw.types';
import { ExecutionPlanNode } from '../../types/execution-plan.types';

describe('ExcalidrawGenerator', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = new ExcalidrawGenerator();
  });

  describe('generate', () => {
    it('should generate valid Excalidraw data structure', () => {
      const node: ExecutionPlanNode = {
        operator: 'TableScan',
        children: [],
        level: 0,
      };

      const result = generator.generate(node);

      expect(result.type).toBe('excalidraw');
      expect(result.version).toBe(2);
      expect(result.source).toBe('datafusion-plan-viz');
      expect(result.elements).toBeDefined();
      expect(result.appState).toBeDefined();
      expect(result.files).toBeDefined();
    });

    it('should generate rectangle and text for single node', () => {
      const node: ExecutionPlanNode = {
        operator: 'TableScan',
        children: [],
        level: 0,
      };

      const result = generator.generate(node);

      expect(result.elements.length).toBeGreaterThanOrEqual(2);

      const rectangle = result.elements.find(
        (el): el is ExcalidrawElement & { type: 'rectangle' } =>
          el.type === 'rectangle'
      );
      expect(rectangle).toBeDefined();

      const text = result.elements.find(
        (el): el is ExcalidrawText => el.type === 'text'
      );
      expect(text).toBeDefined();
      expect(text?.text).toContain('TableScan');
    });

    it('should generate arrows for parent-child relationships', () => {
      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        children: [
          {
            operator: 'TableScan',
            children: [],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);

      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should handle multiple children', () => {
      const node: ExecutionPlanNode = {
        operator: 'JoinExec',
        children: [
          {
            operator: 'TableScan',
            properties: { table: 'left' },
            children: [],
            level: 1,
          },
          {
            operator: 'TableScan',
            properties: { table: 'right' },
            children: [],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);

      // Should have elements for: 1 parent + 2 children = 3 rectangles, 3 texts, 2 arrows
      expect(result.elements.length).toBeGreaterThanOrEqual(8);

      const rectangles = result.elements.filter((el) => el.type === 'rectangle');
      expect(rectangles.length).toBe(3);

      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBe(2);
    });

    it('should include properties in text elements', () => {
      const node: ExecutionPlanNode = {
        operator: 'FilterExec',
        properties: {
          predicate: 'a > 10',
          limit: '100',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);

      const text = result.elements.find(
        (el): el is ExcalidrawText => el.type === 'text'
      );
      expect(text).toBeDefined();
      expect(text?.text).toContain('FilterExec');
      expect(text?.text).toContain('predicate=a > 10');
      expect(text?.text).toContain('limit=100');
    });

    it('should handle null root node', () => {
      const result = generator.generate(null);

      expect(result.type).toBe('excalidraw');
      expect(result.elements).toHaveLength(0);
    });

    it('should handle deep nested structures', () => {
      const node: ExecutionPlanNode = {
        operator: 'Level0',
        children: [
          {
            operator: 'Level1',
            children: [
              {
                operator: 'Level2',
                children: [
                  {
                    operator: 'Level3',
                    children: [],
                    level: 3,
                  },
                ],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);

      expect(result.elements.length).toBeGreaterThan(0);

      const rectangles = result.elements.filter((el) => el.type === 'rectangle');
      expect(rectangles.length).toBe(4);

      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBe(3);
    });
  });

  describe('custom configuration', () => {
    it('should respect custom node dimensions', () => {
      const customGenerator = new ExcalidrawGenerator({
        nodeWidth: 300,
        nodeHeight: 120,
      });

      const node: ExecutionPlanNode = {
        operator: 'TableScan',
        children: [],
        level: 0,
      };

      const result = customGenerator.generate(node);
      const rectangle = result.elements.find((el) => el.type === 'rectangle');

      expect(rectangle?.width).toBe(300);
      expect(rectangle?.height).toBe(120);
    });

    it('should respect custom colors', () => {
      const customGenerator = new ExcalidrawGenerator({
        nodeColor: '#ff0000',
        arrowColor: '#00ff00',
      });

      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        children: [
          {
            operator: 'TableScan',
            children: [],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = customGenerator.generate(node);

      const rectangle = result.elements.find((el) => el.type === 'rectangle');
      expect(rectangle?.strokeColor).toBe('#ff0000');

      const arrow = result.elements.find((el) => el.type === 'arrow');
      expect(arrow?.strokeColor).toBe('#00ff00');
    });

    it('should respect custom font size', () => {
      const customGenerator = new ExcalidrawGenerator({
        fontSize: 20,
      });

      const node: ExecutionPlanNode = {
        operator: 'TableScan',
        children: [],
        level: 0,
      };

      const result = customGenerator.generate(node);
      const text = result.elements.find(
        (el): el is ExcalidrawText => el.type === 'text'
      );

      expect(text?.fontSize).toBe(20);
    });
  });
});
