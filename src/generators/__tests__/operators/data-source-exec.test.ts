import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - DataSourceExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('DataSourceExec operator', () => {
    it('should generate DataSourceExec with file_groups and projection', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '1 groups: [[d_1.parquet]]',
        projection: '[d_dkey, env, service, host]',
        file_type: 'parquet',
      });

      const result = generator.generate(node);

      TestHelpers.assertHasRectangles(result, 1);
      TestHelpers.assertHasOperator(result, 'DataSourceExec');
    });

    it('should handle DataSourceExec with multiple file groups', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '2 groups: [[d1.parquet], [d2.parquet]]',
        projection: '[d_dkey, env]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle DataSourceExec with 3+ file groups and projection fallback', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups:
          '5 groups: [[f1.parquet], [f2.parquet], [f3.parquet], [f4.parquet], [f5.parquet]]',
        projection: '[col1, col2, col3]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
      expect(TestHelpers.getArrows(result.elements).length).toBe(5);
    });

    it('should handle DataSourceExec with output_ordering', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups: '1 groups: [[d_1.parquet]]',
        projection: '[col1, col2]',
        output_ordering: '[col1@0 ASC]',
      });

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should use the declared group count when the list is truncated', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups:
          '{25 groups: [[a.parquet], [b.parquet], [c.parquet], [d.parquet], [e.parquet], ...]}',
        projection: '[value, f_dkey]',
      });
      const result = generator.generate(node);
      const arrows = TestHelpers.getArrows(result.elements);
      const dots = TestHelpers.getTextElements(result.elements).filter(
        (text) => text.text === '...'
      );
      expect(arrows.length).toBe(4);
      expect(dots.length).toBeGreaterThanOrEqual(1);
    });

    it('should ellipsize arrows when truncated groups contain multiple files', () => {
      const node = NodeBuilder.createDataSourceExec({
        file_groups:
          '{25 groups: [[a/data.parquet, b/data.parquet, c/data.parquet], [d/data.parquet, e/data.parquet, f/data.parquet], [g/data.parquet, h/data.parquet, i/data.parquet], [j/data.parquet, k/data.parquet, l/data.parquet], [m/data.parquet, n/data.parquet, o/data.parquet], ...]}',
        projection: '[value, f_dkey]',
      });
      const result = generator.generate(node);
      const arrows = TestHelpers.getArrows(result.elements);
      const dots = TestHelpers.getTextElements(result.elements).filter(
        (text) => text.text === '...'
      );
      expect(arrows.length).toBe(4);
      expect(dots.length).toBeGreaterThanOrEqual(1);
    });

    it('should pass the declared count to a parent so it can ellipsize', () => {
      const node = NodeBuilder.createNodeWithChildren('ProjectionExec', [
        NodeBuilder.createDataSourceExec({
          file_groups:
            '{25 groups: [[a.parquet], [b.parquet], [c.parquet], [d.parquet], [e.parquet], ...]}',
          projection: '[value]',
        }),
      ]);
      const result = generator.generate(node);
      const arrows = TestHelpers.getArrows(result.elements);
      const dots = TestHelpers.getTextElements(result.elements).filter(
        (text) => text.text === '...'
      );
      // 4 file-group arrows + 4 parent arrows (2 + ... + 2)
      expect(arrows.length).toBe(8);
      expect(dots.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle DataSourceExec with children', () => {
      const node = NodeBuilder.createDataSourceExec(
        {
          file_groups: '1 groups: [[d_1.parquet]]',
        },
        [NodeBuilder.createSimpleNode('TableScan', 1)]
      );

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });
  });
});
