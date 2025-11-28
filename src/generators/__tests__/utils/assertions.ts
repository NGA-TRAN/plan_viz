import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { ExcalidrawData } from '../../../types/excalidraw.types';
import { ExecutionPlanNode } from '../../../types/execution-plan.types';
import { TestHelpers } from './test-helpers';

/**
 * Test assertion helpers for common test patterns
 */
export class TestAssertions {
  /**
   * Asserts that generator produces valid Excalidraw data for a node
   */
  static assertGeneratesValidExcalidraw(
    generator: ExcalidrawGenerator,
    node: ExecutionPlanNode | null
  ): void {
    const result = generator.generate(node);
    TestHelpers.assertValidExcalidrawData(result);
  }

  /**
   * Asserts that result contains operator text
   */
  static assertHasOperatorText(result: ExcalidrawData, operator: string): void {
    TestHelpers.assertHasOperator(result, operator);
  }

  /**
   * Asserts that result contains property text (partial match)
   */
  static assertHasPropertyText(result: ExcalidrawData, property: string): void {
    const textElements = TestHelpers.getTextElements(result.elements);
    const hasProperty = textElements.some((t) => t.text?.includes(property));
    expect(hasProperty).toBe(true);
  }

  /**
   * Asserts that result has the expected number of arrows
   */
  static assertHasArrows(result: ExcalidrawData, expectedCount?: number): void {
    TestHelpers.assertHasArrows(result, expectedCount);
  }

  /**
   * Asserts that result has the expected number of rectangles
   */
  static assertHasRectangles(result: ExcalidrawData, expectedCount?: number): void {
    TestHelpers.assertHasRectangles(result, expectedCount);
  }

  /**
   * Asserts that result contains a specific text element
   */
  static assertHasTextElement(result: ExcalidrawData, text: string): void {
    TestHelpers.assertHasText(result, text);
  }

  /**
   * Asserts that a text element has a specific color
   */
  static assertTextColor(result: ExcalidrawData, text: string, color: string): void {
    const textElement = TestHelpers.findElementByText(result.elements, text);
    expect(textElement).toBeDefined();
    expect(textElement?.strokeColor).toBe(color);
  }

  /**
   * Asserts that result has elements (basic generation check)
   */
  static assertGeneratesElements(
    generator: ExcalidrawGenerator,
    node: ExecutionPlanNode
  ): void {
    const result = generator.generate(node);
    TestHelpers.assertHasElements(result);
  }
}

