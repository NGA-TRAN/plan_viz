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
      throw new Error(
        `CrossJoinExec must have exactly 2 children, but found ${node.children.length}`
      );
    }

    const leftChild = node.children[0];
    const rightChild = node.children[1];

    // Extract number of input groups from children to calculate variable spacing
    // The inputArrowCount represents the number of file groups in DataSourceExec
    // We need to look at the DataSourceExec nodes (children of CoalescePartitionsExec)
    let leftGroupCount = 0;
    let rightGroupCount = 0;

    // Try to extract from left child (CoalescePartitionsExec -> DataSourceExec)
    if (leftChild.children && leftChild.children.length > 0) {
      const leftDataSource = leftChild.children[0];
      if (leftDataSource.operator === 'DataSourceExec' && leftDataSource.properties?.file_groups) {
        // Parse file_groups to get count: "5 groups: ..." or "{5 groups: ...}"
        const fileGroupsMatch = leftDataSource.properties.file_groups.match(/(\d+)\s+groups?/);
        if (fileGroupsMatch) {
          leftGroupCount = parseInt(fileGroupsMatch[1], 10);
        }
      }
    }

    // Try to extract from right child (CoalescePartitionsExec -> DataSourceExec)
    if (rightChild.children && rightChild.children.length > 0) {
      const rightDataSource = rightChild.children[0];
      if (
        rightDataSource.operator === 'DataSourceExec' &&
        rightDataSource.properties?.file_groups
      ) {
        // Parse file_groups to get count: "10 groups: ..." or "{10 groups: ...}"
        const fileGroupsMatch = rightDataSource.properties.file_groups.match(/(\d+)\s+groups?/);
        if (fileGroupsMatch) {
          rightGroupCount = parseInt(fileGroupsMatch[1], 10);
        }
      }
    }

    // Calculate variable spacing based on total number of input groups
    // Use more aggressive scaling to prevent overlap with many groups
    const totalGroups = leftGroupCount + rightGroupCount;
    const baseSpacing = context.config.horizontalSpacing;
    // Scale more aggressively: use larger per-group spacing and add quadratic component for very large groups
    const perGroupSpacing = 30; // Increased from 15 to 30 pixels per input group
    const quadraticComponent = totalGroups > 20 ? (totalGroups - 20) * 5 : 0; // Extra spacing for groups > 20
    const variableSpacing = baseSpacing + totalGroups * perGroupSpacing + quadraticComponent;

    // Position children side by side below the join with variable spacing
    const childY = y + nodeHeight + context.config.verticalSpacing;
    const leftX = x - nodeWidth - variableSpacing;
    const rightX = x + nodeWidth + variableSpacing;

    const leftInfo = context.generateChildNode(leftChild, leftX, childY, false);
    const rightInfo = context.generateChildNode(rightChild, rightX, childY, false);

    // Arrow counts from children (at least 1 to keep visuals)
    const leftArrows = Math.max(1, leftInfo.inputArrowCount);
    const rightArrows = Math.max(1, rightInfo.inputArrowCount);

    // Arrow start positions on top of children (use central 60% of width)
    // Use final positions from child info (leftInfo.x, rightInfo.x) in case they were adjusted
    const centerRegion = (width: number): number => width * 0.6;
    const leftStartLeft = leftInfo.x + leftInfo.width / 2 - centerRegion(leftInfo.width) / 2;
    const leftStartRight = leftStartLeft + centerRegion(leftInfo.width);
    const rightStartLeft = rightInfo.x + rightInfo.width / 2 - centerRegion(rightInfo.width) / 2;
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
    const leftEndPositions = context.arrowCalculator.distributeArrows(
      leftArrows,
      x,
      x + nodeWidth / 2
    );
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
