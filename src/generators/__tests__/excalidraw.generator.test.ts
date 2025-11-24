import { ExcalidrawGenerator } from '../excalidraw.generator';
import { ExcalidrawElement, ExcalidrawText } from '../../types/excalidraw.types';
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
      expect(result.source).toBe('https://excalidraw.com');
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
        (el): el is ExcalidrawElement & { type: 'rectangle' } => el.type === 'rectangle'
      );
      expect(rectangle).toBeDefined();

      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      expect(textElements.length).toBeGreaterThanOrEqual(1);
      const operatorText = textElements.find((t) => t.text === 'TableScan');
      expect(operatorText).toBeDefined();
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

      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      expect(textElements.length).toBeGreaterThanOrEqual(2);

      const operatorText = textElements.find((t) => t.text === 'FilterExec');
      expect(operatorText).toBeDefined();

      // FilterExec now displays filter expression at bottom center, not in details text
      // Check for the filter expression (predicate value)
      const filterDetailText = textElements.find((t) => t.text === 'a > 10');
      expect(filterDetailText).toBeDefined();
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
      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');

      const operatorText = textElements.find((t) => t.text === 'TableScan');
      expect(operatorText).toBeDefined();
      // operatorFontSize should be 1.25 * fontSize = 25
      expect(operatorText?.fontSize).toBe(25);
    });
  });

  describe('DataSourceExec operator', () => {
    it('should generate DataSourceExec with file_groups and projection', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: '1 groups: [[d_1.parquet]]',
          projection: '[d_dkey, env, service, host]',
          file_type: 'parquet',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);

      const rectangles = result.elements.filter((el) => el.type === 'rectangle');
      expect(rectangles.length).toBeGreaterThanOrEqual(1);

      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      const operatorText = textElements.find((t) => t.text === 'DataSourceExec');
      expect(operatorText).toBeDefined();
    });

    it('should handle DataSourceExec with multiple file groups', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: '2 groups: [[d1.parquet], [d2.parquet]]',
          projection: '[d_dkey, env]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle DataSourceExec with output_ordering', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: '1 groups: [[d_1.parquet]]',
          projection: '[col1, col2]',
          output_ordering: '[col1@0 ASC]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle DataSourceExec with children', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: '1 groups: [[d_1.parquet]]',
        },
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
  });

  describe('FilterExec operator', () => {
    it('should generate FilterExec with filter expression', () => {
      const node: ExecutionPlanNode = {
        operator: 'FilterExec',
        properties: {
          filter: 'service@2 = log',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);

      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      const operatorText = textElements.find((t) => t.text === 'FilterExec');
      expect(operatorText).toBeDefined();
    });

    it('should handle FilterExec with projection', () => {
      const node: ExecutionPlanNode = {
        operator: 'FilterExec',
        properties: {
          filter: 'a > 10',
          projection: '[col1, col2]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle FilterExec with predicate property', () => {
      const node: ExecutionPlanNode = {
        operator: 'FilterExec',
        properties: {
          predicate: 'a@0 > 10',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      const filterText = textElements.find(
        (t) => t.text.includes('a@0 > 10') || t.text.includes('a > 10')
      );
      expect(filterText).toBeDefined();
    });

    it('should handle FilterExec with children', () => {
      const node: ExecutionPlanNode = {
        operator: 'FilterExec',
        properties: {
          filter: 'a > 10',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
            },
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
  });

  describe('CoalesceBatchesExec operator', () => {
    it('should generate CoalesceBatchesExec with target_batch_size', () => {
      const node: ExecutionPlanNode = {
        operator: 'CoalesceBatchesExec',
        properties: {
          target_batch_size: '8192',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);

      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      const operatorText = textElements.find((t) => t.text === 'CoalesceBatchesExec');
      expect(operatorText).toBeDefined();
    });

    it('should handle CoalesceBatchesExec with children', () => {
      const node: ExecutionPlanNode = {
        operator: 'CoalesceBatchesExec',
        properties: {
          target_batch_size: '8192',
        },
        children: [
          {
            operator: 'FilterExec',
            properties: {
              filter: 'a > 10',
            },
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
  });

  describe('CoalescePartitionsExec operator', () => {
    it('should generate CoalescePartitionsExec', () => {
      const node: ExecutionPlanNode = {
        operator: 'CoalescePartitionsExec',
        children: [],
        level: 0,
      };

      const result = generator.generate(node);

      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      const operatorText = textElements.find((t) => t.text === 'CoalescePartitionsExec');
      expect(operatorText).toBeDefined();
    });

    it('should handle CoalescePartitionsExec with children', () => {
      const node: ExecutionPlanNode = {
        operator: 'CoalescePartitionsExec',
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
            },
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
  });

  describe('RepartitionExec operator', () => {
    it('should generate RepartitionExec with hash partitioning', () => {
      const node: ExecutionPlanNode = {
        operator: 'RepartitionExec',
        properties: {
          partitioning: 'Hash(Column { name: "col1", index: 0 })',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);

      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      const operatorText = textElements.find((t) => t.text === 'RepartitionExec');
      expect(operatorText).toBeDefined();
    });

    it('should handle RepartitionExec with round robin partitioning', () => {
      const node: ExecutionPlanNode = {
        operator: 'RepartitionExec',
        properties: {
          partitioning: 'RoundRobinBatch(8)',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle RepartitionExec with children', () => {
      const node: ExecutionPlanNode = {
        operator: 'RepartitionExec',
        properties: {
          partitioning: 'Hash(Column { name: "col1", index: 0 })',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
            },
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
  });

  describe('AggregateExec operator', () => {
    it('should generate AggregateExec with Single mode', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[env@0 as env]',
          aggr: '[count(Int64(1))]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);

      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      const operatorText = textElements.find((t) => t.text === 'AggregateExec');
      expect(operatorText).toBeDefined();
    });

    it('should handle AggregateExec with Partial mode', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Partial',
          gby: '[col1@0]',
          aggr: '[sum(col2@1)]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle AggregateExec with Final mode', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Final',
          gby: '[col1@0]',
          aggr: '[sum(col2@1)]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle AggregateExec with complex gby expressions', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: "[date_bin(INTERVAL '1 hour', timestamp@0) as hour]",
          aggr: '[count(Int64(1))]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle AggregateExec with children', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[env@0]',
          aggr: '[count(Int64(1))]',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
            },
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
  });

  describe('ProjectionExec operator', () => {
    it('should generate ProjectionExec with expr property', () => {
      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        properties: {
          expr: '[env@0 as env, count(Int64(1))@1 as count(*)]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);

      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      const operatorText = textElements.find((t) => t.text === 'ProjectionExec');
      expect(operatorText).toBeDefined();
    });

    it('should handle ProjectionExec with children', () => {
      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        properties: {
          expr: '[col1@0, col2@1]',
        },
        children: [
          {
            operator: 'AggregateExec',
            properties: {
              mode: 'Single',
              gby: '[col1@0]',
            },
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
  });

  describe('SortExec operator', () => {
    it('should generate SortExec with expr property', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortExec',
        properties: {
          expr: '[col1@0 ASC]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);

      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      const operatorText = textElements.find((t) => t.text === 'SortExec');
      expect(operatorText).toBeDefined();
    });

    it('should handle SortExec with preserve_partitioning', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortExec',
        properties: {
          expr: '[col1@0 ASC]',
          preserve_partitioning: 'true',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle SortExec with children', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortExec',
        properties: {
          expr: '[col1@0 ASC]',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
            },
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
  });

  describe('SortPreservingMergeExec operator', () => {
    it('should generate SortPreservingMergeExec', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortPreservingMergeExec',
        properties: {
          expr: '[col1@0 ASC]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);

      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      const operatorText = textElements.find((t) => t.text === 'SortPreservingMergeExec');
      expect(operatorText).toBeDefined();
    });

    it('should handle SortPreservingMergeExec with children', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortPreservingMergeExec',
        properties: {
          expr: '[col1@0 ASC]',
        },
        children: [
          {
            operator: 'SortExec',
            properties: {
              expr: '[col1@0 ASC]',
            },
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
  });

  describe('HashJoinExec operator', () => {
    it('should generate HashJoinExec with join properties', () => {
      const node: ExecutionPlanNode = {
        operator: 'HashJoinExec',
        properties: {
          join_type: 'Inner',
          left_keys: '[col1@0]',
          right_keys: '[col2@0]',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[left.parquet]]',
            },
            children: [],
            level: 1,
          },
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[right.parquet]]',
            },
            children: [],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);

      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      const operatorText = textElements.find((t) => t.text === 'HashJoinExec');
      expect(operatorText).toBeDefined();
    });

    it('should handle HashJoinExec with filter', () => {
      const node: ExecutionPlanNode = {
        operator: 'HashJoinExec',
        properties: {
          join_type: 'Left',
          filter: 'left.col1@0 > right.col2@0',
        },
        children: [
          {
            operator: 'TableScan',
            children: [],
            level: 1,
          },
          {
            operator: 'TableScan',
            children: [],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });
  });

  describe('UnionExec operator', () => {
    it('should generate UnionExec', () => {
      const node: ExecutionPlanNode = {
        operator: 'UnionExec',
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d1.parquet]]',
            },
            children: [],
            level: 1,
          },
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d2.parquet]]',
            },
            children: [],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);

      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      const operatorText = textElements.find((t) => t.text === 'UnionExec');
      expect(operatorText).toBeDefined();
    });

    it('should handle UnionExec with multiple children', () => {
      const node: ExecutionPlanNode = {
        operator: 'UnionExec',
        children: [
          {
            operator: 'TableScan',
            children: [],
            level: 1,
          },
          {
            operator: 'TableScan',
            children: [],
            level: 1,
          },
          {
            operator: 'TableScan',
            children: [],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const rectangles = result.elements.filter((el) => el.type === 'rectangle');
      expect(rectangles.length).toBeGreaterThanOrEqual(4); // 1 parent + 3 children
    });
  });

  describe('edge cases and complex scenarios', () => {
    it('should handle nodes with many children', () => {
      const node: ExecutionPlanNode = {
        operator: 'UnionExec',
        children: Array.from({ length: 5 }, () => ({
          operator: 'TableScan',
          children: [],
          level: 1,
        })),
        level: 0,
      };

      const result = generator.generate(node);
      const rectangles = result.elements.filter((el) => el.type === 'rectangle');
      expect(rectangles.length).toBeGreaterThanOrEqual(6); // 1 parent + 5 children
    });

    it('should handle DataSourceExec with many file groups', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups:
            '10 groups: [[f1.parquet], [f2.parquet], [f3.parquet], [f4.parquet], [f5.parquet], [f6.parquet], [f7.parquet], [f8.parquet], [f9.parquet], [f10.parquet]]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle AggregateExec with multiple aggregation functions', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[col1@0]',
          aggr: '[sum(col2@1), count(col3@2), avg(col4@3)]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle RepartitionExec with multiple output partitions', () => {
      const node: ExecutionPlanNode = {
        operator: 'RepartitionExec',
        properties: {
          partitioning: 'RoundRobinBatch(16)',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
            },
            children: [],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle DataSourceExec with file_groups without match pattern', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: 'some custom format',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      const detailText = textElements.find((t) => t.text.includes('file_groups'));
      expect(detailText).toBeDefined();
    });

    it('should handle FilterExec with projection in filter property', () => {
      const node: ExecutionPlanNode = {
        operator: 'FilterExec',
        properties: {
          filter: 'service@2 = log, projection=[col1, col2]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should handle FilterExec with predicate fallback', () => {
      const node: ExecutionPlanNode = {
        operator: 'FilterExec',
        properties: {
          some_predicate: 'col1@0 = value',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle nodes with 3+ children requiring multiple arrows', () => {
      // Create a scenario where a node has 3 children, each needing multiple input arrows
      const node: ExecutionPlanNode = {
        operator: 'UnionExec',
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(8)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(8)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d2.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(8)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d3.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should handle AggregateExec with ordering mode sorted', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'SingleSorted',
          gby: '[env@0]',
          aggr: '[count(Int64(1))]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle AggregateExec with child output sort order matching', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[env@0]',
          aggr: '[count(Int64(1))]',
        },
        children: [
          {
            operator: 'SortExec',
            properties: {
              expr: '[env@0 ASC]',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                  projection: '[env]',
                  output_ordering: '[env@0 ASC]',
                },
                children: [],
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
    });

    it('should handle DataSourceExec with dynamic filter properties', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: '1 groups: [[d_1.parquet]]',
          predicate: 'service@2 = log',
          pruning_predicate: 'service_null_count@2 != row_count@3',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle parseFileGroups with complex file group format', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups:
            '{3 groups: [[file1.parquet, file2.parquet], [file3.parquet], [file4.parquet, file5.parquet]]}',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle DataSourceExec with file groups that have quotes', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: '{1 groups: [["file with spaces.parquet"]]}',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle createArrowsWithEllipsis with many arrows', () => {
      // Create a scenario that triggers ellipsis (more than 5 arrows)
      const node: ExecutionPlanNode = {
        operator: 'RepartitionExec',
        properties: {
          partitioning: 'RoundRobinBatch(10)',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
            },
            children: [],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle CoalesceBatchesExec with projection columns', () => {
      const node: ExecutionPlanNode = {
        operator: 'CoalesceBatchesExec',
        properties: {
          target_batch_size: '8192',
        },
        children: [
          {
            operator: 'FilterExec',
            properties: {
              filter: 'a > 10',
              projection: '[col1, col2]',
            },
            children: [],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle RepartitionExec with hash partitioning without number match', () => {
      const node: ExecutionPlanNode = {
        operator: 'RepartitionExec',
        properties: {
          partitioning: 'Hash(Column { name: "col1" })',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle nodes with 3+ arrows distribution', () => {
      // Create a scenario that triggers more than 2 arrows distribution
      const node: ExecutionPlanNode = {
        operator: 'UnionExec',
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(3)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle DataSourceExec with dynamic filter (hasDynamicFilter)', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: '1 groups: [[d_1.parquet]]',
          predicate: 'DynamicFilter(service@2 = log)',
          pruning_predicate:
            'service_null_count@2 != row_count@3 AND service_min@0 <= log AND log <= service_max@1',
          required_guarantees: '[service in (log)]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      const ellipses = result.elements.filter((el) => el.type === 'ellipse');
      const dfText = result.elements.find(
        (el): el is ExcalidrawText => el.type === 'text' && el.text === 'DynamicFilter'
      );
      expect(ellipses.length).toBeGreaterThan(0);
      expect(dfText).toBeDefined();
    });

    it('should handle DataSourceExec with single file group', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: '1 groups: [[d_1.parquet]]',
          projection: '[col1, col2]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      // Single group should have arrow positioned at center
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle DataSourceExec projection text with group rectangles', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: '2 groups: [[f1.parquet, f2.parquet], [f3.parquet]]',
          projection: '[col1, col2, col3]',
          output_ordering: '[col1@0 ASC]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should handle DataSourceExec projection text with ellipses only', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: '3 groups: [[f1.parquet], [f2.parquet], [f3.parquet]]',
          projection: '[col1, col2]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle FilterExec with projection columns balancing arrows', () => {
      const node: ExecutionPlanNode = {
        operator: 'FilterExec',
        properties: {
          filter: 'a > 10',
          projection: '[col1, col2, col3, col4, col5]',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
            },
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

    it('should handle FilterExec with 3+ arrows from projection columns', () => {
      const node: ExecutionPlanNode = {
        operator: 'FilterExec',
        properties: {
          filter: 'a > 10',
          projection: '[col1, col2, col3]',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
            },
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

    it('should handle RepartitionExec with Hash format including partition count', () => {
      const node: ExecutionPlanNode = {
        operator: 'RepartitionExec',
        properties: {
          partitioning: 'Hash([col1@0, col2@1], 8)',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      const detailText = textElements.find((t) => t.text.includes('Hash'));
      expect(detailText).toBeDefined();
    });

    it('should handle RepartitionExec with fallback number matching', () => {
      const node: ExecutionPlanNode = {
        operator: 'RepartitionExec',
        properties: {
          partitioning: 'CustomFormat(16)',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle RepartitionExec output arrows positioning', () => {
      const node: ExecutionPlanNode = {
        operator: 'RepartitionExec',
        properties: {
          partitioning: 'RoundRobinBatch(3)',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
            },
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

    it('should handle RepartitionExec with single output arrow', () => {
      const node: ExecutionPlanNode = {
        operator: 'RepartitionExec',
        properties: {
          partitioning: 'RoundRobinBatch(1)',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
            },
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

    it('should handle AggregateExec with ordering_mode=Sorted', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[env@0]',
          aggr: '[count(Int64(1))]',
          ordering_mode: 'Sorted',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      const orderingText = textElements.find((t) => t.text.includes('ordering_mode=Sorted'));
      expect(orderingText).toBeDefined();
    });

    it('should handle AggregateExec with complex gby containing brackets and braces', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[func([nested], {value})@0 as alias]',
          aggr: '[count(Int64(1))]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle AggregateExec detail text with single part', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[col1@0]',
          aggr: '[sum(col2@1)]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should handle AggregateExec with complex aggr parsing', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[col1@0]',
          aggr: '[sum([nested]@1), count({value}@2)]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle AggregateExec with date_bin function in gby', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: "[date_bin(INTERVAL '1 hour', timestamp@0) as hour]",
          aggr: '[count(Int64(1))]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle AggregateExec with child output sort order and function matching', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[sum(col1@0) as total]',
          aggr: '[count(Int64(1))]',
        },
        children: [
          {
            operator: 'SortExec',
            properties: {
              expr: '[sum(col1@0) ASC]',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                  projection: '[col1]',
                  output_ordering: '[sum(col1@0) ASC]',
                },
                children: [],
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
    });

    it('should handle AggregateExec with multiple arrows from child', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[col1@0, col2@1]',
          aggr: '[count(Int64(1))]',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(3)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should handle ProjectionExec with complex expr containing brackets and braces', () => {
      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        properties: {
          expr: '[func([nested], {value})@0 as alias, col2@1]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle ProjectionExec detail text', () => {
      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        properties: {
          expr: '[col1@0 as col1, col2@1 as col2]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should handle ProjectionExec with child having multiple output arrows', () => {
      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        properties: {
          expr: '[col1@0]',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(3)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should handle SortExec with child having multiple output arrows', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortExec',
        properties: {
          expr: '[col1@0 ASC]',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(3)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should handle SortPreservingMergeExec with complex expr parsing', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortPreservingMergeExec',
        properties: {
          expr: '[func([nested], {value})@0 ASC]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle SortPreservingMergeExec detail text', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortPreservingMergeExec',
        properties: {
          expr: '[col1@0 ASC, col2@1 DESC]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should handle SortPreservingMergeExec with child having multiple output arrows', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortPreservingMergeExec',
        properties: {
          expr: '[col1@0 ASC]',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(3)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should handle createArrowsWithEllipsis with not enough space for first arrows', () => {
      // Create a scenario that triggers ellipsis with many arrows and not enough space
      const node: ExecutionPlanNode = {
        operator: 'RepartitionExec',
        properties: {
          partitioning: 'RoundRobinBatch(20)',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
            },
            children: [],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle column coloring break condition', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: '1 groups: [[d_1.parquet]]',
          projection: '[col1, col2, col3, col4, col5, col6, col7, col8, col9, col10]',
          output_ordering: '[col1@0 ASC, col3@2 ASC, col5@4 ASC]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should handle parseFileGroups edge case with invalid format', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: 'invalid format',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle CoalesceBatchesExec with child having multiple output arrows', () => {
      const node: ExecutionPlanNode = {
        operator: 'CoalesceBatchesExec',
        properties: {
          target_batch_size: '8192',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(3)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should handle CoalesceBatchesExec with single arrow from child', () => {
      const node: ExecutionPlanNode = {
        operator: 'CoalesceBatchesExec',
        properties: {
          target_batch_size: '8192',
        },
        children: [
          {
            operator: 'FilterExec',
            properties: {
              filter: 'a > 10',
            },
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

    it('should handle RepartitionExec with 3+ input arrows', () => {
      const node: ExecutionPlanNode = {
        operator: 'RepartitionExec',
        properties: {
          partitioning: 'RoundRobinBatch(4)',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(3)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should handle RepartitionExec with 2 output arrows', () => {
      const node: ExecutionPlanNode = {
        operator: 'RepartitionExec',
        properties: {
          partitioning: 'RoundRobinBatch(2)',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
            },
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

    it('should handle AggregateExec fallback to child columns when no gby or aggr', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
              projection: '[col1, col2]',
            },
            children: [],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle AggregateExec with date_bin in sort order', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: "[date_bin(INTERVAL '1 hour', timestamp@0) as hour]",
          aggr: '[count(Int64(1))]',
        },
        children: [
          {
            operator: 'SortExec',
            properties: {
              expr: '[timestamp@0 ASC]',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                  projection: '[timestamp]',
                  output_ordering: '[timestamp@0 ASC]',
                },
                children: [],
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
    });

    it('should handle SortExec with 3+ arrows from child', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortExec',
        properties: {
          expr: '[col1@0 ASC]',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(4)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should handle AggregateExec with complex gby parsing including brackets', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[func([nested[inner]], {value{inner}})@0]',
          aggr: '[count(Int64(1))]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle ProjectionExec with complex expr parsing including brackets', () => {
      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        properties: {
          expr: '[func([nested[inner]], {value{inner}})@0 as alias]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle SortPreservingMergeExec with complex expr parsing including brackets', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortPreservingMergeExec',
        properties: {
          expr: '[func([nested[inner]], {value{inner}})@0 ASC]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should handle ProjectionExec with child having multiple output arrows (3+)', () => {
      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        properties: {
          expr: '[col1@0]',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(4)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should handle SortPreservingMergeExec with child having multiple output arrows (3+)', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortPreservingMergeExec',
        properties: {
          expr: '[col1@0 ASC]',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(4)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should handle AggregateExec detail text with multiple parts', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[col1@0, col2@1]',
          aggr: '[sum(col3@2), count(col4@3)]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should handle DataSourceExec projection text fallback when no groups or ellipses', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: '1 groups: [[d_1.parquet]]',
          projection: '[col1, col2]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover branch for more than 2 arrows in default node handling', () => {
      // Create a node that triggers the else branch (numArrows > 2)
      const node: ExecutionPlanNode = {
        operator: 'UnknownOperator',
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(3)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThanOrEqual(3);
    });

    it('should cover ellipsis branch with not enough space for first arrows', () => {
      // Create scenario that triggers ellipsis with many arrows where first arrows don't fit
      const node: ExecutionPlanNode = {
        operator: 'RepartitionExec',
        properties: {
          partitioning: 'RoundRobinBatch(15)',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
            },
            children: [],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover ellipsis branch with not enough space for last arrows', () => {
      // Create scenario that triggers ellipsis with many arrows where last arrows don't fit
      const node: ExecutionPlanNode = {
        operator: 'RepartitionExec',
        properties: {
          partitioning: 'RoundRobinBatch(25)',
        },
        children: [
          {
            operator: 'DataSourceExec',
            properties: {
              file_groups: '1 groups: [[d_1.parquet]]',
            },
            children: [],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover column coloring break condition', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: '1 groups: [[d_1.parquet]]',
          projection:
            '[col1, col2, col3, col4, col5, col6, col7, col8, col9, col10, col11, col12, col13, col14, col15, col16, col17, col18, col19, col20]',
          output_ordering:
            '[col1@0 ASC, col3@2 ASC, col5@4 ASC, col7@6 ASC, col9@8 ASC, col11@10 ASC]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover DataSourceExec with exactly 1 group branch', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: '1 groups: [[d_1.parquet]]',
          projection: '[col1, col2]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover DataSourceExec projection text fallback when no groupRects and no ellipseInfo', () => {
      // This is tricky - need to create a scenario where groupRects.length === 0 and ellipseInfo.length === 0
      // This might happen with malformed file_groups
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: '0 groups: []',
          projection: '[col1, col2]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover DataSourceExec projection text fallback for rightmostArrowX', () => {
      // Create scenario where both groupRects and ellipseInfo are empty
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: {
          file_groups: 'invalid format',
          projection: '[col1, col2]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover CoalesceBatchesExec with exactly 2 arrows', () => {
      const node: ExecutionPlanNode = {
        operator: 'CoalesceBatchesExec',
        properties: {
          target_batch_size: '8192',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(2)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should cover CoalesceBatchesExec with 3+ arrows', () => {
      const node: ExecutionPlanNode = {
        operator: 'CoalesceBatchesExec',
        properties: {
          target_batch_size: '8192',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(3)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should cover parseFileGroups with null properties', () => {
      const node: ExecutionPlanNode = {
        operator: 'DataSourceExec',
        properties: undefined,
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover AggregateExec parsing with closing bracket character', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[func([nested])@0]',
          aggr: '[count(Int64(1))]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover AggregateExec parsing with opening brace character', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[func({value})@0]',
          aggr: '[count(Int64(1))]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover AggregateExec parsing with closing brace character', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[func({value})@0]',
          aggr: '[count(Int64(1))]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover AggregateExec fallback when gby format does not match', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: 'invalid format without brackets',
          aggr: '[count(Int64(1))]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should cover AggregateExec column parsing with closing bracket', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[col1@0]',
          aggr: '[sum([nested]@1)]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover AggregateExec column parsing with opening brace', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[col1@0]',
          aggr: '[sum({value}@1)]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover AggregateExec column parsing with closing brace', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[col1@0]',
          aggr: '[sum({value})@1]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover AggregateExec qualifierMatch branch', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[col1@0]',
          aggr: '[sum(table.column)@1]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover AggregateExec with exactly 2 arrows from child', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[col1@0]',
          aggr: '[count(Int64(1))]',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(2)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should cover AggregateExec with 3+ arrows from child', () => {
      const node: ExecutionPlanNode = {
        operator: 'AggregateExec',
        properties: {
          mode: 'Single',
          gby: '[col1@0]',
          aggr: '[count(Int64(1))]',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(4)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should cover ProjectionExec parsing with closing bracket', () => {
      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        properties: {
          expr: '[func([nested])@0 as alias]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover ProjectionExec parsing with opening brace', () => {
      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        properties: {
          expr: '[func({value})@0 as alias]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover ProjectionExec parsing with closing brace', () => {
      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        properties: {
          expr: '[func({value})@0 as alias]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover ProjectionExec fallback when expr format does not match', () => {
      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        properties: {
          expr: 'invalid format without proper brackets',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      const textElements = result.elements.filter((el): el is ExcalidrawText => el.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should cover ProjectionExec with exactly 2 arrows from child', () => {
      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        properties: {
          expr: '[col1@0]',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(2)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should cover ProjectionExec with 3+ arrows from child', () => {
      const node: ExecutionPlanNode = {
        operator: 'ProjectionExec',
        properties: {
          expr: '[col1@0]',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(5)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should cover SortExec with exactly 2 arrows from child', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortExec',
        properties: {
          expr: '[col1@0 ASC]',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(2)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should cover SortExec with 3+ arrows from child', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortExec',
        properties: {
          expr: '[col1@0 ASC]',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(6)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should cover SortPreservingMergeExec parsing with closing bracket', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortPreservingMergeExec',
        properties: {
          expr: '[func([nested])@0 ASC]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover SortPreservingMergeExec parsing with opening brace', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortPreservingMergeExec',
        properties: {
          expr: '[func({value})@0 ASC]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover SortPreservingMergeExec parsing with closing brace', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortPreservingMergeExec',
        properties: {
          expr: '[func({value})@0 ASC]',
        },
        children: [],
        level: 0,
      };

      const result = generator.generate(node);
      expect(result.elements.length).toBeGreaterThan(0);
    });

    it('should cover SortPreservingMergeExec with exactly 2 arrows from child', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortPreservingMergeExec',
        properties: {
          expr: '[col1@0 ASC]',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(2)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should cover SortPreservingMergeExec with 3+ arrows from child', () => {
      const node: ExecutionPlanNode = {
        operator: 'SortPreservingMergeExec',
        properties: {
          expr: '[col1@0 ASC]',
        },
        children: [
          {
            operator: 'RepartitionExec',
            properties: {
              partitioning: 'RoundRobinBatch(7)',
            },
            children: [
              {
                operator: 'DataSourceExec',
                properties: {
                  file_groups: '1 groups: [[d_1.parquet]]',
                },
                children: [],
                level: 2,
              },
            ],
            level: 1,
          },
        ],
        level: 0,
      };

      const result = generator.generate(node);
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBeGreaterThan(0);
    });
  });
});
