import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS, DYNAMIC_FILTER_DIMENSIONS } from '../constants';

/**
 * DataSourceExec node generator
 * DataSourceExec has special handling for file groups, creating ellipses for each file
 * Supports DynamicFilter visualization with orange-dashed ellipse
 * Creates arrows from file groups to DataSourceExec rectangle bottom edge
 */
export class DataSourceNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    // Use larger dimensions for DataSourceExec
    const nodeWidth = NODE_DIMENSIONS.DATASOURCE_WIDTH;
    const nodeHeight = NODE_DIMENSIONS.DATASOURCE_HEIGHT;

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

    // Create operator name text (centered)
    const operatorTextElement = context.elementFactory.createText({
      id: context.idGenerator.generateId(),
      x,
      y: y + 5,
      width: nodeWidth,
      height: TEXT_HEIGHTS.OPERATOR,
      text: 'DataSourceExec',
      fontSize: FONT_SIZES.OPERATOR,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    });
    context.elements.push(operatorTextElement);

    // Add limit detail text if present (like CoalescePartitionsExec)
    // Do not show other details (file_groups, projection, file_type) - they are not critical
    if (node.properties) {
      const limitText = context.propertyParser.extractLimit(node.properties);
      if (limitText) {
        // Use addLimitDetailText from base class (like CoalescePartitionsExec)
        this.addLimitDetailText(node, x, y, nodeWidth, nodeHeight, context);
      }

      // Check if DynamicFilter is present in predicate
      const hasDynamicFilter =
        node.properties.predicate &&
        (node.properties.predicate.includes('DynamicFilter') ||
          node.properties.predicate.includes('DynamicFilterPhysicalExpr'));

      if (hasDynamicFilter) {
        // Create orange-dashed-border ellipse (DynamicFilter) inside the rectangle
        const dfEllipseWidth = DYNAMIC_FILTER_DIMENSIONS.WIDTH;
        const dfEllipseHeight = DYNAMIC_FILTER_DIMENSIONS.HEIGHT;
        const dfEllipseX = x + nodeWidth / 2 - dfEllipseWidth / 2;
        const dfEllipseY = y + DYNAMIC_FILTER_DIMENSIONS.Y_OFFSET;
        const dfEllipseId = context.idGenerator.generateId();

        const dfEllipse = context.elementFactory.createEllipse({
          id: dfEllipseId,
          x: dfEllipseX,
          y: dfEllipseY,
          width: dfEllipseWidth,
          height: dfEllipseHeight,
          strokeColor: '#f08c00', // Orange border color
          backgroundColor: 'transparent',
          strokeStyle: 'dashed', // Dashed border
          roundnessType: 2,
        });
        context.elements.push(dfEllipse);

        // Create "DynamicFilter" text label inside the ellipse
        const dfText = context.elementFactory.createText({
          id: context.idGenerator.generateId(),
          x: dfEllipseX + (dfEllipseWidth - 100) / 2, // Center text
          y: dfEllipseY + dfEllipseHeight / 2 - 9, // Center vertically
          width: 100,
          height: 18,
          text: 'DynamicFilter',
          fontSize: FONT_SIZES.DETAILS,
          fontFamily: FONT_FAMILIES.BOLD,
          textAlign: 'center',
          verticalAlign: 'top',
          strokeColor: '#f08c00', // Orange color to match border
          containerId: dfEllipseId,
          autoResize: true,
          version: 1, // Explicitly set version to 1 to match original DataSourceExec implementation
        });
        context.elements.push(dfText);
      }
    }

    // Parse file groups and create ellipses for each file
    const fileGroups = context.propertyParser.parseFileGroups(node.properties);
    const ellipseInfo: Array<{ id: string; centerX: number; centerY: number; groupIndex: number }> =
      [];
    const groupRects: Array<{
      groupIndex: number;
      rectId: string;
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
    }> = [];
    let storedArrowEndPositions: number[] = []; // Store arrow end positions for inputArrowPositions calculation

    if (fileGroups.length > 0) {
      const ellipseSize = 60;
      const ellipseSpacing = 20; // Vertical spacing between ellipses within a group
      const groupSpacing = 40; // Horizontal spacing between groups
      const baseEllipseY = y + nodeHeight + 75;

      // Calculate total width needed for all groups (each group is one ellipse width)
      const totalWidth = fileGroups.length * ellipseSize + (fileGroups.length - 1) * groupSpacing;
      let currentGroupX = x + (nodeWidth - totalWidth) / 2;

      // Find the maximum height needed (for the group with most files)
      // Cap at 3 because we collapse groups larger than 2 files
      const maxFilesInGroup = Math.max(...fileGroups.map((g) => (g.length > 2 ? 3 : g.length)));
      const maxGroupHeight = maxFilesInGroup * ellipseSize + (maxFilesInGroup - 1) * ellipseSpacing;

      // Create ellipses for each file group
      for (let groupIndex = 0; groupIndex < fileGroups.length; groupIndex++) {
        const group = fileGroups[groupIndex];
        const groupEllipseIds: string[] = [];
        let groupMinY = baseEllipseY;
        let groupMaxY = baseEllipseY;

        // Center the group vertically if it has fewer files than the max
        // If group has more than 2 files, we'll display 3 elements (first, dots, last)
        const displayCount = group.length > 2 ? 3 : group.length;
        const groupHeight = displayCount * ellipseSize + (displayCount - 1) * ellipseSpacing;
        const groupStartY = baseEllipseY + (maxGroupHeight - groupHeight) / 2;

        // Create ellipses for files in this group (vertically stacked)
        for (let fileIndex = 0; fileIndex < group.length; fileIndex++) {
          // If more than 2 files, only show first and last, with dots in between
          if (group.length > 2) {
            if (fileIndex > 0 && fileIndex < group.length - 1) {
              // Skip middle files, but ensure we render the dots once
              if (fileIndex === 1) {
                // Render dots
                const ellipseX = currentGroupX;
                // Position dots in the middle slot (index 1)
                const ellipseY = groupStartY + 1 * (ellipseSize + ellipseSpacing);
                const dotsText = context.elementFactory.createText({
                  id: context.idGenerator.generateId(),
                  x: ellipseX + ellipseSize / 2 - 10,
                  y: ellipseY + ellipseSize / 2 - 10,
                  width: 20,
                  height: 20,
                  text: '...',
                  fontSize: FONT_SIZES.DETAILS,
                  fontFamily: FONT_FAMILIES.NORMAL,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  strokeColor: context.config.nodeColor,
                  autoResize: true,
                });
                // Set version to 43 to match original DataSourceExec implementation
                dotsText.version = 43;
                context.elements.push(dotsText);
              }
              continue;
            }
          }

          const ellipseX = currentGroupX;
          // Calculate Y position based on visual index
          let visualIndex = fileIndex;
          if (group.length > 2 && fileIndex === group.length - 1) {
            // Last file is visually at index 2
            visualIndex = 2;
          }

          const ellipseY = groupStartY + visualIndex * (ellipseSize + ellipseSpacing);
          const ellipseId = context.idGenerator.generateId();
          const ellipseCenterX = ellipseX + ellipseSize / 2;
          const ellipseCenterY = ellipseY + ellipseSize / 2;

          const ellipse = context.elementFactory.createEllipse({
            id: ellipseId,
            x: ellipseX,
            y: ellipseY,
            width: ellipseSize,
            height: ellipseSize,
            strokeColor: context.config.nodeColor,
            backgroundColor: 'transparent',
            roundnessType: 2,
          });
          // Set version to 43 to match original DataSourceExec implementation
          ellipse.version = 43;
          context.elements.push(ellipse);
          groupEllipseIds.push(ellipseId);

          // Create text inside ellipse using file name without extension
          const fileName = group[fileIndex];
          // Extract just the filename (basename) from the path, then remove extension
          const basename = fileName.split('/').pop() || fileName; // Get last part of path
          const fileNameWithoutExtension = basename.replace(/\.[^.]*$/, ''); // Remove extension
          const ellipseText = context.elementFactory.createText({
            id: context.idGenerator.generateId(),
            x: ellipseX + ellipseSize / 2 - 10,
            y: ellipseY + ellipseSize / 2 - 15,
            width: 20,
            height: 30,
            text: fileNameWithoutExtension,
            fontSize: FONT_SIZES.ELLIPSE_TEXT,
            fontFamily: FONT_FAMILIES.BOLD,
            textAlign: 'center',
            verticalAlign: 'middle',
            strokeColor: context.config.nodeColor,
            containerId: ellipseId,
            autoResize: true,
            lineHeight: 1.15,
          });
          // Set version to 43 to match original DataSourceExec implementation
          ellipseText.version = 43;
          context.elements.push(ellipseText);

          // Store ellipse info for arrow calculation
          ellipseInfo.push({
            id: ellipseId,
            centerX: ellipseCenterX,
            centerY: ellipseCenterY,
            groupIndex,
          });

          // Update min/max Y for group rectangle
          if (fileIndex === 0) {
            groupMinY = ellipseY;
          }
          // For max Y, if we have > 2 files, the last rendered element is at visual index 2
          if (group.length > 2) {
            if (fileIndex === group.length - 1) {
              groupMaxY = ellipseY + ellipseSize;
            }
          } else {
            if (fileIndex === group.length - 1) {
              groupMaxY = ellipseY + ellipseSize;
            }
          }
        }

        // Create dotted rectangle around group if it has more than one file
        if (group.length > 1) {
          const padding = 10;
          const groupRectId = context.idGenerator.generateId();
          const groupRect = context.elementFactory.createRectangle({
            id: groupRectId,
            x: currentGroupX - padding,
            y: groupMinY - padding,
            width: ellipseSize + 2 * padding,
            height: groupMaxY - groupMinY + 2 * padding,
            strokeColor: context.config.nodeColor,
            roundnessType: 3,
          });
          // Set stroke style to dashed for dotted rectangle
          groupRect.strokeStyle = 'dashed';
          context.elements.push(groupRect);
          groupRects.push({
            groupIndex,
            rectId: groupRectId,
            minX: currentGroupX - padding,
            maxX: currentGroupX + ellipseSize + padding,
            minY: groupMinY - padding,
            maxY: groupMaxY + padding,
          });
        }

        // Move to next group horizontally
        currentGroupX += ellipseSize + groupSpacing;
      }

      // Calculate arrow end positions per group
      const rectangleLeft = x;
      const rectangleRight = x + nodeWidth;
      const rectangleBottom = y + nodeHeight;

      // Get group center X positions
      const groupCenterXs: number[] = [];
      for (let groupIndex = 0; groupIndex < fileGroups.length; groupIndex++) {
        const groupRect = groupRects.find((gr) => gr.groupIndex === groupIndex);
        if (groupRect) {
          // Use center of the group rectangle
          groupCenterXs.push(groupRect.minX + (groupRect.maxX - groupRect.minX) / 2);
        } else {
          // Use center of the single ellipse in this group
          const groupEllipse = ellipseInfo.find((e) => e.groupIndex === groupIndex);
          if (groupEllipse) {
            groupCenterXs.push(groupEllipse.centerX);
          }
        }
      }

      // Check if all group centers fit within rectangle width
      const allFit = groupCenterXs.every(
        (centerX) => centerX >= rectangleLeft && centerX <= rectangleRight
      );

      let arrowEndPositions: number[];
      const totalGroups = fileGroups.length;
      if (allFit && totalGroups > 0) {
        // All arrows can be vertical - use group center x positions
        arrowEndPositions = groupCenterXs;
      } else {
        // Distribute arrows: first to left corner, last to right corner, rest evenly spaced
        arrowEndPositions = [];
        if (totalGroups === 1) {
          arrowEndPositions.push(rectangleLeft + nodeWidth / 2); // Center if only one
        } else {
          // First arrow to left corner
          arrowEndPositions.push(rectangleLeft);
          // Last arrow to right corner
          arrowEndPositions.push(rectangleRight);
          // Middle arrows evenly spaced
          if (totalGroups > 2) {
            const spacing = (rectangleRight - rectangleLeft) / (totalGroups - 1);
            for (let i = 1; i < totalGroups - 1; i++) {
              arrowEndPositions.splice(i, 0, rectangleLeft + i * spacing);
            }
          }
        }
      }

      // Store arrowEndPositions for use in inputArrowPositions calculation
      storedArrowEndPositions = [...arrowEndPositions];

      // Create arrows with calculated positions - one arrow per group
      // If a group has a dotted rectangle, arrow starts from top of rectangle
      // Otherwise, arrow starts from top of the single ellipse
      for (let groupIndex = 0; groupIndex < fileGroups.length; groupIndex++) {
        const groupRect = groupRects.find((gr) => gr.groupIndex === groupIndex);
        const arrowEndX = arrowEndPositions[groupIndex];

        let arrowStartX: number;
        let arrowStartY: number;
        let arrowStartElementId: string;

        if (groupRect) {
          // Arrow starts from top center of the dotted rectangle
          arrowStartX = groupRect.minX + (groupRect.maxX - groupRect.minX) / 2;
          arrowStartY = groupRect.minY;
          arrowStartElementId = groupRect.rectId;
        } else {
          // Arrow starts from top of the single ellipse
          const groupEllipse = ellipseInfo.find((e) => e.groupIndex === groupIndex);
          if (!groupEllipse) continue;
          const ellipseSize = 60;
          arrowStartX = groupEllipse.centerX;
          arrowStartY = groupEllipse.centerY - ellipseSize / 2;
          arrowStartElementId = groupEllipse.id;
        }

        const arrowId = context.idGenerator.generateId();
        const arrow = context.elementFactory.createArrow({
          id: arrowId,
          startX: arrowStartX,
          startY: arrowStartY,
          endX: arrowEndX,
          endY: rectangleBottom,
          childRectId: arrowStartElementId,
          parentRectId: rectId,
          strokeColor: context.config.arrowColor,
        });
        context.elements.push(arrow);
      }

      // Create projection text element at the middle of the edges (arrows)
      if (node.properties && node.properties.projection) {
        const projectionMatch = node.properties.projection.match(/\[([^\]]+)\]/);
        if (projectionMatch) {
          // Calculate midpoint between rectangle bottom and top of first group
          const ellipseSize = 60;
          let firstGroupTopY: number;
          if (groupRects.length > 0) {
            // Use top of first group rectangle
            firstGroupTopY = groupRects[0].minY;
          } else if (ellipseInfo.length > 0) {
            // Use top of first ellipse
            firstGroupTopY = ellipseInfo[0].centerY - ellipseSize / 2;
          } else {
            firstGroupTopY = baseEllipseY;
          }
          const arrowMidY = (y + nodeHeight + firstGroupTopY) / 2;

          // Parse projection columns
          const projectionText = projectionMatch[1];
          const projectionColumns = context.propertyParser.parseCommaSeparated(projectionText);

          // Parse output_ordering to extract column names if present
          const orderedColumns: Set<string> = new Set();
          if (node.properties.output_ordering) {
            // Extract column names from output_ordering format: [f_dkey@0 ASC NULLS LAST, timestamp@1 ASC NULLS LAST]
            const orderingMatch = node.properties.output_ordering.match(/\[([^\]]+)\]/);
            if (orderingMatch) {
              const orderingParts = context.propertyParser.parseCommaSeparated(orderingMatch[1]);
              for (const part of orderingParts) {
                // Extract column name before @ symbol
                const columnMatch = part.trim().match(/^([^@]+)/);
                if (columnMatch) {
                  orderedColumns.add(columnMatch[1].trim());
                }
              }
            }
          }

          // Position text to the right of the rightmost arrow to avoid overlap
          // Calculate the rightmost arrow position (center of rightmost group)
          let rightmostArrowX: number;
          if (groupRects.length > 0) {
            const rightmostGroupRect = groupRects[groupRects.length - 1];
            rightmostArrowX =
              rightmostGroupRect.minX + (rightmostGroupRect.maxX - rightmostGroupRect.minX) / 2;
          } else if (ellipseInfo.length > 0) {
            const rightmostEllipse = ellipseInfo[ellipseInfo.length - 1];
            rightmostArrowX = rightmostEllipse.centerX;
          } else {
            rightmostArrowX = x + nodeWidth;
          }
          const rightOffset = 5; // Space between arrow and text left edge
          const projectionTextX = rightmostArrowX + rightOffset;

          // Create text elements for each column, coloring ordered columns in blue
          // Group consecutive columns with the same color together
          const groupId = context.idGenerator.generateId(); // Use same group ID for all projection text parts
          let currentX = projectionTextX;
          const charWidth = 8; // Approximate character width
          const textHeight = TEXT_HEIGHTS.COLUMN_LABEL;

          let i = 0;
          while (i < projectionColumns.length) {
            const column = projectionColumns[i].trim();
            const isOrdered = orderedColumns.has(column);
            const color = isOrdered ? '#1e90ff' : context.config.nodeColor; // Blue for ordered columns, black otherwise

            // Group consecutive columns with the same color
            const groupParts: string[] = [column];
            let j = i + 1;
            while (j < projectionColumns.length) {
              const nextColumn = projectionColumns[j].trim();
              const nextIsOrdered = orderedColumns.has(nextColumn);
              const nextColor = nextIsOrdered ? '#1e90ff' : context.config.nodeColor;
              if (nextColor === color) {
                groupParts.push(nextColumn);
                j++;
              } else {
                break;
              }
            }

            // Create text element for grouped columns
            // Add comma prefix if not the first group
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

            i = j; // Move to next group
          }
        }
      }
    }

    // Count input arrows (number of file groups)
    const inputArrowCount = fileGroups.length > 0 ? fileGroups.length : 0;

    // Return input arrow positions (the X positions where arrows connect to this node from below)
    // These are the arrow end positions on this node's bottom edge
    // Use the same positions as arrowEndPositions calculated above (which are on the rectangle's bottom edge)
    const inputArrowPositions: number[] =
      fileGroups.length > 0 && storedArrowEndPositions ? [...storedArrowEndPositions] : [];

    // Extract output columns from projection property
    const outputColumns: string[] = [];
    if (node.properties && node.properties.projection) {
      const projectionMatch = node.properties.projection.match(/\[([^\]]+)\]/);
      if (projectionMatch) {
        const projectionText = projectionMatch[1];
        outputColumns.push(...context.propertyParser.parseCommaSeparated(projectionText).map((col) => col.trim()));
      }
    }

    // Extract output sort order from output_ordering property
    const outputSortOrder: string[] = [];
    if (node.properties && node.properties.output_ordering) {
      const orderingMatch = node.properties.output_ordering.match(/\[([^\]]+)\]/);
      if (orderingMatch) {
        const orderingParts = context.propertyParser.parseCommaSeparated(orderingMatch[1]);
        for (const part of orderingParts) {
          const columnMatch = part.trim().match(/^([^@]+)/);
          if (columnMatch) {
            outputSortOrder.push(columnMatch[1].trim());
          }
        }
      }
    }

    return {
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount,
      inputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }
}

