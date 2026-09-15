import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - RecursiveQueryExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should render RecursiveQueryExec with two children, not unimplemented', () => {
    const node = NodeBuilder.createNodeWithChildren(
      'RecursiveQueryExec',
      [
        NodeBuilder.createNodeWithChildren('PlaceholderRowExec', []),
        NodeBuilder.createNodeWithChildren('WorkTableExec', [], 1, { name: 'cte' }),
      ],
      0,
      { name: 'cte', is_distinct: 'false' }
    );
    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    TestHelpers.assertHasOperator(result, 'RecursiveQueryExec');
    expect(texts.some((text) => text.includes('name=cte'))).toBe(true);
    expect(texts.some((text) => text.includes('is_distinct=false'))).toBe(true);
    expect(texts).not.toContain('unimplemented');
  });

  it('should throw when child count is not two', () => {
    const node = NodeBuilder.createNodeWithChildren('RecursiveQueryExec', [
      NodeBuilder.createNodeWithChildren('PlaceholderRowExec', []),
    ]);
    expect(() => generator.generate(node)).toThrow(/exactly 2 children/);
  });
});
