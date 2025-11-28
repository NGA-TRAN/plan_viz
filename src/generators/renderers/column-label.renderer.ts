import { ExcalidrawText } from '../../types/excalidraw.types';
import { ElementFactory } from '../factories/element.factory';
import { TextMeasurement } from '../utils/text-measurement';
import { IdGenerator } from '../utils/id.generator';
import { COLORS, FONT_SIZES, TEXT_HEIGHTS, FONT_FAMILIES, ELEMENT_DEFAULTS } from '../constants';

export interface ColumnLabelOptions {
  columns: string[];
  sortOrder: string[];
  position: { x: number; y: number };
  alignment: 'left' | 'right';
  nodeColor: string;
}

/**
 * Column Label Renderer
 * Renders column labels next to arrows with color coding for ordered columns
 */
export class ColumnLabelRenderer {
  constructor(
    private elementFactory: ElementFactory,
    private textMeasurement: TextMeasurement,
    private idGenerator: IdGenerator
  ) {}

  /**
   * Renders column labels with color coding
   * Ordered columns are colored blue, others use the default node color
   */
  renderLabels(options: ColumnLabelOptions): ExcalidrawText[] {
    const { columns, sortOrder, position, alignment, nodeColor } = options;
    if (columns.length === 0) {
      return [];
    }

    const orderedColumns = new Set(sortOrder);
    const groupId = this.idGenerator.generateId();
    const fontSize = FONT_SIZES.COLUMN_LABEL;
    const textHeight = TEXT_HEIGHTS.COLUMN_LABEL;
    const elements: ExcalidrawText[] = [];
    let currentX = position.x;

    let i = 0;
    while (i < columns.length) {
      const column = columns[i];
      const isOrdered = orderedColumns.has(column);
      const color = isOrdered ? COLORS.ORDERED_COLUMN : nodeColor;

      // Group consecutive columns with the same color
      const groupParts: string[] = [column];
      let j = i + 1;
      while (j < columns.length) {
        const nextColumn = columns[j];
        const nextIsOrdered = orderedColumns.has(nextColumn);
        const nextColor = nextIsOrdered ? COLORS.ORDERED_COLUMN : nodeColor;
        if (nextColor === color) {
          groupParts.push(nextColumn);
          j++;
        } else {
          break;
        }
      }

      // Create text element for grouped columns
      const groupText = i > 0 ? ', ' + groupParts.join(', ') : groupParts.join(', ');
      const groupWidth = this.textMeasurement.measureText(groupText, fontSize);
      const groupTextId = this.idGenerator.generateId();

      const groupTextElement = this.elementFactory.createText({
        id: groupTextId,
        x: currentX,
        y: position.y - textHeight / 2,
        width: groupWidth,
        height: textHeight,
        text: groupText,
        fontSize,
        fontFamily: FONT_FAMILIES.NORMAL,
        textAlign: alignment,
        verticalAlign: 'top',
        strokeColor: color,
        containerId: null,
        autoResize: false,
        lineHeight: ELEMENT_DEFAULTS.LINE_HEIGHT,
      });

      // Add group ID for grouping related text elements
      groupTextElement.groupIds = [groupId];
      elements.push(groupTextElement);

      if (alignment === 'left') {
        currentX += groupWidth;
      } else {
        currentX -= groupWidth;
      }

      i = j;
    }

    return elements;
  }

  /**
   * Renders column labels positioned to the right of arrows
   */
  renderLabelsRight(
    columns: string[],
    sortOrder: string[],
    arrowMidY: number,
    rightmostArrowX: number,
    nodeColor: string,
    offset: number = 5
  ): ExcalidrawText[] {
    return this.renderLabels({
      columns,
      sortOrder,
      position: {
        x: rightmostArrowX + offset,
        y: arrowMidY,
      },
      alignment: 'left',
      nodeColor,
    });
  }

  /**
   * Renders column labels positioned to the left of arrows
   */
  renderLabelsLeft(
    columns: string[],
    sortOrder: string[],
    arrowMidY: number,
    leftmostArrowX: number,
    nodeColor: string,
    offset: number = -5
  ): ExcalidrawText[] {
    // For left alignment, we need to calculate total width first
    const orderedColumns = new Set(sortOrder);
    // const fontSize = FONT_SIZES.COLUMN_LABEL;
    // let totalWidth = 0;

    // Calculate total width
    let i = 0;
    while (i < columns.length) {
      const column = columns[i];
      const isOrdered = orderedColumns.has(column);
      const color = isOrdered ? COLORS.ORDERED_COLUMN : nodeColor;

      const groupParts: string[] = [column];
      let j = i + 1;
      while (j < columns.length) {
        const nextColumn = columns[j];
        const nextIsOrdered = orderedColumns.has(nextColumn);
        const nextColor = nextIsOrdered ? COLORS.ORDERED_COLUMN : nodeColor;
        if (nextColor === color) {
          groupParts.push(nextColumn);
          j++;
        } else {
          break;
        }
      }

      // const groupText = i > 0 ? ', ' + groupParts.join(', ') : groupParts.join(', ');
      // totalWidth += this.textMeasurement.measureText(groupText, fontSize);
      i = j;
    }

    // Start from the rightmost position and work backwards
    const startX = leftmostArrowX + offset;
    return this.renderLabels({
      columns,
      sortOrder,
      position: {
        x: startX,
        y: arrowMidY,
      },
      alignment: 'right',
      nodeColor,
    });
  }
}

