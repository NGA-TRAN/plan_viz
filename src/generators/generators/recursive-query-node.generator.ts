import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';

/**
 * RecursiveQueryExec: static term (left) and recursive term (right).
 * DataFusion requires a single partition on both sides; output is one stream.
 */
export class RecursiveQueryNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    const nodeWidth = NODE_DIMENSIONS.DATASOURCE_WIDTH;
    const nodeHeight = NODE_DIMENSIONS.SORT_MERGE_JOIN_HEIGHT;

    const rectId = context.idGenerator.generateId();
    context.elements.push(
      context.elementFactory.createRectangle({
        id: rectId,
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
        strokeColor: context.config.nodeColor,
        roundnessType: 3,
      })
    );

    context.elements.push(
      context.elementFactory.createText({
        id: context.idGenerator.generateId(),
        x,
        y: y + 5,
        width: nodeWidth,
        height: TEXT_HEIGHTS.OPERATOR,
        text: 'RecursiveQueryExec',
        fontSize: FONT_SIZES.OPERATOR,
        fontFamily: FONT_FAMILIES.BOLD,
        textAlign: 'center',
        verticalAlign: 'top',
        containerId: rectId,
        strokeColor: context.config.nodeColor,
      })
    );

    const details: string[] = [];
    if (node.properties?.name) {
      details.push(`name=${node.properties.name}`);
    }
    if (node.properties?.is_distinct) {
      details.push(`is_distinct=${node.properties.is_distinct}`);
    }
    if (details.length > 0) {
      context.elements.push(
        context.elementFactory.createText({
          id: context.idGenerator.generateId(),
          x: x + 10,
          y: y + 35,
          width: nodeWidth - 20,
          height: details.length * TEXT_HEIGHTS.DETAILS_LINE,
          text: details.join('\n'),
          fontSize: FONT_SIZES.DETAILS,
          fontFamily: FONT_FAMILIES.NORMAL,
          textAlign: 'center',
          verticalAlign: 'top',
          strokeColor: context.config.nodeColor,
        })
      );
    }

    if (node.children.length !== 2) {
      throw new Error(
        `RecursiveQueryExec must have exactly 2 children, but found ${node.children.length}`
      );
    }

    const childY = y + nodeHeight + context.config.verticalSpacing;
    const leftX = x - nodeWidth - context.config.horizontalSpacing;
    const rightX = x + nodeWidth + context.config.horizontalSpacing;
    const leftInfo = context.generateChildNode(node.children[0], leftX, childY, false);
    const rightInfo = context.generateChildNode(node.children[1], rightX, childY, false);

    const parentBottomY = y + nodeHeight;
    const centerRegionWidth = nodeWidth * 0.6;
    const endLeft = x + nodeWidth / 2 - centerRegionWidth / 2;
    const endRight = endLeft + centerRegionWidth;

    this.drawSide(context, leftInfo, childY, parentBottomY, endLeft, endRight, rectId, 'left');
    this.drawSide(context, rightInfo, childY, parentBottomY, endLeft, endRight, rectId, 'right');

    const { positions: outputArrowPositions, fullCount } =
      context.arrowCalculator.calculateOutputArrowPositions(1, x, nodeWidth);

    return {
      x,
      y: Math.max(leftInfo.y + leftInfo.height, rightInfo.y + rightInfo.height),
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: fullCount,
      inputArrowPositions: outputArrowPositions,
      outputColumns: [...leftInfo.outputColumns],
      outputSortOrder: [],
    };
  }

  private drawSide(
    context: GenerationContext,
    childInfo: NodeInfo,
    childY: number,
    parentBottomY: number,
    endLeft: number,
    endRight: number,
    parentRectId: string,
    side: 'left' | 'right'
  ): void {
    const arrowCount = Math.max(1, childInfo.inputArrowCount);
    const centerWidth = childInfo.width * 0.6;
    const startLeft = childInfo.x + childInfo.width / 2 - centerWidth / 2;
    const startRight = startLeft + centerWidth;
    const startPositions = context.arrowCalculator.distributeArrows(
      arrowCount,
      startLeft,
      startRight
    );
    const endPositions = context.arrowCalculator.distributeArrows(arrowCount, endLeft, endRight);

    for (let i = 0; i < arrowCount; i++) {
      const arrowId = context.idGenerator.generateId();
      context.elements.push(
        context.elementFactory.createArrow({
          id: arrowId,
          startX: startPositions[i],
          startY: childY,
          endX: endPositions[i],
          endY: parentBottomY,
          childRectId: childInfo.rectId,
          parentRectId,
          strokeColor: context.config.arrowColor,
        })
      );
      this.bindArrowToElements(context, arrowId, [childInfo.rectId, parentRectId]);
    }

    const outerIndex = side === 'left' ? 0 : startPositions.length - 1;
    this.placeJoinSideColumnLabels(
      context,
      childInfo.outputColumns,
      childInfo.outputSortOrder,
      side,
      startPositions[outerIndex] ?? childInfo.x + childInfo.width / 2,
      childY,
      endPositions[outerIndex] ?? (endLeft + endRight) / 2,
      parentBottomY,
      childInfo.groupId
    );
  }
}
