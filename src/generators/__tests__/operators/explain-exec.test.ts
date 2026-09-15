import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - ExplainExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should render ExplainExec as a leaf, not unimplemented', () => {
    const node = NodeBuilder.createNodeWithChildren('ExplainExec', []);
    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    TestHelpers.assertHasOperator(result, 'ExplainExec');
    expect(texts).not.toContain('unimplemented');
    TestHelpers.assertHasArrows(result, 0);
  });

  it('should connect to the parent ProjectionExec with one arrow', () => {
    const explain = NodeBuilder.createNodeWithChildren('ExplainExec', []);
    const node = NodeBuilder.createProjectionExec('[plan]', [explain]);
    const result = generator.generate(node);
    TestHelpers.assertHasArrows(result, 1);
  });
});
