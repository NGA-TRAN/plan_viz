import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - WorkTableExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should render WorkTableExec with name, not unimplemented', () => {
    const node = NodeBuilder.createNodeWithChildren('WorkTableExec', [], 0, { name: 'cte' });
    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    TestHelpers.assertHasOperator(result, 'WorkTableExec');
    expect(texts.some((text) => text.includes('name=cte'))).toBe(true);
    expect(texts).not.toContain('unimplemented');
  });

  it('should emit one output arrow under a ProjectionExec', () => {
    const leaf = NodeBuilder.createNodeWithChildren('WorkTableExec', [], 1, { name: 'cte' });
    const node = NodeBuilder.createProjectionExec('[id]', [leaf]);
    const result = generator.generate(node);
    TestHelpers.assertHasArrows(result, 1);
  });
});
