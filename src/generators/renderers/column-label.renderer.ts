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
    if (columns.length === 0) {
      return [];
    }

    const orderedColumns = new Set(sortOrder);
    const fontSize = FONT_SIZES.COLUMN_LABEL;
    const groups: Array<{ text: string; color: string }> = [];
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
      groups.push({
        text: i > 0 ? ', ' + groupParts.join(', ') : groupParts.join(', '),
        color,
      });
      i = j;
    }

    const widths = groups.map((group) => this.textMeasurement.measureText(group.text, fontSize));
    const totalWidth = widths.reduce((sum, width) => sum + width, 0);
    const rightEdge = leftmostArrowX + offset;
    let currentX = rightEdge - totalWidth;
    const groupId = this.idGenerator.generateId();
    const textHeight = TEXT_HEIGHTS.COLUMN_LABEL;
    const elements: ExcalidrawText[] = [];

    for (let g = 0; g < groups.length; g++) {
      const groupTextElement = this.elementFactory.createText({
        id: this.idGenerator.generateId(),
        x: currentX,
        y: arrowMidY - textHeight / 2,
        width: widths[g],
        height: textHeight,
        text: groups[g].text,
        fontSize,
        fontFamily: FONT_FAMILIES.NORMAL,
        textAlign: 'left',
        verticalAlign: 'top',
        strokeColor: groups[g].color,
        containerId: null,
        autoResize: false,
        lineHeight: ELEMENT_DEFAULTS.LINE_HEIGHT,
      });
      groupTextElement.groupIds = [groupId];
      elements.push(groupTextElement);
      currentX += widths[g];
    }

    return elements;
  }
}

