import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';
import { ExcalidrawArrow, ExcalidrawRectangle } from '../../types/excalidraw.types';

/**
 * InterleaveExec node generator.
 * N children, laid out like UnionExec. Output partitions match one child
 * (first child's arrow count), not the sum — that is the Union contrast.
 */
export class InterleaveNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    const nodeWidth = NODE_DIMENSIONS.DATASOURCE_WIDTH;
    const nodeHeight = NODE_DIMENSIONS.DEFAULT_HEIGHT;

    const rectId = context.idGenerator.generateId();
    const rect = context.elementFactory.createRectangle({
      id: rectId,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      strokeColor: context.config.nodeColor,
      roundnessType: 3,
    });
    context.elements.push(rect);

    const operatorTextElement = context.elementFactory.createText({
      id: context.idGenerator.generateId(),
      x,
      y: y + 5,
      width: nodeWidth,
      height: TEXT_HEIGHTS.OPERATOR,
      text: 'InterleaveExec',
      fontSize: FONT_SIZES.OPERATOR,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    });
    context.elements.push(operatorTextElement);

    let maxChildY = y + nodeHeight + context.config.verticalSpacing;
    let totalInputArrows = 0;
    let firstChildArrowCount = 0;
    let outputColumns: string[] = [];
    let outputSortOrder: string[] = [];
    const childSortOrders: string[][] = [];

    if (node.children.length > 0) {
      const spacing = context.config.horizontalSpacing * 1.5;
      const elementsBeforeChildren = context.elements.length;
      const adjustedVerticalSpacing = (context.config.verticalSpacing * 3) / 5;
      const childY = y + nodeHeight + adjustedVerticalSpacing;
      let currentChildX = x;

      const childrenInfo: Array<{
        childInfo: NodeInfo;
        numArrows: number;
        childTopY: number;
      }> = [];

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childInfo = context.generateChildNode(child, currentChildX, childY, false);

        if (i === 0) {
          outputColumns = [...childInfo.outputColumns];
          firstChildArrowCount = Math.max(1, childInfo.inputArrowCount);
        }
        childSortOrders.push([...childInfo.outputSortOrder]);

        const numArrows = Math.max(1, childInfo.inputArrowCount);
        totalInputArrows += numArrows;

        childrenInfo.push({ childInfo, numArrows, childTopY: childY });
        maxChildY = Math.max(maxChildY, childInfo.y + childInfo.height);
        currentChildX += childInfo.width + spacing;
      }

      outputSortOrder = this.sharedSortOrder(childSortOrders);

      const totalWidth =
        childrenInfo.reduce((sum, info) => sum + info.childInfo.width, 0) +
        (childrenInfo.length - 1) * spacing;
      const startX = x + nodeWidth / 2 - totalWidth / 2;
      const firstChildX = childrenInfo[0].childInfo.x;
      const shiftAmount = startX - firstChildX;

      if (Math.abs(shiftAmount) > 0.1) {
        for (let i = 0; i < childrenInfo.length; i++) {
          childrenInfo[i].childInfo.x += shiftAmount;
        }

        for (let j = elementsBeforeChildren; j < context.elements.length; j++) {
          const element = context.elements[j];

          if (element.type === 'arrow') {
            const arrow = element as ExcalidrawArrow;
            if (arrow.startBinding && arrow.endBinding) {
              element.x += shiftAmount;
            } else {
              element.x += shiftAmount;
              if (arrow.points) {
                for (let k = 0; k < arrow.points.length; k++) {
                  arrow.points[k][0] += shiftAmount;
                }
              }
            }
          } else {
            element.x += shiftAmount;
          }
        }
      }

      const unionBottomLeft = x;
      const unionBottomRight = x + nodeWidth;
      const useCentralRegion = totalInputArrows <= 4;

      let arrowRegionLeft: number;
      let arrowRegionRight: number;
      if (useCentralRegion) {
        const centerRegionWidth = nodeWidth * 0.6;
        const centerRegionLeft = x + nodeWidth / 2 - centerRegionWidth / 2;
        arrowRegionLeft = centerRegionLeft;
        arrowRegionRight = centerRegionLeft + centerRegionWidth;
      } else {
        arrowRegionLeft = unionBottomLeft;
        arrowRegionRight = unionBottomRight;
      }

      let arrowIndex = 0;

      for (let i = 0; i < childrenInfo.length; i++) {
        const { childInfo, numArrows, childTopY } = childrenInfo[i];

        const childRect = context.elements.find(
          (el) => el.id === childInfo.rectId && el.type === 'rectangle'
        ) as ExcalidrawRectangle | undefined;
        const actualChildTopY = childRect ? childRect.y : childTopY;

        const arrowEndPositions: number[] = [];
        if (totalInputArrows === 1) {
          arrowEndPositions.push(x + nodeWidth / 2);
        } else {
          const arrowSpacing = (arrowRegionRight - arrowRegionLeft) / (totalInputArrows - 1);
          for (let j = 0; j < numArrows; j++) {
            arrowEndPositions.push(arrowRegionLeft + arrowIndex * arrowSpacing);
            arrowIndex++;
          }
        }

        const childLeft = childInfo.x;
        const childRight = childInfo.x + childInfo.width;
        const arrowStartPositions: number[] = [];
        if (numArrows === 1) {
          arrowStartPositions.push(childInfo.x + childInfo.width / 2);
        } else {
          const childArrowSpacing = (childRight - childLeft) / (numArrows - 1);
          for (let j = 0; j < numArrows; j++) {
            arrowStartPositions.push(childLeft + j * childArrowSpacing);
          }
        }

        const rectangleBottom = y + nodeHeight;
        const childTop = actualChildTopY;

        for (let j = 0; j < numArrows; j++) {
          const arrowId = context.idGenerator.generateId();
          const startX = arrowStartPositions[j];
          const endX = arrowEndPositions[j];
          const arrow = context.elementFactory.createArrow({
            id: arrowId,
            startX,
            startY: childTop,
            endX,
            endY: rectangleBottom,
            childRectId: childInfo.rectId,
            parentRectId: rectId,
            strokeColor: context.config.arrowColor,
          });
          context.elements.push(arrow);
          this.bindArrowToElements(context, arrowId, [childInfo.rectId, rectId]);
        }

        if (childInfo.outputColumns && childInfo.outputColumns.length > 0 && numArrows > 0) {
          const arrowMidY = (childTop + rectangleBottom) / 2;
          const rightOffset = 5;
          const rightmostArrowX = Math.max(...arrowEndPositions);
          const projectionTextX = rightmostArrowX + rightOffset;

          const orderedColumns = new Set(childInfo.outputSortOrder || []);
          const groupId = context.idGenerator.generateId();
          let currentX = projectionTextX;
          const fontSize = FONT_SIZES.COLUMN_LABEL;

          let colIndex = 0;
          while (colIndex < childInfo.outputColumns.length) {
            const column = childInfo.outputColumns[colIndex];
            const isOrdered = orderedColumns.has(column);
            const color = isOrdered ? '#1e90ff' : context.config.nodeColor;

            const groupParts: string[] = [column];
            let k = colIndex + 1;
            while (k < childInfo.outputColumns.length) {
              const nextColumn = childInfo.outputColumns[k];
              const nextIsOrdered = orderedColumns.has(nextColumn);
              const nextColor = nextIsOrdered ? '#1e90ff' : context.config.nodeColor;
              if (nextColor === color) {
                groupParts.push(nextColumn);
                k++;
              } else {
                break;
              }
            }

            const groupText = colIndex > 0 ? ', ' + groupParts.join(', ') : groupParts.join(', ');
            const groupTextId = context.idGenerator.generateId();
            const groupWidth = context.textMeasurement.measureText(groupText, fontSize);
            const groupTextElement = context.elementFactory.createText({
              id: groupTextId,
              x: currentX,
              y: arrowMidY - TEXT_HEIGHTS.COLUMN_LABEL / 2,
              width: groupWidth,
              height: TEXT_HEIGHTS.COLUMN_LABEL,
              text: groupText,
              fontSize: fontSize,
              fontFamily: FONT_FAMILIES.NORMAL,
              textAlign: 'left',
              verticalAlign: 'top',
              strokeColor: color,
            });
            groupTextElement.groupIds = childInfo.groupId ? [groupId, childInfo.groupId] : [groupId];
            context.elements.push(groupTextElement);
            currentX += groupWidth;

            colIndex = k;
          }
        }
      }
    }

    // Interleave keeps hash buckets aligned: output arrows = first child, not the sum.
    const outputArrowCount = node.children.length > 0 ? firstChildArrowCount : 0;
    const { positions: outputArrowPositions, fullCount } =
      context.arrowCalculator.calculateOutputArrowPositions(outputArrowCount, x, nodeWidth);

    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: fullCount,
      inputArrowPositions: outputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }

  private sharedSortOrder(childSortOrders: string[][]): string[] {
    if (childSortOrders.length === 0) {
      return [];
    }
    const first = childSortOrders[0];
    const allMatch = childSortOrders.every(
      (order) => order.length === first.length && order.every((col, i) => col === first[i])
    );
    return allMatch ? [...first] : [];
  }
}
