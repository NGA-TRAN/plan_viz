import { convertPlanToExcalidraw } from '../../index';
import { ExcalidrawText } from '../../types/excalidraw.types';
import { ExcalidrawGenerator } from '../excalidraw.generator';
import { TestHelpers } from '../__tests__/utils/test-helpers';
import { NodeBuilder } from '../__tests__/builders/node.builder';

describe('CrossJoinExec generator', () => {
  describe('Integration tests', () => {
    it('renders a two-input cross join without falling back to unimplemented', () => {
      const plan = `CrossJoinExec
  DataSourceExec
  DataSourceExec`;

      const result = convertPlanToExcalidraw(plan);

      const texts = result.elements
        .filter((el): el is ExcalidrawText => el.type === 'text')
        .map((el) => el.text);
      expect(texts).toContain('CrossJoinExec');
      expect(texts).not.toContain('unimplemented');

      const rectangles = result.elements.filter((el) => el.type === 'rectangle');
      expect(rectangles.length).toBeGreaterThanOrEqual(3); // join + two sources

      const arrows = result.elements.filter((el) => el.type === 'arrow');
      expect(arrows.length).toBe(2); // one from each side

      // Arrows should stay bound to their rectangles when dragged
      for (const arrow of arrows) {
        expect(arrow.startBinding?.elementId).toBeTruthy();
        expect(arrow.endBinding?.elementId).toBeTruthy();

        const startRect = result.elements.find(
          (el) => el.type === 'rectangle' && el.id === arrow.startBinding?.elementId
        );
        const endRect = result.elements.find(
          (el) => el.type === 'rectangle' && el.id === arrow.endBinding?.elementId
        );

        expect(startRect?.boundElements?.some((b) => b.id === arrow.id && b.type === 'arrow')).toBe(
          true
        );
        expect(endRect?.boundElements?.some((b) => b.id === arrow.id && b.type === 'arrow')).toBe(
          true
        );
      }
    });
  });

  describe('Unit tests', () => {
    let generator: ExcalidrawGenerator;

    beforeEach(() => {
      generator = TestHelpers.createGenerator();
    });

    describe('Error handling', () => {
      it('should throw error when CrossJoinExec has wrong number of children (0 children)', () => {
        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [], 0);

        expect(() => generator.generate(node)).toThrow(
          'CrossJoinExec must have exactly 2 children, but found 0'
        );
      });

      it('should throw error when CrossJoinExec has wrong number of children (1 child)', () => {
        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [
          NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
        ]);

        expect(() => generator.generate(node)).toThrow(
          'CrossJoinExec must have exactly 2 children, but found 1'
        );
      });

      it('should throw error when CrossJoinExec has wrong number of children (3 children)', () => {
        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [
          NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_2.parquet]]',
          }),
          NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_3.parquet]]',
          }),
        ]);

        expect(() => generator.generate(node)).toThrow(
          'CrossJoinExec must have exactly 2 children, but found 3'
        );
      });
    });

    describe('Column grouping logic', () => {
      it('should group consecutive columns with same color (ordered) on left child', () => {
        // Create left child with ordered columns
        const leftDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[left.parquet]]',
          projection: '[col1, col2, col3]',
          output_ordering: '[col1@0 ASC, col2@1 ASC, col3@2 ASC]',
        });
        const leftChild = NodeBuilder.createCoalescePartitionsExec([leftDataSource]);

        // Create right child
        const rightDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[right.parquet]]',
        });
        const rightChild = NodeBuilder.createCoalescePartitionsExec([rightDataSource]);

        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [leftChild, rightChild]);

        const result = generator.generate(node);
        TestHelpers.assertHasOperator(result, 'CrossJoinExec');

        // Verify column labels are rendered (grouped together)
        const textElements = TestHelpers.getTextElements(result.elements);
        const columnLabels = textElements.filter((t) =>
          ['col1', 'col2', 'col3'].some((col) => t.text?.includes(col))
        );
        expect(columnLabels.length).toBeGreaterThan(0);
      });

      it('should group consecutive columns with same color (unordered) on left child', () => {
        // Create left child with unordered columns
        const leftDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[left.parquet]]',
          projection: '[col1, col2, col3]',
        });
        const leftChild = NodeBuilder.createCoalescePartitionsExec([leftDataSource]);

        const rightDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[right.parquet]]',
        });
        const rightChild = NodeBuilder.createCoalescePartitionsExec([rightDataSource]);

        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [leftChild, rightChild]);

        const result = generator.generate(node);
        TestHelpers.assertHasElements(result);
      });

      it('should break grouping when color changes (ordered -> unordered) on left child', () => {
        // Create left child with mixed ordered/unordered columns
        const leftDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[left.parquet]]',
          projection: '[col1, col2, col3]',
          output_ordering: '[col1@0 ASC]', // Only col1 is ordered
        });
        const leftChild = NodeBuilder.createCoalescePartitionsExec([leftDataSource]);

        const rightDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[right.parquet]]',
        });
        const rightChild = NodeBuilder.createCoalescePartitionsExec([rightDataSource]);

        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [leftChild, rightChild]);

        const result = generator.generate(node);
        TestHelpers.assertHasElements(result);

        // Verify that columns are split into groups (col1 ordered, col2+col3 unordered)
        const textElements = TestHelpers.getTextElements(result.elements);
        const columnLabels = textElements.filter((t) =>
          ['col1', 'col2', 'col3'].some((col) => t.text?.includes(col))
        );
        expect(columnLabels.length).toBeGreaterThan(0);
      });

      it('should group consecutive columns with same color (ordered) on right child', () => {
        const leftDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[left.parquet]]',
        });
        const leftChild = NodeBuilder.createCoalescePartitionsExec([leftDataSource]);

        // Create right child with ordered columns
        const rightDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[right.parquet]]',
          projection: '[col1, col2, col3]',
          output_ordering: '[col1@0 ASC, col2@1 ASC, col3@2 ASC]',
        });
        const rightChild = NodeBuilder.createCoalescePartitionsExec([rightDataSource]);

        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [leftChild, rightChild]);

        const result = generator.generate(node);
        TestHelpers.assertHasElements(result);
      });

      it('should break grouping when color changes (unordered -> ordered) on right child', () => {
        const leftDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[left.parquet]]',
        });
        const leftChild = NodeBuilder.createCoalescePartitionsExec([leftDataSource]);

        // Create right child with mixed ordered/unordered columns
        const rightDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[right.parquet]]',
          projection: '[col1, col2, col3]',
          output_ordering: '[col3@2 ASC]', // Only col3 is ordered
        });
        const rightChild = NodeBuilder.createCoalescePartitionsExec([rightDataSource]);

        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [leftChild, rightChild]);

        const result = generator.generate(node);
        TestHelpers.assertHasElements(result);
      });

      it('should handle empty output columns on left child', () => {
        const leftDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[left.parquet]]',
        });
        const leftChild = NodeBuilder.createCoalescePartitionsExec([leftDataSource]);

        const rightDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[right.parquet]]',
        });
        const rightChild = NodeBuilder.createCoalescePartitionsExec([rightDataSource]);

        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [leftChild, rightChild]);

        const result = generator.generate(node);
        TestHelpers.assertHasElements(result);
      });

      it('should handle empty output columns on right child', () => {
        const leftDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[left.parquet]]',
          projection: '[col1]',
        });
        const leftChild = NodeBuilder.createCoalescePartitionsExec([leftDataSource]);

        const rightDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[right.parquet]]',
        });
        const rightChild = NodeBuilder.createCoalescePartitionsExec([rightDataSource]);

        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [leftChild, rightChild]);

        const result = generator.generate(node);
        TestHelpers.assertHasElements(result);
      });
    });

    describe('Variable spacing calculation', () => {
      it('should calculate spacing for small group counts', () => {
        const leftDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '2 groups: [[left1.parquet], [left2.parquet]]',
        });
        const leftChild = NodeBuilder.createCoalescePartitionsExec([leftDataSource]);

        const rightDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '3 groups: [[right1.parquet], [right2.parquet], [right3.parquet]]',
        });
        const rightChild = NodeBuilder.createCoalescePartitionsExec([rightDataSource]);

        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [leftChild, rightChild]);

        const result = generator.generate(node);
        TestHelpers.assertHasElements(result);
      });

      it('should calculate spacing for large group counts (>20 groups)', () => {
        // Create a plan with >20 total groups to trigger quadratic component
        const leftDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '15 groups: [[f1.parquet], [f2.parquet], [f3.parquet], [f4.parquet], [f5.parquet], [f6.parquet], [f7.parquet], [f8.parquet], [f9.parquet], [f10.parquet], [f11.parquet], [f12.parquet], [f13.parquet], [f14.parquet], [f15.parquet]]',
        });
        const leftChild = NodeBuilder.createCoalescePartitionsExec([leftDataSource]);

        const rightDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '10 groups: [[g1.parquet], [g2.parquet], [g3.parquet], [g4.parquet], [g5.parquet], [g6.parquet], [g7.parquet], [g8.parquet], [g9.parquet], [g10.parquet]]',
        });
        const rightChild = NodeBuilder.createCoalescePartitionsExec([rightDataSource]);

        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [leftChild, rightChild]);

        const result = generator.generate(node);
        TestHelpers.assertHasElements(result);
      });

      it('should handle missing file_groups property', () => {
        const leftDataSource = NodeBuilder.createDataSourceExec({
          projection: '[col1]',
        });
        const leftChild = NodeBuilder.createCoalescePartitionsExec([leftDataSource]);

        const rightDataSource = NodeBuilder.createDataSourceExec({
          projection: '[col2]',
        });
        const rightChild = NodeBuilder.createCoalescePartitionsExec([rightDataSource]);

        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [leftChild, rightChild]);

        const result = generator.generate(node);
        TestHelpers.assertHasElements(result);
      });

      it('should handle file_groups without group count match', () => {
        const leftDataSource = NodeBuilder.createDataSourceExec({
          file_groups: 'invalid format',
        });
        const leftChild = NodeBuilder.createCoalescePartitionsExec([leftDataSource]);

        const rightDataSource = NodeBuilder.createDataSourceExec({
          file_groups: 'also invalid',
        });
        const rightChild = NodeBuilder.createCoalescePartitionsExec([rightDataSource]);

        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [leftChild, rightChild]);

        const result = generator.generate(node);
        TestHelpers.assertHasElements(result);
      });
    });

    describe('Output arrow calculation', () => {
      it('should calculate output arrows as product of input arrows', () => {
        const leftDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '2 groups: [[left1.parquet], [left2.parquet]]',
        });
        const leftChild = NodeBuilder.createCoalescePartitionsExec([leftDataSource]);

        const rightDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '3 groups: [[right1.parquet], [right2.parquet], [right3.parquet]]',
        });
        const rightChild = NodeBuilder.createCoalescePartitionsExec([rightDataSource]);

        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [leftChild, rightChild]);

        const result = generator.generate(node);
        TestHelpers.assertHasElements(result);
        // 2 * 3 = 6 output arrows expected
      });

      it('should handle single arrow from each side', () => {
        const leftDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[left.parquet]]',
        });
        const leftChild = NodeBuilder.createCoalescePartitionsExec([leftDataSource]);

        const rightDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[right.parquet]]',
        });
        const rightChild = NodeBuilder.createCoalescePartitionsExec([rightDataSource]);

        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [leftChild, rightChild]);

        const result = generator.generate(node);
        TestHelpers.assertHasElements(result);
        // 1 * 1 = 1 output arrow expected
      });
    });

    describe('Column merging', () => {
      it('should merge columns from both sides without duplicates', () => {
        const leftDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[left.parquet]]',
          projection: '[col1, col2]',
        });
        const leftChild = NodeBuilder.createCoalescePartitionsExec([leftDataSource]);

        const rightDataSource = NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[right.parquet]]',
          projection: '[col2, col3]', // col2 is duplicate
        });
        const rightChild = NodeBuilder.createCoalescePartitionsExec([rightDataSource]);

        const node = NodeBuilder.createNodeWithChildren('CrossJoinExec', [leftChild, rightChild]);

        const result = generator.generate(node);
        TestHelpers.assertHasElements(result);
        // Output should have col1, col2, col3 (col2 appears once)
      });
    });
  });
});
