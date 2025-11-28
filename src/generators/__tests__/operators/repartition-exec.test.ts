import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - RepartitionExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('RepartitionExec operator', () => {
    it('should generate RepartitionExec with hash partitioning', () => {
      const node = NodeBuilder.createRepartitionExec('Hash(Column { name: "col1", index: 0 })');

      const result = generator.generate(node);

      TestHelpers.assertHasOperator(result, 'RepartitionExec');
    });

    it('should handle RepartitionExec with round robin partitioning', () => {
      const node = NodeBuilder.createRepartitionExec('RoundRobinBatch(8)');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle RepartitionExec with children', () => {
      const node = NodeBuilder.createRepartitionExec('Hash(Column { name: "col1", index: 0 })', [
        NodeBuilder.createDataSourceExec({
          file_groups: '1 groups: [[d_1.parquet]]',
        }),
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });

    it('should display preserve_order=true in red when present', () => {
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
      const textElements = TestHelpers.getTextElements(result.elements);
      const preserveOrderText = textElements.find((t) => t.text === 'preserve_order=true');
      expect(preserveOrderText).toBeDefined();
      expect(preserveOrderText?.strokeColor).toBe('#8B0000'); // Dark red color
    });

    it('should display sort_exprs with column names when present', () => {
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
        {
          preserve_order: 'true',
          sort_exprs: 'f_dkey@0 ASC NULLS LAST, timestamp@1 ASC NULLS LAST',
        }
      );

      const result = generator.generate(node);
      const textElements = TestHelpers.getTextElements(result.elements);
      const sortExprsText = textElements.find((t) => t.text === 'sort_exprs=[f_dkey, timestamp]');
      expect(sortExprsText).toBeDefined();
    });

    it('should handle RepartitionExec with 2 input arrows from child', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(2)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createRepartitionExec('Hash([col1@0], 4)', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle RepartitionExec with 3+ input arrows from child', () => {
      const repartitionChild = NodeBuilder.createRepartitionExec('RoundRobinBatch(3)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 2,
        },
      ]);
      repartitionChild.level = 1;

      const node = NodeBuilder.createRepartitionExec('Hash([col1@0], 4)', [repartitionChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should preserve sort order for non-Hash/RoundRobinBatch partitioning', () => {
      const sortChild = NodeBuilder.createSortExec('[col1@0 ASC]', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
            output_ordering: '[col1@0 ASC]',
          }),
          level: 2,
        },
      ]);
      sortChild.level = 1;

      const node = NodeBuilder.createRepartitionExec('UnknownPartitioning(4)', [sortChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should not preserve sort order for Hash partitioning without preserve_order and multiple partitions', () => {
      const sortChild = NodeBuilder.createSortExec('[col1@0 ASC]', [
        {
          ...NodeBuilder.createRepartitionExec('RoundRobinBatch(3)', [
            {
              ...NodeBuilder.createDataSourceExec({
                file_groups: '1 groups: [[d_1.parquet]]',
                output_ordering: '[col1@0 ASC]',
              }),
              level: 3,
            },
          ]),
          level: 2,
        },
      ]);
      sortChild.level = 1;

      const node = NodeBuilder.createRepartitionExec('Hash([col1@0], 4)', [sortChild]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle RepartitionExec with 2 output arrows', () => {
      const node = NodeBuilder.createRepartitionExec('Hash([col1@0], 2)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle RepartitionExec with 3+ output arrows', () => {
      const node = NodeBuilder.createRepartitionExec('Hash([col1@0], 3)', [
        {
          ...NodeBuilder.createDataSourceExec({
            file_groups: '1 groups: [[d_1.parquet]]',
          }),
          level: 1,
        },
      ]);

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });
  });
});

