import { ConverterService } from '../converter.service';
import * as fs from 'fs';
import * as path from 'path';

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

  describe('DataSourceExec with SQL EXPLAIN format', () => {
    it('should parse SQL EXPLAIN table format and generate DataSourceExec visualization', () => {
      const sqlExplainText = `EXPLAIN SELECT * FROM dim2_parquet;
+---------------+------------------------------------------------------------------------------------------------------------------------------------+
| plan_type     | plan                                                                                                                                                                                                                                                                                     |
+---------------+------------------------------------------------------------------------------------------------------------------------------------+
| logical_plan  | TableScan: dim2_parquet projection=[d_dkey, env, service, host]                                                                                                                                                                                                                          |
| physical_plan | DataSourceExec: file_groups={2 groups: [[d_1.parquet], [d_2.parquet]]}, projection=[d_dkey, env, service, host], file_type=parquet |
|               |                                                                                                                                                                                                                                                                                          |
+---------------+------------------------------------------------------------------------------------------------------------------------------------+`;

      const result = converter.convert(sqlExplainText);

      expect(result).toBeDefined();
      expect(result.type).toBe('excalidraw');
      expect(result.elements.length).toBeGreaterThan(0);

      // Should have one rectangle for DataSourceExec
      const rectangles = result.elements.filter((el) => el.type === 'rectangle');
      expect(rectangles.length).toBe(1);
      expect(rectangles[0].width).toBe(300);
      expect(rectangles[0].height).toBe(100);

      // Should have ellipses for file groups (D1, D2)
      const ellipses = result.elements.filter((el) => el.type === 'ellipse');
      expect(ellipses.length).toBe(2);

      // Should have arrows from ellipses to rectangle
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBe(2);

      // Should have text elements including DataSourceExec name and projection
      const textElements = result.elements.filter((el) => el.type === 'text');
      const operatorText = textElements.find((t) => t.text === 'DataSourceExec');
      expect(operatorText).toBeDefined();

      // Should have projection text at the middle of the arrows
      const projectionText = textElements.find(
        (t) => t.text.includes('d_dkey') && t.containerId === null
      );
      expect(projectionText).toBeDefined();
      // Verify it's left-aligned
      expect(projectionText?.textAlign).toBe('left');

      // Should have ellipse labels (file names without extension)
      // For templates/1_DataSource.sql: d_1.parquet, d_2.parquet -> "d_1", "d_2"
      const d1Text = textElements.find((t) => t.text === 'd_1' || t.text === 'D1');
      const d2Text = textElements.find((t) => t.text === 'd_2' || t.text === 'D2');
      expect(d1Text).toBeDefined();
      expect(d2Text).toBeDefined();
    });

    it('should generate correct output from templates/1_DataSource.sql file', () => {
      const sqlFilePath = path.join(__dirname, '../../../templates/1_DataSource.sql');
      const expectedFilePath = path.join(__dirname, '../../../templates/1_DataSource.excalidraw');

      if (!fs.existsSync(sqlFilePath) || !fs.existsSync(expectedFilePath)) {
        // Skip test if files don't exist
        return;
      }

      const sqlText = fs.readFileSync(sqlFilePath, 'utf-8');

      const result = converter.convert(sqlText);

      expect(result).toBeDefined();
      expect(result.type).toBe('excalidraw');
      expect(result.version).toBe(2);

      // Verify structure matches expected output
      const rectangles = result.elements.filter((el) => el.type === 'rectangle');
      const ellipses = result.elements.filter((el) => el.type === 'ellipse');
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      const textElements = result.elements.filter((el) => el.type === 'text');

      expect(rectangles.length).toBe(1);
      expect(ellipses.length).toBe(2);
      expect(arrows.length).toBe(2);
      expect(textElements.length).toBeGreaterThan(3);

      // Verify DataSourceExec rectangle dimensions
      const dataSourceRect = rectangles[0];
      expect(dataSourceRect.width).toBe(300);
      expect(dataSourceRect.height).toBe(100);

      // Verify ellipses have correct size
      ellipses.forEach((ellipse) => {
        expect(ellipse.width).toBe(60);
        expect(ellipse.height).toBe(60);
      });
    });

    it('should color projection columns blue when output_ordering is present', () => {
      const sqlExplainText = `EXPLAIN SELECT * FROM fact_parquet_sorted;
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| plan_type     | plan                                                                                                                                                                                                                                                                                                                                                                                                                      |
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| logical_plan  | TableScan: fact_parquet_sorted projection=[f_dkey, timestamp, value]                                                                                                                                                                                                                                                                                                                                                      |
| physical_plan | DataSourceExec: file_groups={3 groups: [[d_1.parquet], [d_2.parquet], [d_3.parquet]]}, projection=[f_dkey, timestamp, value], output_ordering=[f_dkey@0 ASC NULLS LAST, timestamp@1 ASC NULLS LAST], file_type=parquet |
|               |                                                                                                                                                                                                                                                                                                                                                                                                                           |
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+`;

      const result = converter.convert(sqlExplainText);

      expect(result).toBeDefined();
      expect(result.type).toBe('excalidraw');

      // Find projection text elements
      const textElements = result.elements.filter((el) => el.type === 'text');
      const projectionTexts = textElements.filter(
        (t) =>
          t.text &&
          (t.text.includes('f_dkey') || t.text.includes('timestamp') || t.text.includes('value')) &&
          !t.containerId
      );

      expect(projectionTexts.length).toBeGreaterThan(0);

      // Check that ordered columns (f_dkey, timestamp) are blue
      const orderedText = projectionTexts.find(
        (t) => t.text.includes('f_dkey') && t.text.includes('timestamp')
      );
      expect(orderedText).toBeDefined();
      expect(orderedText?.strokeColor).toBe('#1e90ff'); // Blue

      // Check that non-ordered column (value) is black
      const nonOrderedText = projectionTexts.find(
        (t) => t.text.includes('value') && !t.text.includes('f_dkey')
      );
      expect(nonOrderedText).toBeDefined();
      expect(nonOrderedText?.strokeColor).toBe('#1e1e1e'); // Black
    });

    it('should keep all projection columns black when output_ordering is not present', () => {
      const sqlExplainText = `EXPLAIN SELECT * FROM dim2_parquet;
+---------------+------------------------------------------------------------------------------------------------------------------------------------+
| plan_type     | plan                                                                                                                               |
+---------------+------------------------------------------------------------------------------------------------------------------------------------+
| logical_plan  | TableScan: dim2_parquet projection=[d_dkey, env, service, host]                                                                    |
| physical_plan | DataSourceExec: file_groups={2 groups: [[d_1.parquet], [d_2.parquet]]}, projection=[d_dkey, env, service, host], file_type=parquet |
|               |                                                                                                                                    |
+---------------+------------------------------------------------------------------------------------------------------------------------------------+`;

      const result = converter.convert(sqlExplainText);

      expect(result).toBeDefined();

      // Find projection text elements
      const textElements = result.elements.filter((el) => el.type === 'text');
      const projectionTexts = textElements.filter(
        (t) => t.text && t.text.includes('d_dkey') && !t.containerId
      );

      expect(projectionTexts.length).toBeGreaterThan(0);

      // All columns should be black when there's no output_ordering
      projectionTexts.forEach((text) => {
        expect(text.strokeColor).toBe('#1e1e1e'); // Black
      });
    });

    it('should generate correct output from templates/1_DataSource_Sorted_SeveralFiles.sql file', () => {
      const sqlFilePath = path.join(
        __dirname,
        '../../../templates/1_DataSource_Sorted_SeveralFiles.sql'
      );
      const expectedFilePath = path.join(
        __dirname,
        '../../../templates/1_DataSource_Sorted_SeveralFiles.excalidraw'
      );

      if (!fs.existsSync(sqlFilePath) || !fs.existsSync(expectedFilePath)) {
        // Skip test if files don't exist
        return;
      }

      const sqlText = fs.readFileSync(sqlFilePath, 'utf-8');

      const result = converter.convert(sqlText);

      expect(result).toBeDefined();
      expect(result.type).toBe('excalidraw');
      expect(result.version).toBe(2);

      // Verify structure matches expected output
      const rectangles = result.elements.filter((el) => el.type === 'rectangle');
      const ellipses = result.elements.filter((el) => el.type === 'ellipse');
      const arrows = result.elements.filter((el) => el.type === 'arrow');
      const textElements = result.elements.filter((el) => el.type === 'text');

      // Should have 1 DataSourceExec rectangle + 2 dotted rectangles for groups with >1 file
      expect(rectangles.length).toBe(3);
      // Should have 6 ellipses (one per file: f_1, f_4, f_2, f_5, f_6, f_3)
      expect(ellipses.length).toBe(6);
      // Should have 3 arrows (one per group, starting from top of dotted rectangle or ellipse)
      expect(arrows.length).toBe(3);
      expect(textElements.length).toBeGreaterThan(3);

      // Verify DataSourceExec rectangle (solid stroke)
      const dataSourceRect = rectangles.find((r) => r.strokeStyle === 'solid');
      expect(dataSourceRect).toBeDefined();
      expect(dataSourceRect?.width).toBe(300);
      expect(dataSourceRect?.height).toBe(100);

      // Verify dotted rectangles for groups with multiple files (2 groups: [f_1, f_4] and [f_2, f_5, f_6])
      const dottedRects = rectangles.filter((r) => r.strokeStyle === 'dashed');
      expect(dottedRects.length).toBe(2);

      // Verify ellipses have correct size
      ellipses.forEach((ellipse) => {
        expect(ellipse.width).toBe(60);
        expect(ellipse.height).toBe(60);
      });

      // Verify ellipse labels (file names without extension)
      // Group 1: f1.parquet, f4.parquet -> "f1", "f4"
      // Group 2: f2.parquet, f5.parquet, f6.parquet -> "f2", "f5", "f6"
      // Group 3: f3.parquet -> "f3"
      const f1Text = textElements.find((t) => t.text === 'f1');
      const f4Text = textElements.find((t) => t.text === 'f4');
      const f2Text = textElements.find((t) => t.text === 'f2');
      const f5Text = textElements.find((t) => t.text === 'f5');
      const f6Text = textElements.find((t) => t.text === 'f6');
      const f3Text = textElements.find((t) => t.text === 'f3');
      expect(f1Text).toBeDefined();
      expect(f4Text).toBeDefined();
      expect(f2Text).toBeDefined();
      expect(f5Text).toBeDefined();
      expect(f6Text).toBeDefined();
      expect(f3Text).toBeDefined();

      // Verify projection columns are colored correctly (f_dkey, timestamp in blue, value in black)
      const projectionTexts = textElements.filter(
        (t) =>
          t.text &&
          (t.text.includes('f_dkey') || t.text.includes('timestamp') || t.text.includes('value')) &&
          !t.containerId
      );

      expect(projectionTexts.length).toBeGreaterThan(0);

      // Check that ordered columns (f_dkey, timestamp) are blue
      const orderedText = projectionTexts.find(
        (t) => t.text.includes('f_dkey') && t.text.includes('timestamp')
      );
      expect(orderedText).toBeDefined();
      expect(orderedText?.strokeColor).toBe('#1e90ff'); // Blue

      // Check that non-ordered column (value) is black
      const nonOrderedText = projectionTexts.find(
        (t) => t.text.includes('value') && !t.text.includes('f_dkey')
      );
      expect(nonOrderedText).toBeDefined();
      expect(nonOrderedText?.strokeColor).toBe('#1e1e1e'); // Black
    });
  });
});
