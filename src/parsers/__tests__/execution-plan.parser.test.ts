import { ExecutionPlanParser } from '../execution-plan.parser';

describe('ExecutionPlanParser', () => {
  let parser: ExecutionPlanParser;

  beforeEach(() => {
    parser = new ExecutionPlanParser();
  });

  describe('parse', () => {
    it('should parse a simple single-node plan', () => {
      const planText = 'TableScan';
      const result = parser.parse(planText);

      expect(result.root).not.toBeNull();
      expect(result.root?.operator).toBe('TableScan');
      expect(result.root?.children).toHaveLength(0);
      expect(result.originalText).toBe(planText);
    });

    it('should parse a two-level plan', () => {
      const planText = `ProjectionExec
  TableScan`;
      const result = parser.parse(planText);

      expect(result.root).not.toBeNull();
      expect(result.root?.operator).toBe('ProjectionExec');
      expect(result.root?.children).toHaveLength(1);
      expect(result.root?.children[0].operator).toBe('TableScan');
    });

    it('should parse a multi-level plan', () => {
      const planText = `ProjectionExec
  FilterExec
    SortExec
      TableScan`;
      const result = parser.parse(planText);

      expect(result.root).not.toBeNull();
      expect(result.root?.operator).toBe('ProjectionExec');
      expect(result.root?.children).toHaveLength(1);
      expect(result.root?.children[0].operator).toBe('FilterExec');
      expect(result.root?.children[0].children).toHaveLength(1);
      expect(result.root?.children[0].children[0].operator).toBe('SortExec');
      expect(result.root?.children[0].children[0].children).toHaveLength(1);
      expect(result.root?.children[0].children[0].children[0].operator).toBe('TableScan');
    });

    it('should parse a plan with multiple children', () => {
      const planText = `JoinExec
  TableScan: table1
  TableScan: table2`;
      const result = parser.parse(planText);

      expect(result.root).not.toBeNull();
      expect(result.root?.operator).toBe('JoinExec');
      expect(result.root?.children).toHaveLength(2);
      expect(result.root?.children[0].operator).toBe('TableScan');
      expect(result.root?.children[1].operator).toBe('TableScan');
    });

    it('should extract properties from operators', () => {
      const planText = 'ProjectionExec: expr=[a, b, c]';
      const result = parser.parse(planText);

      expect(result.root).not.toBeNull();
      expect(result.root?.operator).toBe('ProjectionExec');
      expect(result.root?.properties).toBeDefined();
      expect(result.root?.properties?.expr).toBe('[a, b, c]');
    });

    it('should handle multiple properties', () => {
      const planText = 'FilterExec: predicate=a > 10, limit=100';
      const result = parser.parse(planText);

      expect(result.root).not.toBeNull();
      expect(result.root?.operator).toBe('FilterExec');
      expect(result.root?.properties).toBeDefined();
      expect(result.root?.properties?.predicate).toBe('a > 10');
      expect(result.root?.properties?.limit).toBe('100');
    });

    it('should handle empty input', () => {
      const result = parser.parse('');

      expect(result.root).toBeNull();
      expect(result.originalText).toBe('');
    });

    it('should handle whitespace-only input', () => {
      const result = parser.parse('   \n  \n  ');

      expect(result.root).toBeNull();
    });

    it('should handle tabs as indentation', () => {
      const planText = 'ProjectionExec\n\tTableScan';
      const result = parser.parse(planText);

      expect(result.root).not.toBeNull();
      expect(result.root?.operator).toBe('ProjectionExec');
      expect(result.root?.children).toHaveLength(1);
      expect(result.root?.children[0].operator).toBe('TableScan');
    });

    it('should handle complex nested structure', () => {
      const planText = `GlobalLimitExec: skip=0, fetch=10
  SortExec: expr=[timestamp DESC]
    ProjectionExec: expr=[id, name, timestamp]
      FilterExec: predicate=status = 'active'
        CoalesceBatchesExec
          RepartitionExec
            TableScan: table=users, partitions=4`;

      const result = parser.parse(planText);

      expect(result.root).not.toBeNull();
      expect(result.root?.operator).toBe('GlobalLimitExec');
      expect(result.root?.properties?.skip).toBe('0');
      expect(result.root?.properties?.fetch).toBe('10');

      // Navigate through the tree
      const sortExec = result.root?.children[0];
      expect(sortExec?.operator).toBe('SortExec');

      const projectionExec = sortExec?.children[0];
      expect(projectionExec?.operator).toBe('ProjectionExec');

      const filterExec = projectionExec?.children[0];
      expect(filterExec?.operator).toBe('FilterExec');
    });

    it('should preserve indentation levels', () => {
      const planText = `Level0
  Level1a
    Level2a
  Level1b`;
      const result = parser.parse(planText);

      expect(result.root).not.toBeNull();
      expect(result.root?.level).toBe(0);
      expect(result.root?.children).toHaveLength(2);
      expect(result.root?.children[0].level).toBe(1);
      expect(result.root?.children[0].children[0].level).toBe(2);
      expect(result.root?.children[1].level).toBe(1);
    });
  });

  describe('custom configuration', () => {
    it('should respect custom indentation size', () => {
      const customParser = new ExecutionPlanParser({ indentationSize: 4 });
      const planText = 'ProjectionExec\n    TableScan';
      const result = customParser.parse(planText);

      expect(result.root).not.toBeNull();
      expect(result.root?.children).toHaveLength(1);
    });

    it('should disable property extraction when configured', () => {
      const customParser = new ExecutionPlanParser({ extractProperties: false });
      const planText = 'ProjectionExec: expr=[a, b, c]';
      const result = customParser.parse(planText);

      expect(result.root).not.toBeNull();
      expect(result.root?.operator).toBe('ProjectionExec: expr=[a, b, c]');
      expect(result.root?.properties).toBeUndefined();
    });
  });
});
