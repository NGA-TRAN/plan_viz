import { ConverterService } from '../converter.service';

describe('ConverterService', () => {
  let converter: ConverterService;

  beforeEach(() => {
    converter = new ConverterService();
  });

  describe('convert', () => {
    it('should convert a simple execution plan', () => {
      const planText = 'TableScan';
      const result = converter.convert(planText);

      expect(result).toBeDefined();
      expect(result.type).toBe('excalidraw');
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should convert a multi-level execution plan', () => {
      const planText = `ProjectionExec: expr=[a, b]
  FilterExec: predicate=a > 10
    TableScan: table=users`;

      const result = converter.convert(planText);

      expect(result).toBeDefined();
      expect(result.elements.length).toBeGreaterThan(0);

      // Should have rectangles for each node
      const rectangles = result.elements.filter((el) => el.type === 'rectangle');
      expect(rectangles.length).toBe(3);

      // Should have arrows connecting nodes
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBe(2);
    });

    it('should throw error for empty input', () => {
      expect(() => converter.convert('')).toThrow('Execution plan text cannot be empty');
    });

    it('should throw error for whitespace-only input', () => {
      expect(() => converter.convert('   \n  ')).toThrow('Execution plan text cannot be empty');
    });

    it('should convert complex execution plan', () => {
      const planText = `GlobalLimitExec: skip=0, fetch=10
  SortExec: expr=[timestamp DESC]
    ProjectionExec: expr=[id, name, timestamp]
      FilterExec: predicate=status = 'active'
        TableScan: table=users`;

      const result = converter.convert(planText);

      expect(result).toBeDefined();
      expect(result.elements.length).toBeGreaterThan(0);

      const rectangles = result.elements.filter((el) => el.type === 'rectangle');
      expect(rectangles.length).toBe(5);
    });

    it('should handle execution plan with joins', () => {
      const planText = `HashJoinExec: mode=Partitioned, join_type=Inner
  TableScan: table=orders
  TableScan: table=customers`;

      const result = converter.convert(planText);

      expect(result).toBeDefined();

      const rectangles = result.elements.filter((el) => el.type === 'rectangle');
      expect(rectangles.length).toBe(3);

      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBe(2);
    });
  });

  describe('custom configuration', () => {
    it('should use custom parser configuration', () => {
      const customConverter = new ConverterService({
        parser: {
          indentationSize: 4,
        },
      });

      const planText = 'ProjectionExec\n    TableScan';
      const result = customConverter.convert(planText);

      expect(result).toBeDefined();
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should use custom generator configuration', () => {
      const customConverter = new ConverterService({
        generator: {
          nodeWidth: 300,
          nodeHeight: 120,
          nodeColor: '#ff0000',
        },
      });

      const planText = 'TableScan';
      const result = customConverter.convert(planText);

      expect(result).toBeDefined();

      const rectangle = result.elements.find((el) => el.type === 'rectangle');
      expect(rectangle?.width).toBe(300);
      expect(rectangle?.height).toBe(120);
      expect(rectangle?.strokeColor).toBe('#ff0000');
    });
  });
});
