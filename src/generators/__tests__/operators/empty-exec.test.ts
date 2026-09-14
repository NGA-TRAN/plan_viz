import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { TestHelpers } from '../utils/test-helpers';
import { NodeBuilder } from '../builders/node.builder';

describe('ExcalidrawGenerator - EmptyExec', () => {
  let generator: ExcalidrawGenerator;

  beforeEach(() => {
    generator = TestHelpers.createGenerator();
  });

  it('should render EmptyExec as a leaf, not unimplemented', () => {
    const node = NodeBuilder.createNodeWithChildren('EmptyExec', [], 0);
    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    TestHelpers.assertHasOperator(result, 'EmptyExec');
    expect(texts).toContain('empty');
    expect(texts).not.toContain('unimplemented');
    // Root never draws outgoing arrows.
    TestHelpers.assertHasArrows(result, 0);
  });

  it('should connect to the parent ProjectionExec with one arrow', () => {
    const empty = NodeBuilder.createNodeWithChildren('EmptyExec', [], 1, {
      produce_one_row: 'false',
    });
    const node = NodeBuilder.createProjectionExec('[id]', [empty]);

    const result = generator.generate(node);
    const texts = TestHelpers.getTextElements(result.elements).map((t) => t.text);
    expect(texts.some((text) => text.includes('produce_one_row=false'))).toBe(true);
    TestHelpers.assertHasArrows(result, 1);
  });
});
