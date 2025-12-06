import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { ExcalidrawText } from '../../types/excalidraw.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { NodeGeneratorStrategy } from './node-generator.strategy';
import { SPACING, TEXT_HEIGHTS, FONT_SIZES, FONT_FAMILIES } from '../constants';
import { DetailTextBuilder } from '../builders/detail-text.builder';

/**
 * Base class for node generators
 * Provides common functionality for processing children and creating arrows
 */
export abstract class BaseNodeGenerator implements NodeGeneratorStrategy {
  /**
   * Generates Excalidraw elements for a node
   * Must be implemented by subclasses
   */
  abstract generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    isRoot: boolean,
    context: GenerationContext
  ): NodeInfo;

  /**
   * Processes children nodes recursively
   * Common pattern used by most node generators
   */
  protected processChildren(
    node: ExecutionPlanNode,
    parentX: number,
    parentY: number,
    parentHeight: number,
    parentRectId: string,
    parentWidth: number,
    context: GenerationContext,
    generateNodeCallback: (
      child: ExecutionPlanNode,
      childX: number,
      childY: number,
      isRoot: boolean,
      context: GenerationContext
    ) => NodeInfo
  ): {
    maxChildY: number;
    totalInputArrows: number;
    allInputArrowPositions: number[];
    firstChildInfo: NodeInfo | null;
    childrenInfo: NodeInfo[];
  } {
    let maxChildY = parentY + parentHeight + context.config.verticalSpacing;
    let totalInputArrows = 0;
    const allInputArrowPositions: number[] = [];
    let firstChildInfo: NodeInfo | null = null;
    const childrenInfo: NodeInfo[] = [];

    if (node.children.length > 0) {
      // Use the same X position as parent for all children (vertical alignment)
      const childX = parentX;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // Adjust vertical spacing to make arrows 3/5 of original length
        const adjustedVerticalSpacing = context.config.verticalSpacing * SPACING.ARROW_VERTICAL_RATIO;
        const childY = parentY + parentHeight + adjustedVerticalSpacing;

        // Generate child elements recursively (children are not root)
        const childInfo = generateNodeCallback(child, childX, childY, false, context);
        childrenInfo.push(childInfo);

        // Store first child info for output columns calculation
        if (i === 0) {
          firstChildInfo = childInfo;
        }

        // Create arrows from child to parent
        const numArrows = Math.max(1, childInfo.inputArrowCount);
        totalInputArrows += numArrows;

        // Use child's input arrow positions if available and count matches
        // Otherwise, calculate balanced positions
        let arrowPositions: number[];
        if (childInfo.inputArrowPositions.length === numArrows && numArrows > 0) {
          // Align with child's input arrows
          arrowPositions = childInfo.inputArrowPositions;
        } else {
          // Balance arrows across parent width
          const rectangleLeft = parentX;
          const rectangleRight = parentX + parentWidth;
          arrowPositions = [];
          if (numArrows === 1) {
            arrowPositions.push(parentX + parentWidth / 2);
          } else if (numArrows === 2) {
            arrowPositions.push(rectangleLeft);
            arrowPositions.push(rectangleRight);
          } else {
            // More than two arrows: distribute evenly
            const spacing = (rectangleRight - rectangleLeft) / (numArrows - 1);
            for (let j = 0; j < numArrows; j++) {
              arrowPositions.push(rectangleLeft + j * spacing);
            }
          }
        }

        // Store input arrow positions for this node
        allInputArrowPositions.push(...arrowPositions);

        // Calculate arrow positions - since nodes are vertically aligned, make arrows vertical
        const rectangleBottom = parentY + parentHeight;
        const childTop = childY;

        // Create arrows - vertical lines connecting child top to parent bottom
        this.createArrowsToParent(
          numArrows,
          arrowPositions,
          childTop,
          rectangleBottom,
          childInfo.rectId,
          parentRectId,
          childInfo.outputColumns,
          childInfo.outputSortOrder,
          context
        );

        // Track the maximum Y position for next child
        maxChildY = Math.max(maxChildY, childInfo.y + childInfo.height);
      }
    }

    return {
      maxChildY,
      totalInputArrows,
      allInputArrowPositions,
      firstChildInfo,
      childrenInfo,
    };
  }

  /**
   * Creates arrows from child to parent with ellipsis handling
   */
  protected createArrowsToParent(
    numArrows: number,
    arrowPositions: number[],
    childTop: number,
    parentBottom: number,
    childRectId: string,
    parentRectId: string,
    columns: string[],
    sortOrder: string[],
    context: GenerationContext
  ): void {
    // This will be implemented using ArrowPositionCalculator and ColumnLabelRenderer
    // For now, delegate to a helper method that will be refactored
    // TODO: Refactor to use ArrowPositionCalculator.handleEllipsis() and ColumnLabelRenderer
    this.createArrowsWithEllipsisHelper(
      numArrows,
      arrowPositions,
      childTop,
      parentBottom,
      childRectId,
      parentRectId,
      columns,
      sortOrder,
      context
    );
  }

  /**
   * Binds an arrow to the connected elements so Excalidraw keeps them attached when moved
   */
  protected bindArrowToElements(
    context: GenerationContext,
    arrowId: string,
    elementIds: string[]
  ): void {
    for (const element of context.elements) {
      if (!elementIds.includes(element.id)) {
        continue;
      }

      if (!element.boundElements) {
        element.boundElements = [];
      }

      const alreadyBound = element.boundElements.some((binding) => binding.id === arrowId);
      if (!alreadyBound) {
        element.boundElements.push({ id: arrowId, type: 'arrow' });
      }
    }
  }

  /**
   * Helper method for creating arrows with ellipsis
   * Uses ArrowPositionCalculator and ColumnLabelRenderer for consistent behavior
   */
  private createArrowsWithEllipsisHelper(
    numArrows: number,
    arrowPositions: number[],
    childTop: number,
    parentBottom: number,
    childRectId: string,
    parentRectId: string,
    columns: string[],
    sortOrder: string[],
    context: GenerationContext
  ): void {
    // Use ArrowPositionCalculator for ellipsis position calculation
    const ellipsisResult = context.arrowCalculator.calculateEllipsisPositions(numArrows, arrowPositions);
    const { adjustedPositions, showEllipsis, firstArrowsCount, lastArrowsCount, ellipsisX } = ellipsisResult;

    // Create first set of arrows
    for (let j = 0; j < firstArrowsCount; j++) {
      const arrowId = context.idGenerator.generateId();
      const arrowX = adjustedPositions[j];
      const arrow = context.elementFactory.createArrow({
        id: arrowId,
        startX: arrowX,
        startY: childTop,
        endX: arrowX,
        endY: parentBottom,
        childRectId,
        parentRectId,
        strokeColor: context.config.arrowColor,
      });
      context.elements.push(arrow);
      this.bindArrowToElements(context, arrowId, [childRectId, parentRectId]);
    }

    // Add "..." text if needed
    if (showEllipsis && ellipsisX !== undefined) {
      const arrowMidY = (childTop + parentBottom) / 2;
      const ellipsisText = context.elementFactory.createText({
        id: context.idGenerator.generateId(),
        x: ellipsisX - 10,
        y: arrowMidY - 10,
        width: 20,
        height: 20,
        text: '...',
        fontSize: 14,
        fontFamily: 6,
        textAlign: 'center',
        verticalAlign: 'top',
        strokeColor: context.config.nodeColor,
      });
      context.elements.push(ellipsisText);
    }

    // Create last set of arrows if ellipsis is shown
    if (showEllipsis) {
      for (let j = 0; j < lastArrowsCount; j++) {
        const arrowId = context.idGenerator.generateId();
        const arrowX = adjustedPositions[firstArrowsCount + j];
        const arrow = context.elementFactory.createArrow({
          id: arrowId,
          startX: arrowX,
          startY: childTop,
          endX: arrowX,
          endY: parentBottom,
          childRectId,
          parentRectId,
          strokeColor: context.config.arrowColor,
        });
        context.elements.push(arrow);
        this.bindArrowToElements(context, arrowId, [childRectId, parentRectId]);
      }
    }

    // Display column labels if provided using ColumnLabelRenderer
    if (columns && columns.length > 0) {
      const arrowMidY = (childTop + parentBottom) / 2;
      // Use adjusted positions if ellipsis is shown, otherwise use original positions
      const positionsToUse = showEllipsis && adjustedPositions.length > 0 ? adjustedPositions : arrowPositions;
      const rightmostArrowX = positionsToUse.length > 0 ? positionsToUse[positionsToUse.length - 1] : childTop;

      const labels = context.columnRenderer.renderLabelsRight(
        columns,
        sortOrder || [],
        arrowMidY,
        rightmostArrowX,
        context.config.nodeColor,
        5 // rightOffset
      );
      context.elements.push(...labels);
    }
  }

  /**
   * Creates operator name text element
   */
  protected createOperatorText(
    operatorName: string,
    rectId: string,
    x: number,
    y: number,
    width: number,
    context: GenerationContext
  ): ExcalidrawText {
    return context.elementFactory.createText({
      id: context.idGenerator.generateId(),
      x: x + 10,
      y: y + 10,
      width: width - 20,
      height: context.config.operatorFontSize + 4,
      text: operatorName,
      fontSize: context.config.operatorFontSize,
      fontFamily: 7, // Bold font
      textAlign: 'left',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    });
  }

  /**
   * Extracts limit information from node properties and adds it to detail builder
   * Handles formats: "limit=100", "fetch=100", "TopK(fetch=100)"
   * Returns the limit text if found, null otherwise
   */
  protected extractAndAddLimit(
    node: ExecutionPlanNode,
    detailBuilder: DetailTextBuilder,
    context: GenerationContext
  ): string | null {
    const limitText = context.propertyParser.extractLimit(node.properties);
    if (limitText) {
      detailBuilder.addLine(limitText, context.config.nodeColor);
    }
    return limitText;
  }

  /**
   * Adds limit information as detail text element
   * Returns the limit text if found, null otherwise
   * This is a simpler version that creates text directly (for generators that don't use DetailTextBuilder)
   */
  protected addLimitDetailText(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    nodeWidth: number,
    nodeHeight: number,
    context: GenerationContext
  ): string | null {
    const limitText = context.propertyParser.extractLimit(node.properties);
    if (limitText) {
      const detailTextElement = context.elementFactory.createText({
        id: context.idGenerator.generateId(),
        x: x + 10,
        y: y + nodeHeight - 25, // Position near bottom
        width: nodeWidth - 20,
        height: 20,
        text: limitText,
        fontSize: FONT_SIZES.DETAILS,
        fontFamily: FONT_FAMILIES.NORMAL,
        textAlign: 'center',
        verticalAlign: 'top',
        strokeColor: context.config.nodeColor,
      });
      context.elements.push(detailTextElement);
    }
    return limitText;
  }

  /**
   * Calculates adjusted node height if limit information is present
   * Adds extra height for limit detail line
   */
  protected calculateAdjustedHeight(
    baseHeight: number,
    hasLimit: boolean,
    existingDetailLines: number = 0
  ): number {
    if (hasLimit && existingDetailLines === 0) {
      // Add space for one additional detail line
      return baseHeight + TEXT_HEIGHTS.DETAILS_LINE;
    }
    return baseHeight;
  }
}
