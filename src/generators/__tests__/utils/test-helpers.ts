import { ExcalidrawGenerator } from '../../excalidraw.generator';
import { ExcalidrawConfig } from '../../../types/excalidraw.types';
import { ExcalidrawData, ExcalidrawElement, ExcalidrawText } from '../../../types/excalidraw.types';

/**
 * Test helper utilities for common test operations
 */
export class TestHelpers {
  /**
   * Creates a new ExcalidrawGenerator instance with optional configuration
   */
  static createGenerator(config?: ExcalidrawConfig): ExcalidrawGenerator {
    return new ExcalidrawGenerator(config);
  }

  /**
   * Finds an element by type with type assertion
   */
  static findElementByType<T extends ExcalidrawElement>(
    elements: ExcalidrawElement[],
    type: string
  ): T | undefined {
    return elements.find((el) => el.type === type) as T | undefined;
  }

  /**
   * Finds a text element by text content
   */
  static findElementByText(elements: ExcalidrawElement[], text: string): ExcalidrawText | undefined {
    const textElements = elements.filter((el): el is ExcalidrawText => el.type === 'text');
    return textElements.find((t) => t.text === text);
  }

  /**
   * Filters elements by type
   */
  static filterElementsByType(elements: ExcalidrawElement[], type: string): ExcalidrawElement[] {
    return elements.filter((el) => el.type === type);
  }

  /**
   * Gets all text elements
   */
  static getTextElements(elements: ExcalidrawElement[]): ExcalidrawText[] {
    return elements.filter((el): el is ExcalidrawText => el.type === 'text');
  }

  /**
   * Gets all rectangle elements
   */
  static getRectangles(elements: ExcalidrawElement[]): ExcalidrawElement[] {
    return elements.filter((el) => el.type === 'rectangle');
  }

  /**
   * Gets all arrow elements
   */
  static getArrows(elements: ExcalidrawElement[]): ExcalidrawElement[] {
    return elements.filter((el) => el.type === 'arrow');
  }

  /**
   * Gets all ellipse elements
   */
  static getEllipses(elements: ExcalidrawElement[]): ExcalidrawElement[] {
    return elements.filter((el) => el.type === 'ellipse');
  }

  /**
   * Asserts that the result is a valid Excalidraw data structure
   */
  static assertValidExcalidrawData(result: ExcalidrawData): void {
    expect(result.type).toBe('excalidraw');
    expect(result.version).toBe(2);
    expect(result.source).toBe('https://excalidraw.com');
    expect(result.elements).toBeDefined();
    expect(result.appState).toBeDefined();
    expect(result.files).toBeDefined();
  }

  /**
   * Asserts that the result has at least the minimum number of elements
   */
  static assertHasElements(result: ExcalidrawData, minCount?: number): void {
    if (minCount !== undefined) {
      expect(result.elements.length).toBeGreaterThanOrEqual(minCount);
    } else {
      expect(result.elements.length).toBeGreaterThan(0);
    }
  }

  /**
   * Asserts that the result has the expected number of rectangles
   */
  static assertHasRectangles(result: ExcalidrawData, count?: number): void {
    const rectangles = this.getRectangles(result.elements);
    if (count !== undefined) {
      expect(rectangles.length).toBe(count);
    } else {
      expect(rectangles.length).toBeGreaterThan(0);
    }
  }

  /**
   * Asserts that the result has the expected number of arrows
   */
  static assertHasArrows(result: ExcalidrawData, count?: number): void {
    const arrows = this.getArrows(result.elements);
    if (count !== undefined) {
      expect(arrows.length).toBe(count);
    } else {
      expect(arrows.length).toBeGreaterThan(0);
    }
  }

  /**
   * Asserts that the result contains a text element with the specified text
   */
  static assertHasText(result: ExcalidrawData, text: string): void {
    const textElement = this.findElementByText(result.elements, text);
    expect(textElement).toBeDefined();
  }

  /**
   * Asserts that the result contains the operator name as text
   */
  static assertHasOperator(result: ExcalidrawData, operator: string): void {
    this.assertHasText(result, operator);
  }
}

