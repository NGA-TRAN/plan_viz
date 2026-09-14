import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - PlaceholderRowExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should render PlaceholderRowExec with produce_one_row=true', () => {
    const node = NodeBuilder.createNodeWithChildren('PlaceholderRowExec', []);
    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    TestHelpers.assertHasOperator(result, 'PlaceholderRowExec');
    expect(texts).toContain('produce_one_row=true');
    expect(texts).not.toContain('unimplemented');
  });

  it('should emit one output arrow under a ProjectionExec', () => {
    const leaf = NodeBuilder.createNodeWithChildren('PlaceholderRowExec', []);
    const node = NodeBuilder.createProjectionExec('[Int64(1)]', [leaf]);

    const result = generator.generate(node);
    TestHelpers.assertHasArrows(result, 1);
  });
});
