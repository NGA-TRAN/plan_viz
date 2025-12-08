import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';

/**
 * CrossJoinExec node generator
 * Simple 2-input join without hash/sort specifics; children sit left/right
 */
export class CrossJoinNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    const nodeWidth = NODE_DIMENSIONS.DATASOURCE_WIDTH;
    const nodeHeight = NODE_DIMENSIONS.SORT_MERGE_JOIN_HEIGHT;

    // Draw join rectangle
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

    // Label
    const operatorTextElement = context.elementFactory.createText({
      id: context.idGenerator.generateId(),
      x,
      y: y + 5,
      width: nodeWidth,
      height: TEXT_HEIGHTS.OPERATOR,
      text: 'CrossJoinExec',
      fontSize: FONT_SIZES.OPERATOR,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    });
    context.elements.push(operatorTextElement);

    // Require exactly 2 inputs
    if (node.children.length !== 2) {
      throw new Error(`CrossJoinExec must have exactly 2 children, but found ${node.children.length}`);
    }

    const leftChild = node.children[0];
    const rightChild = node.children[1];

    // Position children side by side below the join
    const childY = y + nodeHeight + context.config.verticalSpacing;
    const leftX = x - nodeWidth - context.config.horizontalSpacing;
    const rightX = x + nodeWidth + context.config.horizontalSpacing;

    const leftInfo = context.generateChildNode(leftChild, leftX, childY, false);
    const rightInfo = context.generateChildNode(rightChild, rightX, childY, false);

    // Arrow counts from children (at least 1 to keep visuals)
    const leftArrows = Math.max(1, leftInfo.inputArrowCount);
    const rightArrows = Math.max(1, rightInfo.inputArrowCount);

    // Arrow start positions on top of children (use central 60% of width)
    const centerRegion = (width: number): number => width * 0.6;
    const leftStartLeft = leftX + leftInfo.width / 2 - centerRegion(leftInfo.width) / 2;
    const leftStartRight = leftStartLeft + centerRegion(leftInfo.width);
    const rightStartLeft = rightX + rightInfo.width / 2 - centerRegion(rightInfo.width) / 2;
    const rightStartRight = rightStartLeft + centerRegion(rightInfo.width);

    const leftStartPositions = context.arrowCalculator.distributeArrows(
      leftArrows,
      leftStartLeft,
      leftStartRight
    );
    const rightStartPositions = context.arrowCalculator.distributeArrows(
      rightArrows,
      rightStartLeft,
      rightStartRight
    );

    const parentBottomY = y + nodeHeight;

    // Arrow end positions on join (left half for left child, right half for right child)
    const leftEndPositions = context.arrowCalculator.distributeArrows(leftArrows, x, x + nodeWidth / 2);
    const rightEndPositions = context.arrowCalculator.distributeArrows(
      rightArrows,
      x + nodeWidth / 2,
      x + nodeWidth
    );

    // Draw arrows from left child
    for (let i = 0; i < leftArrows; i++) {
      const arrowId = context.idGenerator.generateId();
      const arrow = context.elementFactory.createArrow({
        id: arrowId,
        startX: leftStartPositions[i],
        startY: childY,
        endX: leftEndPositions[i],
        endY: parentBottomY,
        childRectId: leftInfo.rectId,
        parentRectId: rectId,
        strokeColor: context.config.arrowColor,
      });
      context.elements.push(arrow);
      this.bindArrowToElements(context, arrowId, [leftInfo.rectId, rectId]);
    }

    // Draw arrows from right child
    for (let i = 0; i < rightArrows; i++) {
      const arrowId = context.idGenerator.generateId();
      const arrow = context.elementFactory.createArrow({
        id: arrowId,
        startX: rightStartPositions[i],
        startY: childY,
        endX: rightEndPositions[i],
        endY: parentBottomY,
        childRectId: rightInfo.rectId,
        parentRectId: rectId,
        strokeColor: context.config.arrowColor,
      });
      context.elements.push(arrow);
      this.bindArrowToElements(context, arrowId, [rightInfo.rectId, rectId]);
    }

    // Merge columns from both sides
    const outputColumns: string[] = [];
    const seen = new Set<string>();
    for (const col of leftInfo.outputColumns) {
      if (!seen.has(col)) {
        outputColumns.push(col);
        seen.add(col);
      }
    }
    for (const col of rightInfo.outputColumns) {
      if (!seen.has(col)) {
        outputColumns.push(col);
        seen.add(col);
      }
    }

    // Output arrows: use the larger side count to propagate downstream
    const { positions: outputArrowPositions, fullCount: outputArrowCount } =
      context.arrowCalculator.calculateOutputArrowPositions(
        Math.max(leftArrows, rightArrows),
        x,
        nodeWidth
      );

    const maxChildY = Math.max(leftInfo.y + leftInfo.height, rightInfo.y + rightInfo.height);

    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: outputArrowCount,
      inputArrowPositions: outputArrowPositions,
      outputColumns,
      outputSortOrder: [],
    };
  }
}
