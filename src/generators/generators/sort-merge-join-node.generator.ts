import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';

/**
 * SortMergeJoinExec node generator
 * SortMergeJoin has two inputs: left side (first child) and right side (second child)
 * Differences from HashJoinExec:
 * 1. The number of partitions/streams from both inputs must be the same
 * 2. The number of output partitions are the same as number of input partitions of each of its input
 * 3. SortMergeJoin does not have a hash table ellipse
 * 4. Arrows connect directly from children to SortMergeJoin rectangle (not to an ellipse)
 * 5. Output is sorted on the columns in the on= expressions
 */
export class SortMergeJoinNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    const nodeWidth = NODE_DIMENSIONS.DATASOURCE_WIDTH;
    const nodeHeight = NODE_DIMENSIONS.SORT_MERGE_JOIN_HEIGHT;

    // Create rectangle
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

    // Create operator name text (centered, bold)
    const operatorText = node.operator === 'SortMergeJoinExec' ? 'SortMergeJoinExec' : 'SortMergeJoin';
    const operatorTextElement = context.elementFactory.createText({
      id: context.idGenerator.generateId(),
      x,
      y: y + 5,
      width: nodeWidth,
      height: TEXT_HEIGHTS.OPERATOR,
      text: operatorText,
      fontSize: FONT_SIZES.OPERATOR,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    });
    context.elements.push(operatorTextElement);

    // Create details text showing join_type and on=
    const details: string[] = [];
    if (node.properties) {
      if (node.properties.join_type) {
        details.push(`join_type=${node.properties.join_type}`);
      }
      if (node.properties.on) {
        // Simplify the on= expression: remove @ symbols and indices
        let onValue = node.properties.on;
        onValue = onValue.replace(/@\d+/g, '');
        details.push(`on=${onValue}`);
      }
    }

    if (details.length > 0) {
      const textHeight = details.length * TEXT_HEIGHTS.DETAILS_LINE;
      const detailText = context.elementFactory.createText({
        id: context.idGenerator.generateId(),
        x: x + 10,
        y: y + 35, // Position below operator name
        width: nodeWidth - 20,
        height: textHeight,
        text: details.join('\n'),
        fontSize: FONT_SIZES.DETAILS,
        fontFamily: FONT_FAMILIES.NORMAL,
        textAlign: 'center',
        verticalAlign: 'top',
        strokeColor: context.config.nodeColor,
      });
      context.elements.push(detailText);
    }

    // SortMergeJoin must have exactly 2 children: left side (first) and right side (second)
    if (node.children.length !== 2) {
      throw new Error(
        `${operatorText} must have exactly 2 children, but found ${node.children.length}`
      );
    }

    const leftSideChild = node.children[0];
    const rightSideChild = node.children[1];

    // Position left side (first child) to the LEFT of SortMergeJoin
    // Position right side (second child) to the RIGHT of SortMergeJoin
    // Both at the same Y level (not stacked vertically)
    const childY = y + nodeHeight + context.config.verticalSpacing;
    const standardNodeWidth = NODE_DIMENSIONS.DATASOURCE_WIDTH;
    const leftSideX = x - standardNodeWidth - context.config.horizontalSpacing;
    const rightSideX = x + nodeWidth + context.config.horizontalSpacing;

    // Generate child elements recursively
    const leftSideInfo = context.generateChildNode(leftSideChild, leftSideX, childY, false);
    const rightSideInfo = context.generateChildNode(rightSideChild, rightSideX, childY, false);

    // Validate that both inputs have the same number of partitions/streams
    const leftSideArrows = Math.max(1, leftSideInfo.inputArrowCount);
    const rightSideArrows = Math.max(1, rightSideInfo.inputArrowCount);
    if (leftSideArrows !== rightSideArrows) {
      throw new Error(
        `${operatorText} requires both inputs to have the same number of partitions/streams, but left side has ${leftSideArrows} and right side has ${rightSideArrows}`
      );
    }

    // Create arrows from left side to SortMergeJoin rectangle
    // Arrows MUST start from the TOP edge of the left side operator rectangle
    const leftSideTopArrowPositions: number[] = [];
    if (leftSideArrows === 1) {
      leftSideTopArrowPositions.push(leftSideX + leftSideInfo.width / 2);
    } else {
      const centerRegionWidth = leftSideInfo.width * 0.6;
      const centerRegionLeft = leftSideX + leftSideInfo.width / 2 - centerRegionWidth / 2;
      const centerRegionRight = leftSideX + leftSideInfo.width / 2 + centerRegionWidth / 2;
      const spacing = (centerRegionRight - centerRegionLeft) / (leftSideArrows - 1);
      for (let j = 0; j < leftSideArrows; j++) {
        leftSideTopArrowPositions.push(centerRegionLeft + j * spacing);
      }
    }

    const leftSideTopY = childY;

    // Create arrows from right side to SortMergeJoin rectangle
    // Arrows MUST start from the TOP edge of the right side operator rectangle
    const rightSideTopArrowPositions: number[] = [];
    if (rightSideArrows === 1) {
      rightSideTopArrowPositions.push(rightSideX + rightSideInfo.width / 2);
    } else {
      const centerRegionWidth = rightSideInfo.width * 0.6;
      const centerRegionLeft = rightSideX + rightSideInfo.width / 2 - centerRegionWidth / 2;
      const centerRegionRight = rightSideX + rightSideInfo.width / 2 + centerRegionWidth / 2;
      const spacing = (centerRegionRight - centerRegionLeft) / (rightSideArrows - 1);
      for (let j = 0; j < rightSideArrows; j++) {
        rightSideTopArrowPositions.push(centerRegionLeft + j * spacing);
      }
    }

    const rightSideTopY = childY;

    // Calculate arrow end positions on SortMergeJoin rectangle (bottom edge)
    // All arrows from both inputs go to the bottom edge of SortMergeJoin rectangle
    // Since both inputs have the same number of partitions, distribute all arrows evenly
    const bottomEdgeY = y + nodeHeight;
    const totalArrows = leftSideArrows; // Same as rightSideArrows since validated
    const bottomEdgeArrowPositions: number[] = [];
    if (totalArrows === 1) {
      bottomEdgeArrowPositions.push(x + nodeWidth / 2);
    } else {
      // Distribute arrows evenly across the bottom edge using central region (60% of width)
      const centerRegionWidth = nodeWidth * 0.6;
      const centerRegionLeft = x + nodeWidth / 2 - centerRegionWidth / 2;
      const centerRegionRight = x + nodeWidth / 2 + centerRegionWidth / 2;
      const spacing = (centerRegionRight - centerRegionLeft) / (totalArrows - 1);
      for (let j = 0; j < totalArrows; j++) {
        bottomEdgeArrowPositions.push(centerRegionLeft + j * spacing);
      }
    }

    // Create arrows from left side to SortMergeJoin rectangle bottom edge
    for (let i = 0; i < leftSideArrows; i++) {
      const arrowStartX = leftSideTopArrowPositions[i];
      const arrowEndX = bottomEdgeArrowPositions[i];
      const arrowId = context.idGenerator.generateId();
      const arrow = context.elementFactory.createArrow({
        id: arrowId,
        startX: arrowStartX,
        startY: leftSideTopY,
        endX: arrowEndX,
        endY: bottomEdgeY,
        childRectId: leftSideInfo.rectId,
        parentRectId: rectId,
        strokeColor: context.config.arrowColor,
      });
      context.elements.push(arrow);
    }

    // Display columns on arrows from left side (using left side's columns and sort order)
    // Replicate original SortMergeJoin logic for consistency
    if (leftSideInfo.outputColumns.length > 0) {
      const arrowMidY = (leftSideTopY + bottomEdgeY) / 2;
      const leftmostArrowX =
        leftSideTopArrowPositions.length > 0 ?
          leftSideTopArrowPositions[0] :
          leftSideX + leftSideInfo.width / 2;
      const leftOffset = -5; // Negative offset to position text to the left
      const projectionTextX = leftmostArrowX + leftOffset;

      const orderedColumns = new Set(leftSideInfo.outputSortOrder);
      const groupId = context.idGenerator.generateId();
      const charWidth = 8; // Match original SortMergeJoin implementation
      const textHeight = TEXT_HEIGHTS.COLUMN_LABEL;

      // Collect all groups first to determine total width and proper comma placement
      const groups: Array<{ text: string; color: string; width: number }> = [];
      let i = 0;
      while (i < leftSideInfo.outputColumns.length) {
        const column = leftSideInfo.outputColumns[i];
        const isOrdered = orderedColumns.has(column);
        const color = isOrdered ? '#1e90ff' : context.config.nodeColor;

        const groupParts: string[] = [column];
        let j = i + 1;
        while (j < leftSideInfo.outputColumns.length) {
          const nextColumn = leftSideInfo.outputColumns[j];
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

    // Create arrows from right side to SortMergeJoin rectangle bottom edge
    for (let i = 0; i < rightSideArrows; i++) {
      const arrowStartX = rightSideTopArrowPositions[i];
      const arrowEndX = bottomEdgeArrowPositions[i];
      const arrowId = context.idGenerator.generateId();
      const arrow = context.elementFactory.createArrow({
        id: arrowId,
        startX: arrowStartX,
        startY: rightSideTopY,
        endX: arrowEndX,
        endY: bottomEdgeY,
        childRectId: rightSideInfo.rectId,
        parentRectId: rectId,
        strokeColor: context.config.arrowColor,
      });
      context.elements.push(arrow);
    }

    // Display columns on arrows from right side (using right side's columns and sort order)
    // Replicate original SortMergeJoin logic for consistency
    if (rightSideInfo.outputColumns.length > 0) {
      const arrowMidY = (rightSideTopY + bottomEdgeY) / 2;
      const rightmostArrowX =
        rightSideTopArrowPositions.length > 0 ?
          rightSideTopArrowPositions[rightSideTopArrowPositions.length - 1] :
          rightSideX + rightSideInfo.width / 2;
      const rightOffset = 5;
      const projectionTextX = rightmostArrowX + rightOffset;

      const orderedColumns = new Set(rightSideInfo.outputSortOrder);
      const groupId = context.idGenerator.generateId();
      let currentX = projectionTextX;
      const charWidth = 8; // Match original SortMergeJoin implementation
      const textHeight = TEXT_HEIGHTS.COLUMN_LABEL;

      let i = 0;
      while (i < rightSideInfo.outputColumns.length) {
        const column = rightSideInfo.outputColumns[i];
        const isOrdered = orderedColumns.has(column);
        const color = isOrdered ? '#1e90ff' : context.config.nodeColor;

        const groupParts: string[] = [column];
        let j = i + 1;
        while (j < rightSideInfo.outputColumns.length) {
          const nextColumn = rightSideInfo.outputColumns[j];
          const nextIsOrdered = orderedColumns.has(nextColumn);
          const nextColor = nextIsOrdered ? '#1e90ff' : context.config.nodeColor;
          if (nextColor === color) {
            groupParts.push(nextColumn);
            j++;
          } else {
            break;
          }
        }

        const groupText = i > 0 ? ', ' + groupParts.join(', ') : groupParts.join(', ');
        const groupTextId = context.idGenerator.generateId();
        const groupWidth = groupText.length * charWidth;
        const groupTextElement = context.elementFactory.createText({
          id: groupTextId,
          x: currentX,
          y: arrowMidY - textHeight / 2,
          width: groupWidth,
          height: textHeight,
          text: groupText,
          fontSize: FONT_SIZES.COLUMN_LABEL,
          fontFamily: FONT_FAMILIES.NORMAL,
          textAlign: 'left',
          verticalAlign: 'top',
          strokeColor: color,
        });
        groupTextElement.groupIds = [groupId];
        context.elements.push(groupTextElement);
        currentX += groupWidth;
        i = j;
      }
    }

    // SortMergeJoin output columns = all columns from both sides
    // Combine columns from left and right inputs
    const outputColumns: string[] = [];
    const seenColumns = new Set<string>();

    // Add columns from left side
    for (const col of leftSideInfo.outputColumns) {
      if (!seenColumns.has(col)) {
        outputColumns.push(col);
        seenColumns.add(col);
      }
    }

    // Add columns from right side
    for (const col of rightSideInfo.outputColumns) {
      if (!seenColumns.has(col)) {
        outputColumns.push(col);
        seenColumns.add(col);
      }
    }

    // Extract output sort order from on= property
    // Output of SortMergeJoin is sorted on the join keys from the on= expressions
    // Format: on=[(f_dkey@0, f_dkey@0)] -> extract f_dkey (the join key)
    // For multiple join keys: on=[(col1@0, col1@0), (col2@1, col2@1)] -> extract col1, col2
    const outputSortOrder: string[] = [];
    if (node.properties && node.properties.on) {
      // Extract content from brackets: on=[(f_dkey@0, f_dkey@0)]
      const onMatch = node.properties.on.match(/\[([^\]]+)\]/);
      if (onMatch) {
        const onContent = onMatch[1];
        // Parse pairs like (f_dkey@0, f_dkey@0)
        // Match all pairs: (column1@N, column2@N)
        const pairPattern = /\(([^,]+),\s*([^)]+)\)/g;
        let match;
        const seenJoinKeys = new Set<string>();

        while ((match = pairPattern.exec(onContent)) !== null) {
          // Extract column name from left side of the pair (join key)
          const leftCol = match[1].trim();

          // Extract column name before @ symbol from left side (join key)
          const leftMatch = leftCol.match(/^([^@]+)/);
          if (leftMatch) {
            const joinKey = leftMatch[1].trim();
            // Add the join key to sort order
            // Note: For join keys, typically both sides refer to the same logical column
            // (e.g., f_dkey@0 from left table and f_dkey@0 from right table)
            // So we only need to extract from one side
            if (!seenJoinKeys.has(joinKey)) {
              outputSortOrder.push(joinKey);
              seenJoinKeys.add(joinKey);
            }
          }
        }
      }
    }

    // SortMergeJoin: output arrows = input arrows (same as each input)
    const outputArrowCount = leftSideArrows; // Same as rightSideArrows since we validated they're equal
    // Output arrows come from the bottom edge of SortMergeJoin rectangle
    const outputArrowPositions: number[] = [];
    if (outputArrowCount === 1) {
      outputArrowPositions.push(x + nodeWidth / 2);
    } else {
      const centerRegionWidth = nodeWidth * 0.6;
      const centerRegionLeft = x + nodeWidth / 2 - centerRegionWidth / 2;
      const centerRegionRight = x + nodeWidth / 2 + centerRegionWidth / 2;
      const spacing = (centerRegionRight - centerRegionLeft) / (outputArrowCount - 1);
      for (let j = 0; j < outputArrowCount; j++) {
        outputArrowPositions.push(centerRegionLeft + j * spacing);
      }
    }

    // Calculate max child Y for positioning next node
    const maxChildY = Math.max(
      leftSideInfo.y + leftSideInfo.height,
      rightSideInfo.y + rightSideInfo.height
    );

    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: outputArrowCount,
      inputArrowPositions: outputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }
}

