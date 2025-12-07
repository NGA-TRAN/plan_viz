import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS, HASH_TABLE_DIMENSIONS } from '../constants';

/**
 * HashJoinExec node generator
 * HashJoinExec has two inputs: build side (first child) and probe side (second child)
 * Children are positioned horizontally (left and right), not vertically
 * Creates a hash table ellipse with orange border
 * Arrows connect from children to hash table ellipse edge
 */
export class HashJoinNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    const nodeWidth = NODE_DIMENSIONS.DATASOURCE_WIDTH;
    const nodeHeight = 125; // Increased to accommodate details text and hash table

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

    // Extract join mode from properties (e.g., mode=CollectLeft)
    let joinMode = '';
    if (node.properties && node.properties.mode) {
      joinMode = node.properties.mode;
    }

    // Create operator name text with join mode (centered, bold)
    const operatorText = joinMode ? `HashJoinExec: ${joinMode}` : 'HashJoinExec';
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

    // Create orange-border ellipse (HashTable) inside the rectangle
    const hashTableWidth = HASH_TABLE_DIMENSIONS.WIDTH;
    const hashTableHeight = HASH_TABLE_DIMENSIONS.HEIGHT;
    const hashTableX = x + nodeWidth / 2 - hashTableWidth / 2;
    const hashTableY = y + HASH_TABLE_DIMENSIONS.Y_OFFSET;
    const hashTableId = context.idGenerator.generateId();
    const hashTable = context.elementFactory.createEllipse({
      id: hashTableId,
      x: hashTableX,
      y: hashTableY,
      width: hashTableWidth,
      height: hashTableHeight,
      strokeColor: '#f08c00', // Orange border color
      backgroundColor: 'transparent',
      roundnessType: 2,
    });
    context.elements.push(hashTable);

    // Create "HashTable" text label inside the ellipse
    const hashTableText = context.elementFactory.createText({
      id: context.idGenerator.generateId(),
      x: hashTableX + hashTableWidth / 2 - 35, // Center the text
      y: hashTableY + hashTableHeight / 2 - 9.2, // Center vertically
      width: 70,
      height: 18.4,
      text: 'HashTable',
      fontSize: 16,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'middle',
      strokeColor: '#f08c00', // Orange color to match border
      autoResize: true, // Match original HashJoinExec implementation
      lineHeight: 1.15, // Match original HashJoinExec implementation
    });
    context.elements.push(hashTableText);

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

    // HashJoinExec must have exactly 2 children: build side (first) and probe side (second)
    if (node.children.length !== 2) {
      throw new Error(
        `HashJoinExec must have exactly 2 children, but found ${node.children.length}`
      );
    }

    const buildSideChild = node.children[0];
    const probeSideChild = node.children[1];

    // Position build side (first child) to the LEFT of HashJoinExec
    // Position probe side (second child) to the RIGHT of HashJoinExec
    // Both at the same Y level (not stacked vertically)
    const childY = y + nodeHeight + context.config.verticalSpacing;
    const standardNodeWidth = NODE_DIMENSIONS.DATASOURCE_WIDTH;
    const buildSideX = x - standardNodeWidth - context.config.horizontalSpacing;
    const probeSideX = x + nodeWidth + context.config.horizontalSpacing;

    // Generate child elements recursively
    const buildSideInfo = context.generateChildNode(buildSideChild, buildSideX, childY, false);
    const probeSideInfo = context.generateChildNode(probeSideChild, probeSideX, childY, false);

    // Calculate hash table ellipse center position
    const hashTableCenterX = hashTableX + hashTableWidth / 2;
    const hashTableCenterY = hashTableY + hashTableHeight / 2;

    // Create arrows from build side to hash table ellipse edge
    const buildSideArrows = Math.max(1, buildSideInfo.inputArrowCount);
    const buildSideTopArrowPositions: number[] = [];
    if (buildSideArrows === 1) {
      buildSideTopArrowPositions.push(buildSideX + buildSideInfo.width / 2);
    } else {
      const centerRegionWidth = buildSideInfo.width * 0.6;
      const centerRegionLeft = buildSideX + buildSideInfo.width / 2 - centerRegionWidth / 2;
      const centerRegionRight = buildSideX + buildSideInfo.width / 2 + centerRegionWidth / 2;
      const spacing = (centerRegionRight - centerRegionLeft) / (buildSideArrows - 1);
      for (let j = 0; j < buildSideArrows; j++) {
        buildSideTopArrowPositions.push(centerRegionLeft + j * spacing);
      }
    }

    const buildSideTopY = childY;

    for (let i = 0; i < buildSideArrows; i++) {
      const arrowStartX = buildSideTopArrowPositions[i];
      // Calculate intersection point on hash table ellipse edge
      const [hashTableEdgeX, hashTableEdgeY] = context.geometryUtils.getEllipseEdgePoint(
        arrowStartX,
        buildSideTopY,
        hashTableCenterX,
        hashTableCenterY,
        hashTableWidth,
        hashTableHeight
      );
      const arrowId = context.idGenerator.generateId();
      const arrow = context.elementFactory.createArrow({
        id: arrowId,
        startX: arrowStartX,
        startY: buildSideTopY,
        endX: hashTableEdgeX,
        endY: hashTableEdgeY,
        childRectId: buildSideInfo.rectId,
        parentRectId: hashTableId,
        strokeColor: context.config.arrowColor,
      });
      context.elements.push(arrow);
      this.bindArrowToElements(context, arrowId, [buildSideInfo.rectId, hashTableId]);
    }

    // Display columns on arrows from build side (using build side's columns and sort order)
    // Replicate original HashJoinExec logic for consistency
    if (buildSideInfo.outputColumns.length > 0) {
      const arrowMidY = (buildSideTopY + hashTableCenterY) / 2;
      const leftmostArrowX =
        buildSideTopArrowPositions.length > 0 ?
          buildSideTopArrowPositions[0] :
          buildSideX + buildSideInfo.width / 2;
      const leftOffset = -5; // Negative offset to position text to the left
      const projectionTextX = leftmostArrowX + leftOffset;

      const orderedColumns = new Set(buildSideInfo.outputSortOrder);
      const groupId = context.idGenerator.generateId();
      const charWidth = 8; // Match original HashJoinExec implementation
      const textHeight = TEXT_HEIGHTS.COLUMN_LABEL;

      // Collect all groups first to determine total width and proper comma placement
      const groups: Array<{ text: string; color: string; width: number }> = [];
      let i = 0;
      while (i < buildSideInfo.outputColumns.length) {
        const column = buildSideInfo.outputColumns[i];
        const isOrdered = orderedColumns.has(column);
        const color = isOrdered ? '#1e90ff' : context.config.nodeColor;

        const groupParts: string[] = [column];
        let j = i + 1;
        while (j < buildSideInfo.outputColumns.length) {
          const nextColumn = buildSideInfo.outputColumns[j];
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

    // Create arrows from probe side to HashJoinExec rectangle
    const probeSideArrows = Math.max(1, probeSideInfo.inputArrowCount);
    const probeSideTopArrowPositions: number[] = [];
    if (probeSideArrows === 1) {
      probeSideTopArrowPositions.push(probeSideX + probeSideInfo.width / 2);
    } else {
      const centerRegionWidth = probeSideInfo.width * 0.6;
      const centerRegionLeft = probeSideX + probeSideInfo.width / 2 - centerRegionWidth / 2;
      const centerRegionRight = probeSideX + probeSideInfo.width / 2 + centerRegionWidth / 2;
      const spacing = (centerRegionRight - centerRegionLeft) / (probeSideArrows - 1);
      for (let j = 0; j < probeSideArrows; j++) {
        probeSideTopArrowPositions.push(centerRegionLeft + j * spacing);
      }
    }

    const probeSideTopY = childY;

    for (let i = 0; i < probeSideArrows; i++) {
      const arrowStartX = probeSideTopArrowPositions[i];
      // Calculate intersection point on hash table ellipse edge
      const [hashTableEdgeX, hashTableEdgeY] = context.geometryUtils.getEllipseEdgePoint(
        arrowStartX,
        probeSideTopY,
        hashTableCenterX,
        hashTableCenterY,
        hashTableWidth,
        hashTableHeight
      );
      const arrowId = context.idGenerator.generateId();
      const arrow = context.elementFactory.createArrow({
        id: arrowId,
        startX: arrowStartX,
        startY: probeSideTopY,
        endX: hashTableEdgeX,
        endY: hashTableEdgeY,
        childRectId: probeSideInfo.rectId,
        parentRectId: hashTableId,
        strokeColor: context.config.arrowColor,
      });
      context.elements.push(arrow);
      this.bindArrowToElements(context, arrowId, [probeSideInfo.rectId, hashTableId]);
    }

    // Display columns on arrows from probe side (using probe side's columns and sort order)
    // Replicate original HashJoinExec logic for consistency
    if (probeSideInfo.outputColumns.length > 0) {
      const arrowMidY = (probeSideTopY + hashTableCenterY) / 2;
      const rightmostArrowX =
        probeSideTopArrowPositions.length > 0 ?
          probeSideTopArrowPositions[probeSideTopArrowPositions.length - 1] :
          probeSideX + probeSideInfo.width / 2;
      const rightOffset = 5;
      const projectionTextX = rightmostArrowX + rightOffset;

      const orderedColumns = new Set(probeSideInfo.outputSortOrder);
      const groupId = context.idGenerator.generateId();
      let currentX = projectionTextX;
      const charWidth = 8; // Match original HashJoinExec implementation
      const textHeight = TEXT_HEIGHTS.COLUMN_LABEL;

      let i = 0;
      while (i < probeSideInfo.outputColumns.length) {
        const column = probeSideInfo.outputColumns[i];
        const isOrdered = orderedColumns.has(column);
        const color = isOrdered ? '#1e90ff' : context.config.nodeColor;

        const groupParts: string[] = [column];
        let j = i + 1;
        while (j < probeSideInfo.outputColumns.length) {
          const nextColumn = probeSideInfo.outputColumns[j];
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

    // Extract output columns from projection property
    const outputColumns: string[] = [];
    if (node.properties && node.properties.projection) {
      const projectionMatch = node.properties.projection.match(/\[([^\]]+)\]/);
      if (projectionMatch) {
        const projectionText = projectionMatch[1];
        outputColumns.push(
          ...context.propertyParser.parseCommaSeparated(projectionText).map((col) => {
            const trimmed = col.trim();
            // Extract column name before @ symbol
            const columnMatch = trimmed.match(/^([^@]+)/);
            return columnMatch ? columnMatch[1].trim() : trimmed;
          })
        );
      }
    }

    // HashJoinExec: output arrows = probe side input arrows
    // Output sort order = probe side sort order
    const outputSortOrder = [...probeSideInfo.outputSortOrder];
    const outputArrowCount = probeSideArrows;
    const { positions: outputArrowPositions, fullCount: outputArrowFullCount } =
      context.arrowCalculator.calculateOutputArrowPositions(outputArrowCount, x, nodeWidth);

    // Calculate max child Y for positioning next node
    const maxChildY = Math.max(
      buildSideInfo.y + buildSideInfo.height,
      probeSideInfo.y + probeSideInfo.height
    );

    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: outputArrowFullCount,
      inputArrowPositions: outputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }
}
