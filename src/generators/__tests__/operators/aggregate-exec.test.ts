import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - AggregateExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  describe('AggregateExec operator', () => {
    it('should generate AggregateExec with Single mode', () => {
      const node = NodeBuilder.createAggregateExec('Single', '[env@0 as env]', '[count(Int64(1))]');

      const result = generator.generate(node);

      TestHelpers.assertHasOperator(result, 'AggregateExec');
    });

    it('should handle AggregateExec with Partial mode', () => {
      const node = NodeBuilder.createAggregateExec('Partial', '[col1@0]', '[sum(col2@1)]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle AggregateExec with gby containing braces and brackets', () => {
      const node = NodeBuilder.createAggregateExec(
        'Single',
        '[col1@0, func(col2@1, {param: value})]',
        '[sum(col3@2)]'
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle AggregateExec with Final mode', () => {
      const node = NodeBuilder.createAggregateExec('Final', '[col1@0]', '[sum(col2@1)]');

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle AggregateExec with complex gby expressions', () => {
      const node = NodeBuilder.createAggregateExec(
        'Single',
        '[date_bin(INTERVAL \'1 hour\', timestamp@0) as hour]',
        '[count(Int64(1))]'
      );

      const result = generator.generate(node);
      TestHelpers.assertHasElements(result);
    });

    it('should handle AggregateExec with children', () => {
      const node = NodeBuilder.createAggregateExec(
        'Single',
        '[env@0]',
        '[count(Int64(1))]',
        [
          {
            ...NodeBuilder.createDataSourceExec({
              file_groups: '1 groups: [[d_1.parquet]]',
            }),
            level: 1,
          },
        ]
      );

      const result = generator.generate(node);
      TestHelpers.assertHasArrows(result);
    });
  });
});

