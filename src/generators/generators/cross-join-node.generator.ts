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
    // Use aggressive scaling to prevent overlap with many groups
    const totalGroups = leftGroupCount + rightGroupCount;
    const baseSpacing = context.config.horizontalSpacing;
    // Scale more aggressively: use larger per-group spacing and add quadratic component for very large groups
    const perGroupSpacing = 30; // 30 pixels per input group
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

    // Display columns on arrows from left child (using left side's columns and sort order)
    if (leftInfo.outputColumns.length > 0) {
      const arrowMidY = (childY + parentBottomY) / 2;
      const leftmostArrowX =
        leftStartPositions.length > 0 ? leftStartPositions[0] : leftInfo.x + leftInfo.width / 2;
      const leftOffset = -5; // Negative offset to position text to the left
      const projectionTextX = leftmostArrowX + leftOffset;

      const orderedColumns = new Set(leftInfo.outputSortOrder);
      const groupId = context.idGenerator.generateId();
      const charWidth = 8; // Match HashJoinExec and SortMergeJoinExec implementation
      const textHeight = TEXT_HEIGHTS.COLUMN_LABEL;

      // Collect all groups first to determine total width and proper comma placement
      const groups: Array<{ text: string; color: string; width: number }> = [];
      let i = 0;
      while (i < leftInfo.outputColumns.length) {
        const column = leftInfo.outputColumns[i];
        const isOrdered = orderedColumns.has(column);
        const color = isOrdered ? '#1e90ff' : context.config.nodeColor;

        const groupParts: string[] = [column];
        let j = i + 1;
        while (j < leftInfo.outputColumns.length) {
          const nextColumn = leftInfo.outputColumns[j];
          const nextIsOrdered = orderedColumns.has(nextColumn);
          const nextColor = nextIsOrdered ? '#1e90ff' : context.config.nodeColor;
          if (nextColor === color) {
            groupParts.push(nextColumn);
            j++;
          } else {
            break;
          }
        }

        const groupText = groupParts.join(', ');
        const groupWidth = groupText.length * charWidth;
        groups.push({ text: groupText, color, width: groupWidth });
        i = j;
      }

      // Position from right to left, building text correctly
      let currentX = projectionTextX;
      for (let idx = groups.length - 1; idx >= 0; idx--) {
        const group = groups[idx];
        const groupText = idx < groups.length - 1 ? group.text + ', ' : group.text;
        const groupWidth = groupText.length * charWidth;
        const groupTextId = context.idGenerator.generateId();
        // Position text to the left of the arrow, so we need to adjust X position
        const groupTextElement = context.elementFactory.createText({
          id: groupTextId,
          x: currentX - groupWidth, // Position to the left
          y: arrowMidY - textHeight / 2,
          width: groupWidth,
          height: textHeight,
          text: groupText,
          fontSize: FONT_SIZES.COLUMN_LABEL,
          fontFamily: FONT_FAMILIES.NORMAL,
          textAlign: 'right', // Right align since text is to the left
          verticalAlign: 'top',
          strokeColor: group.color,
        });
        groupTextElement.groupIds = [groupId];
        context.elements.push(groupTextElement);
        currentX -= groupWidth;
      }
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

    // Display columns on arrows from right child (using right side's columns and sort order)
    if (rightInfo.outputColumns.length > 0) {
      const arrowMidY = (childY + parentBottomY) / 2;
      const rightmostArrowX =
        rightStartPositions.length > 0
          ? rightStartPositions[rightStartPositions.length - 1]
          : rightInfo.x + rightInfo.width / 2;
      const rightOffset = 5; // Positive offset to position text to the right
      const projectionTextX = rightmostArrowX + rightOffset;

      const orderedColumns = new Set(rightInfo.outputSortOrder);
      const groupId = context.idGenerator.generateId();
      const charWidth = 8; // Match HashJoinExec and SortMergeJoinExec implementation
      const textHeight = TEXT_HEIGHTS.COLUMN_LABEL;

      // Collect all groups first to determine total width and proper comma placement
      const groups: Array<{ text: string; color: string; width: number }> = [];
      let i = 0;
      while (i < rightInfo.outputColumns.length) {
        const column = rightInfo.outputColumns[i];
        const isOrdered = orderedColumns.has(column);
        const color = isOrdered ? '#1e90ff' : context.config.nodeColor;

        const groupParts: string[] = [column];
        let j = i + 1;
        while (j < rightInfo.outputColumns.length) {
          const nextColumn = rightInfo.outputColumns[j];
          const nextIsOrdered = orderedColumns.has(nextColumn);
          const nextColor = nextIsOrdered ? '#1e90ff' : context.config.nodeColor;
          if (nextColor === color) {
            groupParts.push(nextColumn);
            j++;
          } else {
            break;
          }
        }

        const groupText = groupParts.join(', ');
        const groupWidth = groupText.length * charWidth;
        groups.push({ text: groupText, color, width: groupWidth });
        i = j;
      }

      // Position from left to right, building text correctly
      let currentX = projectionTextX;
      for (let idx = 0; idx < groups.length; idx++) {
        const group = groups[idx];
        const groupText = idx > 0 ? ', ' + group.text : group.text;
        const groupWidth = groupText.length * charWidth;
        const groupTextId = context.idGenerator.generateId();
        // Position text to the right of the arrow
        const groupTextElement = context.elementFactory.createText({
          id: groupTextId,
          x: currentX, // Position to the right
          y: arrowMidY - textHeight / 2,
          width: groupWidth,
          height: textHeight,
          text: groupText,
          fontSize: FONT_SIZES.COLUMN_LABEL,
          fontFamily: FONT_FAMILIES.NORMAL,
          textAlign: 'left', // Left align since text is to the right
          verticalAlign: 'top',
          strokeColor: group.color,
        });
        groupTextElement.groupIds = [groupId];
        context.elements.push(groupTextElement);
        currentX += groupWidth;
      }
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

    // Output arrows: CrossJoin produces Cartesian product, so output = leftArrows * rightArrows
    // Each partition from left side is joined with each partition from right side
    const outputArrowCount = leftArrows * rightArrows;
    const { positions: outputArrowPositions, fullCount: outputArrowFullCount } =
      context.arrowCalculator.calculateOutputArrowPositions(outputArrowCount, x, nodeWidth);

    const maxChildY = Math.max(leftInfo.y + leftInfo.height, rightInfo.y + rightInfo.height);

    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: outputArrowFullCount,
      inputArrowPositions: outputArrowPositions,
      outputColumns,
      outputSortOrder: [],
    };
  }
}
