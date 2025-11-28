import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';
import { ExcalidrawArrow, ExcalidrawRectangle } from '../../types/excalidraw.types';

/**
 * UnionExec node generator
 * UnionExec can have many inputs (not just 1 or 2)
 * The number of output arrows is the total number of output arrows from all its inputs
 * Children are positioned horizontally centered around the parent
 * Arrows connect from child top edges to UnionExec bottom edge
 */
export class UnionNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    const nodeWidth = NODE_DIMENSIONS.DATASOURCE_WIDTH;
    const nodeHeight = NODE_DIMENSIONS.DEFAULT_HEIGHT;

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
    const operatorTextElement = context.elementFactory.createText({
      id: context.idGenerator.generateId(),
      x,
      y: y + 5,
      width: nodeWidth,
      height: TEXT_HEIGHTS.OPERATOR,
      text: 'UnionExec',
      fontSize: FONT_SIZES.OPERATOR,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    });
    context.elements.push(operatorTextElement);

    // Calculate positions for children and get input arrow count
    // UnionExec can have many inputs
    let maxChildY = y + nodeHeight + context.config.verticalSpacing;
    let totalInputArrows = 0;
    const allInputArrowPositions: number[] = [];
    // UnionExec: outputColumns and outputSortOrder from first child (assuming all children have same schema)
    let outputColumns: string[] = [];
    let outputSortOrder: string[] = [];

    if (node.children.length > 0) {
      // Position children horizontally centered around the parent
      // Increase horizontal spacing to avoid overlap between children
      // Use larger spacing for UnionExec children as they might have wider subtrees
      const spacing = context.config.horizontalSpacing * 1.5;

      // Track element count before generating children so we can shift them later
      const elementsBeforeChildren = context.elements.length;

      // Adjust vertical spacing to make arrows 3/5 of original length
      const adjustedVerticalSpacing = (context.config.verticalSpacing * 3) / 5;
      const childY = y + nodeHeight + adjustedVerticalSpacing;

      // Start with an initial X position (will be adjusted after we know actual widths)
      let currentChildX = x;

      const childrenInfo: Array<{
        childInfo: NodeInfo;
        numArrows: number;
        childTopY: number; // Store the top Y position of the child (not the bottom of subtree)
      }> = [];

      // Generate all children first to get their actual widths
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        // Generate child elements recursively
        const childInfo = context.generateChildNode(child, currentChildX, childY, false);

        // UnionExec: outputColumns and outputSortOrder from first child
        if (i === 0) {
          outputColumns = [...childInfo.outputColumns];
          outputSortOrder = [...childInfo.outputSortOrder];
        }

        // UnionExec: sum up all input arrows from all children
        const numArrows = Math.max(1, childInfo.inputArrowCount);
        totalInputArrows += numArrows;

        // Calculate the actual top Y of the child's rectangle
        // For nodes with children, childInfo.y is the bottom of the subtree (maxChildY)
        // The rectangle's top Y is childY (the parameter we passed to generateNodeElements)
        const childRectTopY = childY;

        childrenInfo.push({ childInfo, numArrows, childTopY: childRectTopY });

        // Track the maximum Y position for next child
        maxChildY = Math.max(maxChildY, childInfo.y + childInfo.height);

        // Move to next child position using actual child width (prevents overlaps)
        currentChildX += childInfo.width + spacing;
      }

      // Now that we know the actual total width, center all children relative to parent
      const totalWidth = childrenInfo.reduce((sum, info) => sum + info.childInfo.width, 0) +
                        (childrenInfo.length - 1) * spacing;
      const startX = x + nodeWidth / 2 - totalWidth / 2;
      const firstChildX = childrenInfo[0].childInfo.x;
      const shiftAmount = startX - firstChildX;

      // Shift all elements created during child generation to center the children
      if (Math.abs(shiftAmount) > 0.1) {
        // Update child x positions in info
        for (let i = 0; i < childrenInfo.length; i++) {
          childrenInfo[i].childInfo.x += shiftAmount;
        }

        // Shift all elements that were created during child generation
        // For arrows with bindings, we only shift the base x coordinate
        // Excalidraw bindings will automatically adjust the endpoints to connect to shifted rectangles
        for (let j = elementsBeforeChildren; j < context.elements.length; j++) {
          const element = context.elements[j];

          if (element.type === 'arrow') {
            const arrow = element as ExcalidrawArrow;
            // For arrows with bindings, only shift the base x coordinate
            // The bindings will handle endpoint positioning automatically
            if (arrow.startBinding && arrow.endBinding) {
              element.x += shiftAmount;
              // Don't shift points - bindings will handle endpoint positioning
            } else {
              // For arrows without bindings (shouldn't happen in our code), shift everything
              element.x += shiftAmount;
              if (arrow.points) {
                for (let k = 0; k < arrow.points.length; k++) {
                  arrow.points[k][0] += shiftAmount;
                }
              }
            }
          } else {
            // Shift x coordinate for non-arrow elements (rectangles, text, ellipses, etc.)
            element.x += shiftAmount;
          }
        }
      }

      // Calculate arrow positions distributed across UnionExec's bottom edge
      // For few arrows (4 or fewer), use a central region (60% of width, centered)
      // For more arrows, use the full width
      const unionBottomLeft = x;
      const unionBottomRight = x + nodeWidth;
      const useCentralRegion = totalInputArrows <= 4;

      let arrowRegionLeft: number;
      let arrowRegionRight: number;
      if (useCentralRegion) {
        // Use central 60% of width, centered
        const centerRegionWidth = nodeWidth * 0.6;
        const centerRegionLeft = x + nodeWidth / 2 - centerRegionWidth / 2;
        arrowRegionLeft = centerRegionLeft;
        arrowRegionRight = centerRegionLeft + centerRegionWidth;
      } else {
        // Use full width
        arrowRegionLeft = unionBottomLeft;
        arrowRegionRight = unionBottomRight;
      }

      let arrowIndex = 0;

      // Second pass: create arrows connecting each child to UnionExec's bottom edge
      for (let i = 0; i < childrenInfo.length; i++) {
        const { childInfo, numArrows, childTopY } = childrenInfo[i];

        // Find the actual rectangle element to get its exact top Y coordinate
        // This ensures we connect to the actual top edge of the rectangle
        const childRect = context.elements.find((el) => el.id === childInfo.rectId && el.type === 'rectangle') as ExcalidrawRectangle | undefined;
        const actualChildTopY = childRect ? childRect.y : childTopY;

        // Calculate arrow end positions on UnionExec's bottom edge for this child's arrows
        const arrowEndPositions: number[] = [];
        if (totalInputArrows === 1) {
          arrowEndPositions.push(x + nodeWidth / 2);
        } else {
          // Distribute all arrows evenly across the arrow region
          const arrowSpacing = (arrowRegionRight - arrowRegionLeft) / (totalInputArrows - 1);
          for (let j = 0; j < numArrows; j++) {
            arrowEndPositions.push(arrowRegionLeft + arrowIndex * arrowSpacing);
            arrowIndex++;
          }
        }

        // Store input arrow positions for this node
        allInputArrowPositions.push(...arrowEndPositions);

        // Calculate arrow start positions on child's top edge
        // Distribute arrows evenly across the child's width
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

        // Calculate arrow positions - arrows connect child top edge to parent bottom edge
        const rectangleBottom = y + nodeHeight;
        const childTop = actualChildTopY;

        // Create arrows - connect child top edge to UnionExec's bottom edge
        // For UnionExec, arrows are diagonal (different X for start and end)
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
        }

        // Add column labels if available (once per child, not per arrow)
        if (childInfo.outputColumns && childInfo.outputColumns.length > 0 && numArrows > 0) {
          const arrowMidY = (childTop + rectangleBottom) / 2;
          const rightOffset = 5;
          // Use the rightmost arrow position for label placement
          const rightmostArrowX = Math.max(...arrowEndPositions);
          const projectionTextX = rightmostArrowX + rightOffset;

          // Create a set of ordered columns for color coding
          const orderedColumns = new Set(childInfo.outputSortOrder || []);
          const groupId = context.idGenerator.generateId();
          let currentX = projectionTextX;
          const fontSize = FONT_SIZES.COLUMN_LABEL;

          // Create text elements for each column
          let colIndex = 0;
          while (colIndex < childInfo.outputColumns.length) {
            const column = childInfo.outputColumns[colIndex];
            const isOrdered = orderedColumns.has(column);
            const color = isOrdered ? '#1e90ff' : context.config.nodeColor;

            // Group consecutive columns with the same color
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

            // Create text element for grouped columns
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
            groupTextElement.groupIds = [groupId];
            context.elements.push(groupTextElement);
            currentX += groupWidth;

            colIndex = k;
          }
        }
      }
    }

    // UnionExec: output arrows = total input arrows from all children
    // Calculate output arrow positions with ellipsis support
    const { positions: outputArrowPositions, fullCount: outputArrowCount } =
      context.arrowCalculator.calculateOutputArrowPositions(totalInputArrows, x, nodeWidth);

    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: outputArrowCount, // UnionExec: output arrows (full count, ellipsis handled in positions)
      inputArrowPositions: outputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }
}

