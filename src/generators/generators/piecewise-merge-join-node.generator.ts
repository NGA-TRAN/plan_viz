import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';

/**
 * PiecewiseMergeJoinExec: range-predicate merge join.
 * No hash table. Output partitions follow the left child. Sort on the join
 * key is preserved only when both children already expose that key as sorted.
 */
export class PiecewiseMergeJoinNodeGenerator extends BaseNodeGenerator {
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
        text: 'PiecewiseMergeJoinExec',
        fontSize: FONT_SIZES.OPERATOR,
        fontFamily: FONT_FAMILIES.BOLD,
        textAlign: 'center',
        verticalAlign: 'top',
        containerId: rectId,
        strokeColor: context.config.nodeColor,
      })
    );

    const details: string[] = [];
    if (node.properties?.join_type) {
      details.push(`join_type=${node.properties.join_type}`);
    }
    if (node.properties?.on) {
      details.push(`on=${node.properties.on.replace(/@\d+/g, '')}`);
    }
    if (node.properties?.op) {
      details.push(`op=${node.properties.op}`);
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
        `PiecewiseMergeJoinExec must have exactly 2 children, but found ${node.children.length}`
      );
    }

    const childY = y + nodeHeight + context.config.verticalSpacing;
    const leftX = x - nodeWidth - context.config.horizontalSpacing;
    const rightX = x + nodeWidth + context.config.horizontalSpacing;
    const leftInfo = context.generateChildNode(node.children[0], leftX, childY, false);
    const rightInfo = context.generateChildNode(node.children[1], rightX, childY, false);

    const leftArrows = Math.max(1, leftInfo.inputArrowCount);
    const rightArrows = Math.max(1, rightInfo.inputArrowCount);
    const parentBottomY = y + nodeHeight;
    const centerRegionWidth = nodeWidth * 0.6;
    const endLeft = x + nodeWidth / 2 - centerRegionWidth / 2;
    const endRight = endLeft + centerRegionWidth;

    this.drawSideArrows(
      context,
      leftInfo,
      leftArrows,
      childY,
      parentBottomY,
      endLeft,
      endRight,
      rectId,
      'left'
    );
    this.drawSideArrows(
      context,
      rightInfo,
      rightArrows,
      childY,
      parentBottomY,
      endLeft,
      endRight,
      rectId,
      'right'
    );

    const outputColumns = this.mergeColumns(leftInfo.outputColumns, rightInfo.outputColumns);
    const joinKeys = node.properties?.on ?
      context.propertyParser.extractJoinKeys(node.properties.on) :
      [];
    const bothSortedOnKeys =
      joinKeys.length > 0 &&
      joinKeys.every(
        (key) => leftInfo.outputSortOrder.includes(key) && rightInfo.outputSortOrder.includes(key)
      );
    const outputSortOrder = bothSortedOnKeys ? [...joinKeys] : [];

    const { positions: outputArrowPositions, fullCount } =
      context.arrowCalculator.calculateOutputArrowPositions(leftArrows, x, nodeWidth);

    return {
      x,
      y: Math.max(leftInfo.y + leftInfo.height, rightInfo.y + rightInfo.height),
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: fullCount,
      inputArrowPositions: outputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }

  private drawSideArrows(
    context: GenerationContext,
    childInfo: NodeInfo,
    arrowCount: number,
    childY: number,
    parentBottomY: number,
    endLeft: number,
    endRight: number,
    parentRectId: string,
    side: 'left' | 'right'
  ): void {
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

  private mergeColumns(left: string[], right: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const col of [...left, ...right]) {
      if (!seen.has(col)) {
        seen.add(col);
        result.push(col);
      }
    }
    return result;
  }
}
