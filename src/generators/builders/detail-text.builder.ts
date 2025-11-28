import { ExcalidrawText } from '../../types/excalidraw.types';
import { ElementFactory } from '../factories/element.factory';
import { IdGenerator } from '../utils/id.generator';
import { FONT_SIZES, TEXT_HEIGHTS, FONT_FAMILIES, ELEMENT_DEFAULTS } from '../constants';

export interface DetailLine {
  text: string;
  color: string;
}

/**
 * Detail Text Builder
 * Builds multi-line detail text with color coding
 */
export class DetailTextBuilder {
  private lines: DetailLine[] = [];

  constructor(
    private elementFactory: ElementFactory,
    private idGenerator: IdGenerator
  ) {}

  /**
   * Adds a line of text with optional color
   */
  addLine(text: string, color?: string): this {
    this.lines.push({
      text,
      color: color || '#1e1e1e', // Default to black
    });
    return this;
  }

  /**
   * Builds text elements from the added lines
   */
  build(x: number, y: number, width: number, containerId?: string | null): ExcalidrawText[] {
    if (this.lines.length === 0) {
      return [];
    }

    const elements: ExcalidrawText[] = [];
    const lineHeight = TEXT_HEIGHTS.DETAILS_LINE;
    let currentY = y;

    for (const line of this.lines) {
      const textId = this.idGenerator.generateId();
      const textElement = this.elementFactory.createText({
        id: textId,
        x,
        y: currentY,
        width,
        height: lineHeight,
        text: line.text,
        fontSize: FONT_SIZES.DETAILS,
        fontFamily: FONT_FAMILIES.NORMAL,
        textAlign: 'center',
        verticalAlign: 'top',
        strokeColor: line.color,
        containerId: containerId || null,
        autoResize: false,
        lineHeight: ELEMENT_DEFAULTS.LINE_HEIGHT,
      });
      elements.push(textElement);
      currentY += lineHeight;
    }

    return elements;
  }

  /**
   * Clears all lines
   */
  clear(): this {
    this.lines = [];
    return this;
  }
}

