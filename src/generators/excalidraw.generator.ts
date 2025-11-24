import {
  ExcalidrawData,
  ExcalidrawElement,
  ExcalidrawRectangle,
  ExcalidrawArrow,
  ExcalidrawText,
  ExcalidrawEllipse,
  ExcalidrawConfig,
} from '../types/excalidraw.types';
import { ExecutionPlanNode } from '../types/execution-plan.types';

/**
 * Generator for Excalidraw JSON from execution plan nodes
 * Follows Single Responsibility Principle - only responsible for generation
 */
export class ExcalidrawGenerator {
  private readonly config: Required<ExcalidrawConfig>;
  private idCounter = 0;
  private indexCounter = 0;

  constructor(config: ExcalidrawConfig = {}) {
    const baseFontSize = config.fontSize ?? 16;
    this.config = {
      nodeWidth: config.nodeWidth ?? 200,
      nodeHeight: config.nodeHeight ?? 80,
      verticalSpacing: config.verticalSpacing ?? 100,
      horizontalSpacing: config.horizontalSpacing ?? 50,
      fontSize: baseFontSize,
      operatorFontSize: config.operatorFontSize ?? Math.round(baseFontSize * 1.25),
      detailsFontSize: config.detailsFontSize ?? Math.round(baseFontSize * 0.875),
      nodeColor: config.nodeColor ?? '#1e1e1e',
      arrowColor: config.arrowColor ?? '#1e1e1e',
    };
  }

  /**
   * Generates Excalidraw JSON from an execution plan node tree
   * @param root - Root node of the execution plan
   * @returns Complete Excalidraw data structure
   */
  public generate(root: ExecutionPlanNode | null): ExcalidrawData {
    const elements: ExcalidrawElement[] = [];

    if (root) {
      // Root node is the first line of physical_plan - it should not have output arrows
      this.generateNodeElements(root, 0, 0, elements, true);
    }

    return {
      type: 'excalidraw',
      version: 2,
      source: 'https://excalidraw.com',
      elements,
      appState: {
        gridSize: null,
        viewBackgroundColor: '#ffffff',
      },
      files: {},
    };
  }

  /**
   * Recursively generates Excalidraw elements for nodes
   * Returns node info including the number of input arrows
   * @param isRoot - Whether this node is the root node (first line of physical_plan)
   */
  private generateNodeElements(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    elements: ExcalidrawElement[],
    isRoot: boolean = false
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    rectId: string;
    inputArrowCount: number;
    inputArrowPositions: number[];
    outputColumns: string[];
    outputSortOrder: string[];
  } {
    // Special handling for DataSourceExec
    if (node.operator === 'DataSourceExec') {
      return this.generateDataSourceExecElements(node, x, y, elements, isRoot);
    }

    // Special handling for FilterExec
    if (node.operator === 'FilterExec') {
      return this.generateFilterExecElements(node, x, y, elements, isRoot);
    }

    // Special handling for CoalesceBatchesExec
    if (node.operator === 'CoalesceBatchesExec') {
      return this.generateCoalesceBatchesExecElements(node, x, y, elements, isRoot);
    }

    // Special handling for CoalescePartitionsExec
    if (node.operator === 'CoalescePartitionsExec') {
      return this.generateCoalescePartitionsExecElements(node, x, y, elements, isRoot);
    }

    // Special handling for RepartitionExec
    if (node.operator === 'RepartitionExec') {
      return this.generateRepartitionExecElements(node, x, y, elements, isRoot);
    }

    // Special handling for AggregateExec
    if (node.operator === 'AggregateExec') {
      return this.generateAggregateExecElements(node, x, y, elements, isRoot);
    }

    // Special handling for ProjectionExec
    if (node.operator === 'ProjectionExec') {
      return this.generateProjectionExecElements(node, x, y, elements, isRoot);
    }

    // Special handling for SortExec
    if (node.operator === 'SortExec') {
      return this.generateSortExecElements(node, x, y, elements, isRoot);
    }

    // Special handling for SortPreservingMergeExec
    if (node.operator === 'SortPreservingMergeExec') {
      return this.generateSortPreservingMergeExecElements(node, x, y, elements, isRoot);
    }

    // Special handling for HashJoinExec
    if (node.operator === 'HashJoinExec') {
      return this.generateHashJoinExecElements(node, x, y, elements, isRoot);
    }

    // Special handling for UnionExec
    if (node.operator === 'UnionExec') {
      return this.generateUnionExecElements(node, x, y, elements, isRoot);
    }

    // Create rectangle for the node
    const rectId = this.generateId();
    const rect = this.createRectangle(rectId, x, y);
    elements.push(rect);

    // Create operator name text (bold, like other operators)
    // Use createTextElements but override details with "Unimplemented"
    const operatorText: ExcalidrawText = {
      id: this.generateId(),
      type: 'text',
      x: x + 10,
      y: y + 10,
      width: this.config.nodeWidth - 20,
      height: this.config.operatorFontSize + 4,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: null,
      seed: this.generateSeed(),
      version: 1,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: node.operator,
      fontSize: this.config.operatorFontSize,
      fontFamily: 7, // Bold font
      textAlign: 'left',
      verticalAlign: 'top',
      baseline: this.config.operatorFontSize,
      containerId: rectId,
      originalText: node.operator,
      autoResize: false,
      lineHeight: 1.25,
    };
    elements.push(operatorText);

    // For unimplemented operators, add "Unimplemented" text in red in the details section (instead of properties)
    const unimplementedText: ExcalidrawText = {
      id: this.generateId(),
      type: 'text',
      x: x + 10,
      y: y + this.config.operatorFontSize + 14,
      width: this.config.nodeWidth - 20,
      height: this.config.detailsFontSize + 4,
      angle: 0,
      strokeColor: '#ff0000', // Red color
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: null,
      seed: this.generateSeed(),
      version: 1,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: 'Unimplemented',
      fontSize: this.config.detailsFontSize,
      fontFamily: 1, // Regular font
      textAlign: 'left',
      verticalAlign: 'top',
      baseline: this.config.detailsFontSize,
      containerId: rectId,
      originalText: 'Unimplemented',
      autoResize: false,
      lineHeight: 1.25,
    };
    elements.push(unimplementedText);

    // Calculate positions for children
    // All nodes at the same depth should have the same X position (vertical alignment)
    let maxChildY = y + this.config.nodeHeight + this.config.verticalSpacing;
    let totalInputArrows = 0;
    const allInputArrowPositions: number[] = []; // Track all input arrow positions
    let firstChildInfo: { outputColumns: string[]; outputSortOrder: string[] } | null = null;

    if (node.children.length > 0) {
      // Use the same X position as parent for all children (vertical alignment)
      const childX = x;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // Adjust vertical spacing to make arrows 3/5 of original length
        // Original spacing creates arrows of length = verticalSpacing
        // New spacing should create arrows of length = verticalSpacing * 3/5
        // So child should be positioned at: y + nodeHeight + verticalSpacing * 3/5
        // But we want arrows to connect edges, so:
        // Arrow length = (y + nodeHeight) - childY = verticalSpacing * 3/5
        // Therefore: childY = y + nodeHeight - verticalSpacing * 3/5
        // Or equivalently: childY = y + nodeHeight + verticalSpacing * 2/5 (moving child up)
        // Actually, simpler: childY = y + nodeHeight + verticalSpacing * 3/5
        const adjustedVerticalSpacing = (this.config.verticalSpacing * 3) / 5;
        const childY = y + this.config.nodeHeight + adjustedVerticalSpacing;

        // Generate child elements recursively (children are not root)
        // All children at the same depth use the same X position
        const childInfo = this.generateNodeElements(child, childX, childY, elements, false);

        // Store first child info for output columns calculation
        if (i === 0) {
          firstChildInfo = childInfo;
        }

        // Create arrows from child to parent
        // For regular operators, ensure at least 1 arrow per child
        // For special operators (DataSourceExec, FilterExec, CoalesceBatchesExec, RepartitionExec, AggregateExec, ProjectionExec, SortExec), use input arrow count
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
          const rectangleLeft = x;
          const rectangleRight = x + this.config.nodeWidth;
          arrowPositions = [];
          if (numArrows === 1) {
            arrowPositions.push(x + this.config.nodeWidth / 2);
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
        // Arrows connect: top edge of child rectangle to bottom edge of parent rectangle
        const rectangleBottom = y + this.config.nodeHeight;
        const childTop = childY;

        // Create arrows - vertical lines connecting child top to parent bottom
        // Use helper method to handle ellipsis for many arrows
        this.createArrowsWithEllipsis(
          numArrows,
          arrowPositions,
          childInfo.inputArrowPositions,
          childTop,
          rectangleBottom,
          childInfo.rectId,
          rectId,
          elements
        );

        // Track the maximum Y position for next child
        maxChildY = Math.max(maxChildY, childInfo.y + childInfo.height);
      }
    }

    // For default nodes, output columns and sort order are the same as input (from children)
    // If no children, use empty arrays
    const outputColumns: string[] = [];
    const outputSortOrder: string[] = [];

    if (firstChildInfo) {
      // Use columns from first child (assuming all children have same columns)
      outputColumns.push(...firstChildInfo.outputColumns);
      outputSortOrder.push(...firstChildInfo.outputSortOrder);
    }

    return {
      x,
      y: maxChildY,
      width: this.config.nodeWidth,
      height: this.config.nodeHeight,
      rectId,
      inputArrowCount: totalInputArrows,
      inputArrowPositions: allInputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }

  /**
   * Creates a rectangle element
   */
  private createRectangle(id: string, x: number, y: number): ExcalidrawRectangle {
    return {
      id,
      type: 'rectangle',
      x,
      y,
      width: this.config.nodeWidth,
      height: this.config.nodeHeight,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: { type: 3 },
      seed: this.generateSeed(),
      version: 1,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
    };
  }

  /**
   * Creates arrows with ellipsis handling when there are too many arrows
   * If there are more than MAX_ARROWS_TO_SHOW arrows, shows first few, "...", and last few
   * Also displays column labels next to arrows
   */
  private createArrowsWithEllipsis(
    numArrows: number,
    arrowPositions: number[],
    _childInputArrowPositions: number[], // Unused - kept for API compatibility, arrows are kept straight
    childTop: number,
    rectangleBottom: number,
    childRectId: string,
    parentRectId: string,
    elements: ExcalidrawElement[],
    columns?: string[],
    sortOrder?: string[]
  ): void {
    const ARROWS_BEFORE_ELLIPSIS = 2;
    const ARROWS_AFTER_ELLIPSIS = 2;
    const showEllipsis = numArrows > ARROWS_BEFORE_ELLIPSIS + ARROWS_AFTER_ELLIPSIS;
    const firstArrowsCount = showEllipsis ? ARROWS_BEFORE_ELLIPSIS : numArrows;
    const lastArrowsCount = showEllipsis ? ARROWS_AFTER_ELLIPSIS : 0;

    // Calculate central region for arrow positions (60% of width, centered)
    // This avoids spreading arrows across the full length of the rectangle edge
    // Add spacing between arrows so they don't touch
    let adjustedArrowPositions: number[] = [];
    if (showEllipsis && arrowPositions.length > 0) {
      // Find the min and max X positions
      const minX = Math.min(...arrowPositions);
      const maxX = Math.max(...arrowPositions);
      const totalWidth = maxX - minX;

      // Calculate central region (60% of total width, centered)
      const centerRegionWidth = totalWidth * 0.6;
      const centerRegionLeft = minX + totalWidth / 2 - centerRegionWidth / 2;

      // Minimum spacing between arrows to avoid touching (e.g., 20 pixels)
      const minArrowSpacing = 20;

      // For first arrows: distribute in left part of central region with spacing
      if (firstArrowsCount > 0) {
        // Calculate available width for first arrows (left half of central region)
        const firstRegionWidth = centerRegionWidth / 2;
        const firstRegionStart = centerRegionLeft;

        // Check if we have enough space for spacing
        const requiredWidth = (firstArrowsCount - 1) * minArrowSpacing;
        if (requiredWidth <= firstRegionWidth) {
          // Enough space: distribute evenly with minimum spacing
          const startX = firstRegionStart + (firstRegionWidth - requiredWidth) / 2;
          for (let i = 0; i < firstArrowsCount; i++) {
            adjustedArrowPositions.push(startX + i * minArrowSpacing);
          }
        } else {
          // Not enough space: distribute evenly across available width
          const spacing = firstRegionWidth / (firstArrowsCount - 1);
          for (let i = 0; i < firstArrowsCount; i++) {
            adjustedArrowPositions.push(firstRegionStart + i * spacing);
          }
        }
      }

      // For last arrows: distribute in right part of central region with spacing
      if (lastArrowsCount > 0) {
        // Calculate available width for last arrows (right half of central region)
        const lastRegionWidth = centerRegionWidth / 2;
        const lastRegionStart = centerRegionLeft + centerRegionWidth / 2;

        // Check if we have enough space for spacing
        const requiredWidth = (lastArrowsCount - 1) * minArrowSpacing;
        if (requiredWidth <= lastRegionWidth) {
          // Enough space: distribute evenly with minimum spacing
          const startX = lastRegionStart + (lastRegionWidth - requiredWidth) / 2;
          for (let i = 0; i < lastArrowsCount; i++) {
            adjustedArrowPositions.push(startX + i * minArrowSpacing);
          }
        } else {
          // Not enough space: distribute evenly across available width
          const spacing = lastRegionWidth / (lastArrowsCount - 1);
          for (let i = 0; i < lastArrowsCount; i++) {
            adjustedArrowPositions.push(lastRegionStart + i * spacing);
          }
        }
      }
    } else {
      // No ellipsis, use original positions
      adjustedArrowPositions = [...arrowPositions];
    }

    // Create first set of arrows
    for (let j = 0; j < firstArrowsCount; j++) {
      const arrowId = this.generateId();
      const arrowX = adjustedArrowPositions[j];
      // Keep arrows straight: use same X position for start and end
      const startX = arrowX;
      const arrow = this.createArrowWithBinding(
        arrowId,
        startX,
        childTop,
        arrowX,
        rectangleBottom,
        childRectId,
        parentRectId
      );
      elements.push(arrow);
    }

    // Add "..." text if needed
    if (showEllipsis) {
      const ellipsisTextId = this.generateId();
      // Position ellipsis in the center of the central region
      const minX = Math.min(...arrowPositions);
      const maxX = Math.max(...arrowPositions);
      const totalWidth = maxX - minX;
      const centerRegionWidth = totalWidth * 0.6;
      const centerRegionLeft = minX + totalWidth / 2 - centerRegionWidth / 2;
      const middleX = centerRegionLeft + centerRegionWidth / 2;
      const ellipsisText: ExcalidrawText = {
        id: ellipsisTextId,
        type: 'text',
        x: middleX - 10,
        y: childTop + (rectangleBottom - childTop) / 2 - 10,
        width: 20,
        height: 20,
        angle: 0,
        strokeColor: this.config.nodeColor,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: this.generateIndex(),
        roundness: null,
        seed: this.generateSeed(),
        version: 1,
        versionNonce: this.generateSeed(),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        text: '...',
        fontSize: 14,
        fontFamily: 6, // Normal font
        textAlign: 'center',
        verticalAlign: 'top',
        baseline: 14,
        containerId: null,
        originalText: '...',
        autoResize: false,
        lineHeight: 1.25,
      };
      elements.push(ellipsisText);
    }

    // Create last set of arrows if ellipsis is shown
    if (showEllipsis) {
      for (let j = 0; j < lastArrowsCount; j++) {
        const arrowId = this.generateId();
        const arrowX = adjustedArrowPositions[firstArrowsCount + j];
        // Keep arrows straight: use same X position for start and end
        const startX = arrowX;
        const arrow = this.createArrowWithBinding(
          arrowId,
          startX,
          childTop,
          arrowX,
          rectangleBottom,
          childRectId,
          parentRectId
        );
        elements.push(arrow);
      }
    }

    // Display column labels if provided
    if (columns && columns.length > 0) {
      const arrowMidY = (childTop + rectangleBottom) / 2;
      // Use adjusted positions if ellipsis is shown, otherwise use original positions
      const positionsToUse =
        showEllipsis && adjustedArrowPositions.length > 0 ? adjustedArrowPositions : arrowPositions;
      const rightmostArrowX =
        positionsToUse.length > 0 ? positionsToUse[positionsToUse.length - 1] : childTop;
      const rightOffset = 5;
      const projectionTextX = rightmostArrowX + rightOffset;

      // Create a set of ordered columns for color coding
      const orderedColumns = new Set(sortOrder || []);

      // Create text elements for each column, coloring ordered columns in blue
      const groupId = this.generateId();
      let currentX = projectionTextX;
      const textHeight = 17.5;
      const fontSize = 14;

      let i = 0;
      while (i < columns.length) {
        const column = columns[i];
        const isOrdered = orderedColumns.has(column);
        const color = isOrdered ? '#1e90ff' : this.config.nodeColor; // Blue for ordered columns

        // Group consecutive columns with the same color
        const groupParts: string[] = [column];
        let j = i + 1;
        while (j < columns.length) {
          const nextColumn = columns[j];
          const nextIsOrdered = orderedColumns.has(nextColumn);
          const nextColor = nextIsOrdered ? '#1e90ff' : this.config.nodeColor;
          if (nextColor === color) {
            groupParts.push(nextColumn);
            j++;
          } else {
            break;
          }
        }

        // Create text element for grouped columns
        const groupText = i > 0 ? ', ' + groupParts.join(', ') : groupParts.join(', ');
        const groupTextId = this.generateId();
        const groupWidth = this.measureText(groupText, fontSize);
        const groupTextElement: ExcalidrawText = {
          id: groupTextId,
          type: 'text',
          x: currentX,
          y: arrowMidY - 8.75,
          width: groupWidth,
          height: textHeight,
          angle: 0,
          strokeColor: color,
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 1,
          strokeStyle: 'solid',
          roughness: 0,
          opacity: 100,
          groupIds: [groupId],
          frameId: null,
          index: this.generateIndex(),
          roundness: null,
          seed: this.generateSeed(),
          version: 1,
          versionNonce: this.generateSeed(),
          isDeleted: false,
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
          text: groupText,
          fontSize: fontSize,
          fontFamily: 6,
          textAlign: 'left',
          verticalAlign: 'top',
          baseline: fontSize,
          containerId: null,
          originalText: groupText,
          autoResize: false,
          lineHeight: 1.25,
        };
        elements.push(groupTextElement);
        currentX += groupWidth;

        i = j;
      }
    }
  }

  /**
   * Estimates text width based on character types for better positioning
   */
  private measureText(text: string, fontSize: number): number {
    let width = 0;
    // Approximate widths for proportional font (tuned for Excalidraw "Normal" font)
    const average = 0.55;
    const narrow = 0.32; // i, l, t, f, r, space, comma, period
    const wide = 0.8; // m, w, M, W, _
    const capital = 0.7;

    for (const char of text) {
      if (/[iltr ,.]/.test(char)) {
        width += fontSize * narrow;
      } else if (/[mwMW_]/.test(char)) {
        width += fontSize * wide;
      } else if (/[A-Z]/.test(char)) {
        width += fontSize * capital;
      } else {
        width += fontSize * average;
      }
    }
    return width;
  }

  /**
   * Creates an arrow with proper binding to ensure it touches the rectangle
   */
  private createArrowWithBinding(
    id: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    childRectId: string,
    parentRectId: string
  ): ExcalidrawArrow {
    const dx = endX - startX;
    const dy = endY - startY;

    return {
      id,
      type: 'arrow',
      x: startX,
      y: startY,
      width: Math.abs(dx),
      height: Math.abs(dy),
      angle: 0,
      strokeColor: this.config.arrowColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: { type: 2 },
      seed: this.generateSeed(),
      version: 1,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      points: [
        [0, 0],
        [dx, dy],
      ],
      lastCommittedPoint: null,
      startBinding: {
        elementId: childRectId,
        focus: 0,
        gap: 0, // No gap - arrow should touch the ellipse
      },
      endBinding: {
        elementId: parentRectId,
        focus: 0,
        gap: 0, // No gap - arrow should touch the rectangle
      },
      startArrowhead: null,
      endArrowhead: 'arrow',
      elbowed: false,
    };
  }

  /**
   * Generates a unique ID for elements
   */
  private generateId(): string {
    return `element-${Date.now()}-${this.idCounter++}`;
  }

  /**
   * Generates a random seed for Excalidraw's roughness
   */
  private generateSeed(): number {
    return Math.floor(Math.random() * 1000000);
  }

  /**
   * Generates a unique index for Excalidraw elements
   * Format: c0g{hex} where hex is a hexadecimal counter (uppercase for A-F)
   */
  private generateIndex(): string {
    const hex = this.indexCounter.toString(16).toUpperCase();
    this.indexCounter++;
    return `c0g${hex}`;
  }

  /**
   * Special handling for DataSourceExec nodes with file groups
   * @param _isRoot - Whether this node is the root node (root nodes don't have output arrows)
   *                  Currently unused but kept for documentation - root nodes are determined dynamically
   */
  private generateDataSourceExecElements(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    elements: ExcalidrawElement[],
    _isRoot: boolean = false
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    rectId: string;
    inputArrowCount: number;
    inputArrowPositions: number[];
    outputColumns: string[];
    outputSortOrder: string[];
  } {
    // Use larger dimensions for DataSourceExec
    const nodeWidth = 300;
    const nodeHeight = 100;

    // Create rectangle
    const rectId = this.generateId();
    const rect: ExcalidrawRectangle = {
      id: rectId,
      type: 'rectangle',
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: { type: 3 },
      seed: this.generateSeed(),
      version: 7,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
    };
    elements.push(rect);

    // Create operator name text (centered)
    const operatorTextId = this.generateId();
    const operatorText: ExcalidrawText = {
      id: operatorTextId,
      type: 'text',
      x,
      y: y + 5,
      width: nodeWidth,
      height: 25,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: null,
      seed: this.generateSeed(),
      version: 3,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: 'DataSourceExec',
      fontSize: 20,
      fontFamily: 7,
      textAlign: 'center',
      verticalAlign: 'top',
      baseline: 20,
      containerId: rectId,
      originalText: 'DataSourceExec',
      autoResize: false,
      lineHeight: 1.25,
    };
    elements.push(operatorText);

    // Create details text
    if (node.properties) {
      const details: string[] = [];
      if (node.properties.file_groups) {
        // Extract number of groups from file_groups property
        const fileGroupsMatch = node.properties.file_groups.match(/(\d+)\s+groups/);
        if (fileGroupsMatch) {
          details.push(`file_groups=${fileGroupsMatch[1]} groups`);
        } else {
          details.push(`file_groups=${node.properties.file_groups}`);
        }
      }
      if (node.properties.projection) {
        details.push(`projection=${node.properties.projection}`);
      }
      if (node.properties.file_type) {
        details.push(`file_type=${node.properties.file_type}`);
      }

      if (details.length > 0) {
        const detailsTextId = this.generateId();
        const detailsText: ExcalidrawText = {
          id: detailsTextId,
          type: 'text',
          x: x + 10,
          y: y + 34,
          width: nodeWidth - 20,
          height: 64,
          angle: 0,
          strokeColor: this.config.nodeColor,
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 1,
          strokeStyle: 'solid',
          roughness: 0,
          opacity: 100,
          groupIds: [],
          frameId: null,
          index: this.generateIndex(),
          roundness: null,
          seed: this.generateSeed(),
          version: 1,
          versionNonce: this.generateSeed(),
          isDeleted: false,
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
          text: details.join('\n'),
          fontSize: 14,
          fontFamily: 1,
          textAlign: 'left',
          verticalAlign: 'top',
          baseline: 14,
          containerId: rectId,
          originalText: details.join('\n'),
          autoResize: false,
          lineHeight: 1.25,
        };
        elements.push(detailsText);
      }

      // Check if DynamicFilter is present in predicate
      const hasDynamicFilter =
        node.properties.predicate &&
        (node.properties.predicate.includes('DynamicFilter') ||
          node.properties.predicate.includes('DynamicFilterPhysicalExpr'));

      if (hasDynamicFilter) {
        // Create orange-dashed-border ellipse (DynamicFilter) inside the rectangle
        // Position it below the details text area, but not too low
        const dfEllipseWidth = 120; // Increased width to fit "DynamicFilter"
        const dfEllipseHeight = 30;
        const dfEllipseX = x + nodeWidth / 2 - dfEllipseWidth / 2;
        const dfEllipseY = y + 50; // Position below details text, but within rectangle bounds
        const dfEllipseId = this.generateId();

        const dfEllipse: ExcalidrawEllipse = {
          id: dfEllipseId,
          type: 'ellipse',
          x: dfEllipseX,
          y: dfEllipseY,
          width: dfEllipseWidth,
          height: dfEllipseHeight,
          angle: 0,
          strokeColor: '#f08c00', // Orange border color
          backgroundColor: 'transparent', // Transparent fill
          fillStyle: 'solid',
          strokeWidth: 1,
          strokeStyle: 'dashed', // Dashed border
          roughness: 0,
          opacity: 100,
          groupIds: [],
          frameId: null,
          index: this.generateIndex(),
          roundness: { type: 2 },
          seed: this.generateSeed(),
          version: 1,
          versionNonce: this.generateSeed(),
          isDeleted: false,
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
        };
        elements.push(dfEllipse);

        // Create "DynamicFilter" text label inside the ellipse
        const dfTextId = this.generateId();
        const dfText: ExcalidrawText = {
          id: dfTextId,
          type: 'text',
          x: dfEllipseX + 10, // Align text to start with some padding
          y: dfEllipseY + dfEllipseHeight / 2 - 9, // Center vertically
          width: 100, // Increased width for "DynamicFilter"
          height: 18,
          angle: 0,
          strokeColor: '#f08c00', // Orange color to match border
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 1,
          strokeStyle: 'solid',
          roughness: 0,
          opacity: 100,
          groupIds: [],
          frameId: null,
          index: this.generateIndex(),
          roundness: null,
          seed: this.generateSeed(),
          version: 1,
          versionNonce: this.generateSeed(),
          isDeleted: false,
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
          text: 'DynamicFilter',
          fontSize: 14,
          fontFamily: 7, // Bold
          textAlign: 'center',
          verticalAlign: 'top',
          baseline: 14,
          containerId: dfEllipseId,
          originalText: 'DynamicFilter',
          autoResize: true, // Auto resize to fit text
          lineHeight: 1.25,
        };
        // Adjust X position to center after text is created
        // "DynamicFilter" is about 100px wide at 14px bold
        // Center text in ellipse: ellipseX + (ellipseWidth - textWidth)/2
        // But since we don't know exact text width, we can approximate or rely on centering relative to ellipse width
        dfText.x = dfEllipseX + (dfEllipseWidth - 100) / 2;
        elements.push(dfText);
      }
    }

    // Parse file groups and create ellipses for each file
    const fileGroups = this.parseFileGroups(node.properties);
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
    let storedArrowEndPositions: number[] = []; // Store arrow end positions for inputArrowPositions

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
                const dotsTextId = this.generateId();

                const dotsText: ExcalidrawText = {
                  id: dotsTextId,
                  type: 'text',
                  x: ellipseX + ellipseSize / 2 - 10,
                  y: ellipseY + ellipseSize / 2 - 10,
                  width: 20,
                  height: 20,
                  angle: 0,
                  strokeColor: this.config.nodeColor,
                  backgroundColor: 'transparent',
                  fillStyle: 'solid',
                  strokeWidth: 1,
                  strokeStyle: 'solid',
                  roughness: 0,
                  opacity: 100,
                  groupIds: [],
                  frameId: null,
                  index: this.generateIndex(),
                  roundness: null,
                  seed: this.generateSeed(),
                  version: 43,
                  versionNonce: this.generateSeed(),
                  isDeleted: false,
                  boundElements: [],
                  updated: Date.now(),
                  link: null,
                  locked: false,
                  text: '...',
                  fontSize: 14,
                  fontFamily: 6,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  baseline: 14,
                  containerId: null,
                  originalText: '...',
                  autoResize: true,
                  lineHeight: 1.25,
                };
                elements.push(dotsText);
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
          const ellipseId = this.generateId();
          const ellipseCenterX = ellipseX + ellipseSize / 2;
          const ellipseCenterY = ellipseY + ellipseSize / 2;

          const ellipse: ExcalidrawEllipse = {
            id: ellipseId,
            type: 'ellipse',
            x: ellipseX,
            y: ellipseY,
            width: ellipseSize,
            height: ellipseSize,
            angle: 0,
            strokeColor: this.config.nodeColor,
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 1,
            strokeStyle: 'solid',
            roughness: 0,
            opacity: 100,
            groupIds: [],
            frameId: null,
            index: this.generateIndex(),
            roundness: { type: 2 },
            seed: this.generateSeed(),
            version: 43,
            versionNonce: this.generateSeed(),
            isDeleted: false,
            boundElements: [],
            updated: Date.now(),
            link: null,
            locked: false,
          };
          elements.push(ellipse);
          groupEllipseIds.push(ellipseId);

          // Create text inside ellipse using file name without extension
          const fileName = group[fileIndex];
          // Extract just the filename (basename) from the path, then remove extension
          const basename = fileName.split('/').pop() || fileName; // Get last part of path
          const fileNameWithoutExtension = basename.replace(/\.[^.]*$/, ''); // Remove extension
          const ellipseTextId = this.generateId();
          const ellipseText: ExcalidrawText = {
            id: ellipseTextId,
            type: 'text',
            x: ellipseX + ellipseSize / 2 - 10,
            y: ellipseY + ellipseSize / 2 - 15,
            width: 20,
            height: 30,
            angle: 0,
            strokeColor: this.config.nodeColor,
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 1,
            strokeStyle: 'solid',
            roughness: 0,
            opacity: 100,
            groupIds: [],
            frameId: null,
            index: this.generateIndex(),
            roundness: null,
            seed: this.generateSeed(),
            version: 43,
            versionNonce: this.generateSeed(),
            isDeleted: false,
            boundElements: [],
            updated: Date.now(),
            link: null,
            locked: false,
            text: fileNameWithoutExtension,
            fontSize: 20,
            fontFamily: 7,
            textAlign: 'center',
            verticalAlign: 'middle',
            baseline: 20,
            containerId: ellipseId,
            originalText: fileNameWithoutExtension,
            autoResize: true,
            lineHeight: 1.15,
          };
          elements.push(ellipseText);

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
          const groupRectId = this.generateId();
          const groupRect: ExcalidrawRectangle = {
            id: groupRectId,
            type: 'rectangle',
            x: currentGroupX - padding,
            y: groupMinY - padding,
            width: ellipseSize + 2 * padding,
            height: groupMaxY - groupMinY + 2 * padding,
            angle: 0,
            strokeColor: this.config.nodeColor,
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 1,
            strokeStyle: 'dashed', // Dotted rectangle
            roughness: 0,
            opacity: 100,
            groupIds: [],
            frameId: null,
            index: this.generateIndex(),
            roundness: { type: 3 },
            seed: this.generateSeed(),
            version: 7,
            versionNonce: this.generateSeed(),
            isDeleted: false,
            boundElements: [],
            updated: Date.now(),
            link: null,
            locked: false,
          };
          elements.push(groupRect);
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

        const arrowId = this.generateId();
        const arrow = this.createArrowWithBinding(
          arrowId,
          arrowStartX,
          arrowStartY,
          arrowEndX, // End at calculated position
          rectangleBottom, // Bottom of rectangle
          arrowStartElementId,
          rectId
        );
        elements.push(arrow);
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
          const projectionColumns = projectionText.split(',').map((col) => col.trim());

          // Parse output_ordering to extract column names if present
          const orderedColumns: Set<string> = new Set();
          if (node.properties.output_ordering) {
            // Extract column names from output_ordering format: [f_dkey@0 ASC NULLS LAST, timestamp@1 ASC NULLS LAST]
            const orderingMatch = node.properties.output_ordering.match(/\[([^\]]+)\]/);
            if (orderingMatch) {
              const orderingParts = orderingMatch[1].split(',');
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
          const rightOffset = 5; // Space between arrow and text left edge (5px for close positioning)
          const projectionTextX = rightmostArrowX + rightOffset;

          // Create text elements for each column, coloring ordered columns in blue
          // Group consecutive columns with the same color together
          const groupId = this.generateId(); // Use same group ID for all projection text parts
          let currentX = projectionTextX;
          const charWidth = 8; // Approximate character width
          const textHeight = 17.5;

          let i = 0;
          while (i < projectionColumns.length) {
            const column = projectionColumns[i];
            const isOrdered = orderedColumns.has(column);
            const color = isOrdered ? '#1e90ff' : this.config.nodeColor; // Blue for ordered columns, black otherwise

            // Group consecutive columns with the same color
            const groupParts: string[] = [column];
            let j = i + 1;
            while (j < projectionColumns.length) {
              const nextColumn = projectionColumns[j];
              const nextIsOrdered = orderedColumns.has(nextColumn);
              const nextColor = nextIsOrdered ? '#1e90ff' : this.config.nodeColor;
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
            const groupTextId = this.generateId();
            const groupWidth = groupText.length * charWidth;
            const groupTextElement: ExcalidrawText = {
              id: groupTextId,
              type: 'text',
              x: currentX,
              y: arrowMidY - 8.75,
              width: groupWidth,
              height: textHeight,
              angle: 0,
              strokeColor: color,
              backgroundColor: 'transparent',
              fillStyle: 'solid',
              strokeWidth: 1,
              strokeStyle: 'solid',
              roughness: 0,
              opacity: 100,
              groupIds: [groupId],
              frameId: null,
              index: this.generateIndex(),
              roundness: null,
              seed: this.generateSeed(),
              version: 1,
              versionNonce: this.generateSeed(),
              isDeleted: false,
              boundElements: [],
              updated: Date.now(),
              link: null,
              locked: false,
              text: groupText,
              fontSize: 14,
              fontFamily: 6,
              textAlign: 'left',
              verticalAlign: 'top',
              baseline: 14,
              containerId: null,
              originalText: groupText,
              autoResize: false,
              lineHeight: 1.25,
            };
            elements.push(groupTextElement);
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
        outputColumns.push(...projectionText.split(',').map((col) => col.trim()));
      }
    }

    // Extract output sort order from output_ordering property
    const outputSortOrder: string[] = [];
    if (node.properties && node.properties.output_ordering) {
      const orderingMatch = node.properties.output_ordering.match(/\[([^\]]+)\]/);
      if (orderingMatch) {
        const orderingParts = orderingMatch[1].split(',');
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

  /**
   * Special handling for FilterExec nodes
   * @param _isRoot - Whether this node is the root node (root nodes don't have output arrows)
   *                  Currently unused but kept for documentation - root nodes are determined dynamically
   */
  private generateFilterExecElements(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    elements: ExcalidrawElement[],
    _isRoot: boolean = false
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    rectId: string;
    inputArrowCount: number;
    inputArrowPositions: number[];
    outputColumns: string[];
    outputSortOrder: string[];
  } {
    const nodeWidth = 300;
    const nodeHeight = 80;

    // Create rectangle
    const rectId = this.generateId();
    const rect: ExcalidrawRectangle = {
      id: rectId,
      type: 'rectangle',
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: { type: 3 },
      seed: this.generateSeed(),
      version: 7,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
    };
    elements.push(rect);

    // Create operator name text (centered, bold)
    const operatorTextId = this.generateId();
    const operatorText: ExcalidrawText = {
      id: operatorTextId,
      type: 'text',
      x,
      y: y + 5,
      width: nodeWidth,
      height: 25,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: null,
      seed: this.generateSeed(),
      version: 3,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: 'FilterExec',
      fontSize: 20,
      fontFamily: 7, // Bold
      textAlign: 'center',
      verticalAlign: 'top',
      baseline: 20,
      containerId: rectId,
      originalText: 'FilterExec',
      autoResize: false,
      lineHeight: 1.25,
    };
    elements.push(operatorText);

    // Extract filter expression and projection from properties
    let filterExpression = '';
    let projectionColumns: string[] = [];

    if (node.properties) {
      // Extract projection if present (could be in projection property or in filter string)
      let projectionText = '';
      if (node.properties.projection) {
        projectionText = node.properties.projection;
      } else if (node.properties.filter && node.properties.filter.includes('projection=')) {
        // Extract projection from filter string if it's there
        const projectionMatch = node.properties.filter.match(/projection=\[([^\]]+)\]/);
        if (projectionMatch) {
          projectionText = projectionMatch[1];
        }
      }

      if (projectionText) {
        // Handle both cases: projectionText might already be the content or might include brackets
        const projectionMatch = projectionText.match(/\[([^\]]+)\]/);
        const columnsText = projectionMatch ? projectionMatch[1] : projectionText;
        projectionColumns = columnsText.split(',').map((col) => {
          const trimmed = col.trim();
          // Remove @ symbol and number after it
          const columnMatch = trimmed.match(/^([^@]+)/);
          return columnMatch ? columnMatch[1].trim() : trimmed;
        });
      }

      // Extract filter expression
      // Check for filter property (set by parser for FilterExec when no key=value format)
      if (node.properties.filter) {
        filterExpression = node.properties.filter;
        // Remove projection part from filter expression if it's there
        filterExpression = filterExpression.replace(/,\s*projection=\[[^\]]+\]/g, '');
      } else if (node.properties.predicate) {
        filterExpression = node.properties.predicate;
      } else {
        // Fallback: look for any property that looks like a filter expression
        for (const [key, value] of Object.entries(node.properties)) {
          if (key.includes('predicate') || (value.includes('=') && value.includes('@'))) {
            filterExpression = value;
            break;
          }
        }
      }

      // Remove @ symbols and numbers from filter expression
      if (filterExpression) {
        filterExpression = filterExpression.replace(/@\d+/g, '');
      }
    }

    // Create detail text - filter expression and projection on separate lines
    const details: string[] = [];
    if (filterExpression) {
      details.push(filterExpression);
    }
    if (projectionColumns.length > 0) {
      details.push(`projection=[${projectionColumns.join(', ')}]`);
    }

    if (details.length > 0) {
      const detailTextId = this.generateId();
      const detailText: ExcalidrawText = {
        id: detailTextId,
        type: 'text',
        x: x + 10,
        y: y + 35, // Position below operator name
        width: nodeWidth - 20,
        height: details.length * 20,
        angle: 0,
        strokeColor: this.config.nodeColor,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: this.generateIndex(),
        roundness: null,
        seed: this.generateSeed(),
        version: 1,
        versionNonce: this.generateSeed(),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        text: details.join('\n'),
        fontSize: 14,
        fontFamily: 6, // Normal font
        textAlign: 'center',
        verticalAlign: 'top',
        baseline: 14,
        containerId: null,
        originalText: details.join('\n'),
        autoResize: false,
        lineHeight: 1.25,
      };
      elements.push(detailText);
    }

    // Calculate positions for children and get input arrow count
    // All nodes at the same depth should have the same X position (vertical alignment)
    let maxChildY = y + nodeHeight + this.config.verticalSpacing;
    let totalInputArrows = 0;
    const allInputArrowPositions: number[] = []; // Track all input arrow positions
    // FilterExec: outputColumns from projection if present, otherwise from input (child)
    // outputSortOrder from input (child)
    let outputColumns: string[] = projectionColumns.length > 0 ? projectionColumns : [];
    let outputSortOrder: string[] = [];

    if (node.children.length > 0) {
      // Use the same X position as parent for all children (vertical alignment)
      const childX = x;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // Adjust vertical spacing to make arrows 3/5 of original length
        const adjustedVerticalSpacing = (this.config.verticalSpacing * 3) / 5;
        const childY = y + nodeHeight + adjustedVerticalSpacing;

        // Generate child elements recursively (children are not root)
        // All children at the same depth use the same X position
        const childInfo = this.generateNodeElements(child, childX, childY, elements, false);

        // FilterExec: outputColumns from projection if present, otherwise from input (child)
        // outputSortOrder from input (child)
        if (i === 0) {
          if (projectionColumns.length === 0) {
            outputColumns = [...childInfo.outputColumns];
          }
          outputSortOrder = [...childInfo.outputSortOrder];
        }

        // Create arrows from child to parent
        // For special operators (DataSourceExec, FilterExec, CoalesceBatchesExec, RepartitionExec), use input arrow count
        // For regular operators, ensure at least 1 arrow per child
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
          const rectangleLeft = x;
          const rectangleRight = x + nodeWidth;
          arrowPositions = [];
          if (numArrows === 1) {
            arrowPositions.push(x + nodeWidth / 2);
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
        const rectangleBottom = y + nodeHeight; // Bottom edge of parent rectangle
        const childTop = childY; // Top edge of child rectangle

        // Create arrows - vertical lines connecting child top to parent bottom
        // Use helper method to handle ellipsis for many arrows
        // Pass columns and sort order to display on arrows
        this.createArrowsWithEllipsis(
          numArrows,
          arrowPositions,
          childInfo.inputArrowPositions,
          childTop,
          rectangleBottom,
          childInfo.rectId,
          rectId,
          elements,
          childInfo.outputColumns,
          childInfo.outputSortOrder
        );

        // Track the maximum Y position for next child
        maxChildY = Math.max(maxChildY, childInfo.y + childInfo.height);
      }
    }

    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: totalInputArrows,
      inputArrowPositions: allInputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }

  /**
   * Special handling for CoalesceBatchesExec nodes
   * @param _isRoot - Whether this node is the root node (root nodes don't have output arrows)
   *                  Currently unused but kept for documentation - root nodes are determined dynamically
   */
  private generateCoalesceBatchesExecElements(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    elements: ExcalidrawElement[],
    _isRoot: boolean = false
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    rectId: string;
    inputArrowCount: number;
    inputArrowPositions: number[];
    outputColumns: string[];
    outputSortOrder: string[];
  } {
    const nodeWidth = 300;
    const nodeHeight = 80;

    // Create rectangle
    const rectId = this.generateId();
    const rect: ExcalidrawRectangle = {
      id: rectId,
      type: 'rectangle',
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: { type: 3 },
      seed: this.generateSeed(),
      version: 7,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
    };
    elements.push(rect);

    // Create operator name text (centered, bold)
    const operatorTextId = this.generateId();
    const operatorText: ExcalidrawText = {
      id: operatorTextId,
      type: 'text',
      x,
      y: y + 5,
      width: nodeWidth,
      height: 25,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: null,
      seed: this.generateSeed(),
      version: 3,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: 'CoalesceBatchesExec',
      fontSize: 20,
      fontFamily: 7, // Bold
      textAlign: 'center',
      verticalAlign: 'top',
      baseline: 20,
      containerId: rectId,
      originalText: 'CoalesceBatchesExec',
      autoResize: false,
      lineHeight: 1.25,
    };
    elements.push(operatorText);

    // Extract target_batch_size from properties
    let targetBatchSize = '';
    if (node.properties && node.properties.target_batch_size) {
      targetBatchSize = `target_batch_size=${node.properties.target_batch_size}`;
    }

    // Create detail text at bottom center
    if (targetBatchSize) {
      const detailTextId = this.generateId();
      const detailText: ExcalidrawText = {
        id: detailTextId,
        type: 'text',
        x: x + 10,
        y: y + nodeHeight - 25, // Position near bottom
        width: nodeWidth - 20,
        height: 20,
        angle: 0,
        strokeColor: this.config.nodeColor,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: this.generateIndex(),
        roundness: null,
        seed: this.generateSeed(),
        version: 1,
        versionNonce: this.generateSeed(),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        text: targetBatchSize,
        fontSize: 14,
        fontFamily: 6, // Normal font
        textAlign: 'center',
        verticalAlign: 'top',
        baseline: 14,
        containerId: null,
        originalText: targetBatchSize,
        autoResize: false,
        lineHeight: 1.25,
      };
      elements.push(detailText);
    }

    // Calculate positions for children and get input arrow count
    // All nodes at the same depth should have the same X position (vertical alignment)
    let maxChildY = y + nodeHeight + this.config.verticalSpacing;
    let totalInputArrows = 0;
    const allInputArrowPositions: number[] = []; // Track all input arrow positions
    // CoalesceBatchesExec: outputColumns and outputSortOrder from input (child)
    let outputColumns: string[] = [];
    let outputSortOrder: string[] = [];

    if (node.children.length > 0) {
      // Use the same X position as parent for all children (vertical alignment)
      const childX = x;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // Adjust vertical spacing to make arrows 3/5 of original length
        const adjustedVerticalSpacing = (this.config.verticalSpacing * 3) / 5;
        const childY = y + nodeHeight + adjustedVerticalSpacing;

        // Generate child elements recursively (children are not root)
        // All children at the same depth use the same X position
        const childInfo = this.generateNodeElements(child, childX, childY, elements, false);

        // CoalesceBatchesExec: outputColumns and outputSortOrder from input (child)
        if (i === 0) {
          outputColumns = [...childInfo.outputColumns];
          outputSortOrder = [...childInfo.outputSortOrder];
        }

        // Create arrows from child to parent
        // For special operators (DataSourceExec, FilterExec, CoalesceBatchesExec, RepartitionExec), use input arrow count
        // For regular operators, ensure at least 1 arrow per child
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
          const rectangleLeft = x;
          const rectangleRight = x + nodeWidth;
          arrowPositions = [];
          if (numArrows === 1) {
            arrowPositions.push(x + nodeWidth / 2);
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
        const rectangleBottom = y + nodeHeight; // Bottom edge of parent rectangle
        const childTop = childY; // Top edge of child rectangle

        // Create arrows - vertical lines connecting child top to parent bottom
        // Use helper method to handle ellipsis for many arrows
        // Pass child's columns and sort order to display on arrows
        this.createArrowsWithEllipsis(
          numArrows,
          arrowPositions,
          childInfo.inputArrowPositions,
          childTop,
          rectangleBottom,
          childInfo.rectId,
          rectId,
          elements,
          childInfo.outputColumns,
          childInfo.outputSortOrder
        );

        // Track the maximum Y position for next child
        maxChildY = Math.max(maxChildY, childInfo.y + childInfo.height);
      }
    }

    // CoalesceBatchesExec: outputColumns and outputSortOrder from input
    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: totalInputArrows,
      inputArrowPositions: allInputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }

  /**
   * Special handling for RepartitionExec nodes
   * @param _isRoot - Whether this node is the root node (root nodes don't have output arrows)
   *                  Currently unused but kept for documentation - root nodes are determined dynamically
   */
  private generateRepartitionExecElements(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    elements: ExcalidrawElement[],
    _isRoot: boolean = false
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    rectId: string;
    inputArrowCount: number;
    inputArrowPositions: number[];
    outputColumns: string[];
    outputSortOrder: string[];
  } {
    const nodeWidth = 300;
    const nodeHeight = 80;

    // Create rectangle
    const rectId = this.generateId();
    const rect: ExcalidrawRectangle = {
      id: rectId,
      type: 'rectangle',
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: { type: 3 },
      seed: this.generateSeed(),
      version: 7,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
    };
    elements.push(rect);

    // Create operator name text (centered, bold)
    const operatorTextId = this.generateId();
    const operatorText: ExcalidrawText = {
      id: operatorTextId,
      type: 'text',
      x,
      y: y + 5,
      width: nodeWidth,
      height: 25,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: null,
      seed: this.generateSeed(),
      version: 3,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: 'RepartitionExec',
      fontSize: 20,
      fontFamily: 7, // Bold
      textAlign: 'center',
      verticalAlign: 'top',
      baseline: 20,
      containerId: rectId,
      originalText: 'RepartitionExec',
      autoResize: false,
      lineHeight: 1.25,
    };
    elements.push(operatorText);

    // Extract partitioning property and display as detail text
    let partitioningDetail = '';
    let outputArrowCount = 0;
    if (node.properties && node.properties.partitioning) {
      const partitioning = node.properties.partitioning;

      // Simplify Hash partitioning format
      // Example: Hash([d_dkey@0, env@1, service@2, host@3], 16) -> Hash([d_dkey, env, service, host], 16)
      const hashMatch = partitioning.match(/^Hash\(\[([^\]]+)\],\s*(\d+)\)$/);
      if (hashMatch) {
        const columnsStr = hashMatch[1];
        const partitionCount = hashMatch[2];
        // Extract column names (remove @N parts)
        const columns = columnsStr.split(',').map((col) => {
          const trimmed = col.trim();
          // Extract column name before @ symbol
          const columnMatch = trimmed.match(/^([^@]+)/);
          return columnMatch ? columnMatch[1].trim() : trimmed;
        });
        partitioningDetail = `Hash([${columns.join(', ')}], ${partitionCount})`;
        outputArrowCount = parseInt(partitionCount, 10);
      } else {
        // RoundRobinBatch format: RoundRobinBatch(16) -> RoundRobinBatch(16)
        const roundRobinMatch = partitioning.match(/^RoundRobinBatch\((\d+)\)$/);
        if (roundRobinMatch) {
          partitioningDetail = `RoundRobinBatch(${roundRobinMatch[1]})`;
          outputArrowCount = parseInt(roundRobinMatch[1], 10);
        } else {
          // Fallback: use original format
          partitioningDetail = partitioning;
          // Try to extract number from partitioning formats:
          // - RoundRobinBatch(16) -> 16
          // - Hash([env@0], 16) -> 16 (number after comma before closing paren)
          let numberMatch = partitioning.match(/\((\d+)\)$/);
          if (!numberMatch) {
            // Try Hash format: number after comma before closing paren
            numberMatch = partitioning.match(/,\s*(\d+)\)$/);
          }
          if (numberMatch) {
            outputArrowCount = parseInt(numberMatch[1], 10);
          }
        }
      }
    }

    // Create detail text at bottom center
    if (partitioningDetail) {
      const detailTextId = this.generateId();
      const detailText: ExcalidrawText = {
        id: detailTextId,
        type: 'text',
        x: x + 10,
        y: y + nodeHeight - 25, // Position near bottom
        width: nodeWidth - 20,
        height: 20,
        angle: 0,
        strokeColor: this.config.nodeColor,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: this.generateIndex(),
        roundness: null,
        seed: this.generateSeed(),
        version: 1,
        versionNonce: this.generateSeed(),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        text: partitioningDetail,
        fontSize: 14,
        fontFamily: 6, // Normal font
        textAlign: 'center',
        verticalAlign: 'top',
        baseline: 14,
        containerId: null,
        originalText: partitioningDetail,
        autoResize: false,
        lineHeight: 1.25,
      };
      elements.push(detailText);
    }

    // Calculate positions for children and get input arrow count
    // All nodes at the same depth should have the same X position (vertical alignment)
    let maxChildY = y + nodeHeight + this.config.verticalSpacing;
    let totalInputArrows = 0;
    const allInputArrowPositions: number[] = []; // Track all input arrow positions
    // RepartitionExec: outputColumns and outputSortOrder from input (child)
    let outputColumns: string[] = [];
    let outputSortOrder: string[] = [];

    if (node.children.length > 0) {
      // Use the same X position as parent for all children (vertical alignment)
      const childX = x;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // Adjust vertical spacing to make arrows 3/5 of original length
        const adjustedVerticalSpacing = (this.config.verticalSpacing * 3) / 5;
        const childY = y + nodeHeight + adjustedVerticalSpacing;

        // Generate child elements recursively (children are not root)
        // All children at the same depth use the same X position
        const childInfo = this.generateNodeElements(child, childX, childY, elements, false);

        // RepartitionExec: outputColumns and outputSortOrder from input (child)
        if (i === 0) {
          outputColumns = [...childInfo.outputColumns];
          outputSortOrder = [...childInfo.outputSortOrder];
        }

        // RepartitionExec input arrows = child's output arrow count
        // For RepartitionExec, use child's inputArrowCount as the number of input arrows
        const numInputArrows = Math.max(1, childInfo.inputArrowCount);
        totalInputArrows += numInputArrows;

        // Use child's input arrow positions if available and count matches
        // Otherwise, calculate balanced positions
        let arrowPositions: number[];
        if (childInfo.inputArrowPositions.length === numInputArrows && numInputArrows > 0) {
          // Align with child's input arrows
          arrowPositions = childInfo.inputArrowPositions;
        } else {
          // Balance arrows across parent width
          const rectangleLeft = x;
          const rectangleRight = x + nodeWidth;
          arrowPositions = [];
          if (numInputArrows === 1) {
            arrowPositions.push(x + nodeWidth / 2);
          } else if (numInputArrows === 2) {
            arrowPositions.push(rectangleLeft);
            arrowPositions.push(rectangleRight);
          } else {
            // More than two arrows: distribute evenly
            const spacing = (rectangleRight - rectangleLeft) / (numInputArrows - 1);
            for (let j = 0; j < numInputArrows; j++) {
              arrowPositions.push(rectangleLeft + j * spacing);
            }
          }
        }

        // Store input arrow positions for this node
        allInputArrowPositions.push(...arrowPositions);

        // Calculate arrow positions - since nodes are vertically aligned, make arrows vertical
        const rectangleBottom = y + nodeHeight; // Bottom edge of parent rectangle
        const childTop = childY; // Top edge of child rectangle

        // Create arrows - vertical lines connecting child top to parent bottom
        // Use helper method to handle ellipsis for many arrows
        // Pass child's columns and sort order to display on arrows
        this.createArrowsWithEllipsis(
          numInputArrows,
          arrowPositions,
          childInfo.inputArrowPositions,
          childTop,
          rectangleBottom,
          childInfo.rectId,
          rectId,
          elements,
          childInfo.outputColumns,
          childInfo.outputSortOrder
        );

        // Track the maximum Y position for next child
        maxChildY = Math.max(maxChildY, childInfo.y + childInfo.height);
      }
    }

    // RepartitionExec output arrows = number from partitioning (e.g., 16 from RoundRobinBatch(16))
    // But we return inputArrowCount which represents the number of arrows coming INTO this node
    // The output arrow count is determined by the parent node when it creates arrows from this node
    // So we need to return outputArrowCount as inputArrowCount for the parent to use
    // Actually, wait - inputArrowCount is what this node receives, outputArrowCount is what it sends
    // The parent will use this node's inputArrowCount to determine how many arrows to create
    // But RepartitionExec's output should be based on partitioning number

    // Calculate output arrow positions based on partitioning number
    const outputArrowPositions: number[] = [];
    if (outputArrowCount > 0) {
      const rectangleLeft = x;
      const rectangleRight = x + nodeWidth;
      if (outputArrowCount === 1) {
        outputArrowPositions.push(x + nodeWidth / 2);
      } else if (outputArrowCount === 2) {
        outputArrowPositions.push(rectangleLeft);
        outputArrowPositions.push(rectangleRight);
      } else {
        // More than two arrows: distribute evenly
        const spacing = (rectangleRight - rectangleLeft) / (outputArrowCount - 1);
        for (let j = 0; j < outputArrowCount; j++) {
          outputArrowPositions.push(rectangleLeft + j * spacing);
        }
      }
    }

    // Root nodes (first line of physical_plan) don't have output arrows
    // For RepartitionExec, return outputArrowCount as inputArrowCount so parent knows how many arrows to create
    // RepartitionExec: outputColumns and outputSortOrder from input
    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: _isRoot ? 0 : outputArrowCount > 0 ? outputArrowCount : totalInputArrows,
      inputArrowPositions: _isRoot
        ? []
        : outputArrowCount > 0
          ? outputArrowPositions
          : allInputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }

  /**
   * Parses file_groups property and extracts individual files from each group
   * Returns an array of groups, where each group is an array of file names
   * Example: "file_groups={3 groups: [[f_1.parquet, f_4.parquet], [f_2.parquet, f_5.parquet, f_6.parquet], [f_3.parquet]]}"
   * Returns: [["f_1.parquet", "f_4.parquet"], ["f_2.parquet", "f_5.parquet", "f_6.parquet"], ["f_3.parquet"]]
   */
  private parseFileGroups(properties?: Record<string, string>): string[][] {
    if (!properties || !properties.file_groups) {
      return [];
    }

    const fileGroupsStr = properties.file_groups;

    // Extract the groups array part after "group: " or "groups: "
    // Format: {N group: [[...]]} or {N groups: [[...], [...]]}
    const groupsMatch = fileGroupsStr.match(/(?:groups?):\s*(\[.*\])/);
    if (!groupsMatch) {
      return [];
    }

    const groupsArrayStr = groupsMatch[1];

    // Parse nested arrays manually
    const groups: string[][] = [];
    let depth = 0;
    let currentGroup: string[] = [];
    let currentFile = '';
    let inQuotes = false;

    for (let i = 0; i < groupsArrayStr.length; i++) {
      const char = groupsArrayStr[i];

      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
        continue;
      }

      if (inQuotes) {
        currentFile += char;
        continue;
      }

      if (char === '[') {
        if (depth === 1) {
          // Starting a new group
          currentGroup = [];
          currentFile = '';
        }
        depth++;
      } else if (char === ']') {
        depth--;
        if (depth === 1) {
          // Ending a group
          if (currentFile.trim()) {
            currentGroup.push(currentFile.trim().replace(/^["']|["']$/g, ''));
          }
          if (currentGroup.length > 0) {
            groups.push([...currentGroup]);
          }
          currentGroup = [];
          currentFile = '';
        } else if (depth === 0) {
          // Done parsing
          break;
        }
      } else if (char === ',' && depth === 2) {
        // File separator within a group
        if (currentFile.trim()) {
          currentGroup.push(currentFile.trim().replace(/^["']|["']$/g, ''));
        }
        currentFile = '';
      } else if (depth >= 2) {
        currentFile += char;
      }
    }

    return groups;
  }

  /**
   * Special handling for AggregateExec nodes
   * @param _isRoot - Whether this node is the root node (root nodes don't have output arrows)
   *                  Currently unused but kept for documentation - root nodes are determined dynamically
   */
  private generateAggregateExecElements(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    elements: ExcalidrawElement[],
    _isRoot: boolean = false
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    rectId: string;
    inputArrowCount: number;
    inputArrowPositions: number[];
    outputColumns: string[];
    outputSortOrder: string[];
  } {
    const nodeWidth = 300;
    // Check if ordering_mode=Sorted is present to determine height
    const hasOrderingModeSorted = node.properties && node.properties.ordering_mode === 'Sorted';
    // Increase height when ordering_mode is present to accommodate the third line
    const nodeHeight = hasOrderingModeSorted ? 100 : 80;

    // Create rectangle
    const rectId = this.generateId();
    const rect: ExcalidrawRectangle = {
      id: rectId,
      type: 'rectangle',
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: { type: 3 },
      seed: this.generateSeed(),
      version: 7,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
    };
    elements.push(rect);

    // Create operator name text (centered, bold)
    // If ordering_mode=Sorted is present, change label to "AggregateExec - Pipeline"
    const operatorLabel = hasOrderingModeSorted ? 'AggregateExec - Pipeline' : 'AggregateExec';
    const operatorTextId = this.generateId();
    const operatorText: ExcalidrawText = {
      id: operatorTextId,
      type: 'text',
      x,
      y: y + 5,
      width: nodeWidth,
      height: 25,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: null,
      seed: this.generateSeed(),
      version: 3,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: operatorLabel,
      fontSize: 20,
      fontFamily: 7, // Bold
      textAlign: 'center',
      verticalAlign: 'top',
      baseline: 20,
      containerId: rectId,
      originalText: operatorLabel,
      autoResize: false,
      lineHeight: 1.25,
    };
    elements.push(operatorText);

    // Extract properties and format as detail text
    const lines: { text: string; color: string }[] = [];
    if (node.properties) {
      const parts: string[] = [];
      if (node.properties.mode) {
        parts.push(`mode=${node.properties.mode}`);
      }
      if (node.properties.gby) {
        // Extract column names from gby: simplify format
        // Example: [d_dkey@0 as d_dkey, env@1 as env, service@2 as service, host@3 as host]
        // Result: [d_dkey, env, service, host]
        // For functions like date_bin(...), extract just the function name
        const gbyMatch = node.properties.gby.match(/\[([^\]]+)\]/);
        if (gbyMatch) {
          const gbyContent = gbyMatch[1];
          // Parse comma-separated values while respecting nested parentheses and brackets
          const parseCommaSeparated = (text: string): string[] => {
            const items: string[] = [];
            let pos = 0;
            let parenDepth = 0;
            let bracketDepth = 0;
            let braceDepth = 0;
            let currentItem = '';

            while (pos < text.length) {
              const char = text[pos];

              if (char === '(') {
                parenDepth++;
                currentItem += char;
                pos++;
              } else if (char === ')') {
                parenDepth--;
                currentItem += char;
                pos++;
              } else if (char === '[') {
                bracketDepth++;
                currentItem += char;
                pos++;
              } else if (char === ']') {
                bracketDepth--;
                currentItem += char;
                pos++;
              } else if (char === '{') {
                braceDepth++;
                currentItem += char;
                pos++;
              } else if (char === '}') {
                braceDepth--;
                currentItem += char;
                pos++;
              } else if (
                char === ',' &&
                parenDepth === 0 &&
                bracketDepth === 0 &&
                braceDepth === 0
              ) {
                // Comma outside nested structures means end of this item
                items.push(currentItem.trim());
                currentItem = '';
                pos++;
              } else {
                currentItem += char;
                pos++;
              }
            }

            if (currentItem.trim()) {
              items.push(currentItem.trim());
            }

            return items;
          };

          const columns = parseCommaSeparated(gbyContent).map((col) => {
            const trimmed = col.trim();
            // Check if it's a function call (e.g., date_bin(...))
            const functionMatch = trimmed.match(/^(\w+)\s*\(/);
            if (functionMatch) {
              // Return just the function name, not the content inside
              return functionMatch[1];
            }
            // Try to extract column name after "as" keyword first
            const asMatch = trimmed.match(/\s+as\s+([^\s@]+)/i);
            if (asMatch) {
              return asMatch[1].trim();
            }
            // Otherwise, extract column name before @ symbol
            const columnMatch = trimmed.match(/^([^@]+)/);
            return columnMatch ? columnMatch[1].trim() : trimmed;
          });
          parts.push(`gby=[${columns.join(', ')}]`);
        } else {
          // Fallback: use original gby if format doesn't match
          parts.push(`gby=${node.properties.gby}`);
        }
      }
      if (node.properties.aggr) {
        parts.push(`aggr=${node.properties.aggr}`);
      }
      // Format: mode on first line (purple), gby and aggr on second line
      // Note: ordering_mode is displayed separately below

      if (parts.length > 0) {
        // Check if first part is mode
        const hasMode = parts[0].startsWith('mode=');

        if (hasMode) {
          // Line 1: mode (purple)
          lines.push({ text: parts[0], color: '#9b59b6' });

          // Remaining parts on Line 2
          if (parts.length > 1) {
            lines.push({ text: parts.slice(1).join(', '), color: this.config.nodeColor });
          }
        } else {
          // No mode, just render everything in default color
          lines.push({ text: parts[0], color: this.config.nodeColor });
          if (parts.length > 1) {
            lines.push({ text: parts.slice(1).join(', '), color: this.config.nodeColor });
          }
        }
      }
    }

    // Create detail text elements
    if (lines.length > 0) {
      // Adjust Y position based on whether ordering_mode is present
      // When ordering_mode is present, we need more space, so position detail text higher
      const detailTextY = hasOrderingModeSorted ? y + nodeHeight - 55 : y + nodeHeight - 35;
      const lineHeight = 17.5; // 14 * 1.25

      lines.forEach((line, index) => {
        const lineY = detailTextY + index * lineHeight;
        const textId = this.generateId();
        const textElement: ExcalidrawText = {
          id: textId,
          type: 'text',
          x: x + 10,
          y: lineY,
          width: nodeWidth - 20,
          height: 20, // Height for single line
          angle: 0,
          strokeColor: line.color,
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 1,
          strokeStyle: 'solid',
          roughness: 0,
          opacity: 100,
          groupIds: [],
          frameId: null,
          index: this.generateIndex(),
          roundness: null,
          seed: this.generateSeed(),
          version: 1,
          versionNonce: this.generateSeed(),
          isDeleted: false,
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
          text: line.text,
          fontSize: 14,
          fontFamily: 6, // Normal font
          textAlign: 'center',
          verticalAlign: 'top',
          baseline: 14,
          containerId: null,
          originalText: line.text,
          autoResize: false,
          lineHeight: 1.25,
        };
        elements.push(textElement);
      });
    }

    // If ordering_mode=Sorted is present, add it as a separate detail text below
    if (hasOrderingModeSorted) {
      const orderingTextId = this.generateId();
      const orderingText: ExcalidrawText = {
        id: orderingTextId,
        type: 'text',
        x: x + 10,
        y: y + nodeHeight - 20, // Position at bottom with padding
        width: nodeWidth - 20,
        height: 20,
        angle: 0,
        strokeColor: '#8b0000', // Dark red
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: this.generateIndex(),
        roundness: null,
        seed: this.generateSeed(),
        version: 1,
        versionNonce: this.generateSeed(),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        text: 'ordering_mode=Sorted',
        fontSize: 14,
        fontFamily: 6, // Normal font
        textAlign: 'center',
        verticalAlign: 'top',
        baseline: 14,
        containerId: null,
        originalText: 'ordering_mode=Sorted',
        autoResize: false,
        lineHeight: 1.25,
      };
      elements.push(orderingText);
    }

    // Helper function to parse comma-separated values while respecting nested parentheses and brackets
    const parseCommaSeparated = (text: string): string[] => {
      const items: string[] = [];
      let pos = 0;
      let parenDepth = 0;
      let bracketDepth = 0;
      let braceDepth = 0;
      let currentItem = '';

      while (pos < text.length) {
        const char = text[pos];

        if (char === '(') {
          parenDepth++;
          currentItem += char;
          pos++;
        } else if (char === ')') {
          parenDepth--;
          currentItem += char;
          pos++;
        } else if (char === '[') {
          bracketDepth++;
          currentItem += char;
          pos++;
        } else if (char === ']') {
          bracketDepth--;
          currentItem += char;
          pos++;
        } else if (char === '{') {
          braceDepth++;
          currentItem += char;
          pos++;
        } else if (char === '}') {
          braceDepth--;
          currentItem += char;
          pos++;
        } else if (char === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
          // Comma outside nested structures means end of this item
          items.push(currentItem.trim());
          currentItem = '';
          pos++;
        } else {
          currentItem += char;
          pos++;
        }
      }

      if (currentItem.trim()) {
        items.push(currentItem.trim());
      }

      return items;
    };

    // Extract gby columns (including function names) and aggr columns for output columns
    const gbyOutputColumns: string[] = [];
    const aggrOutputColumns: string[] = [];
    const dateBinInputColumns: Map<string, string> = new Map(); // Map function name -> input column name

    // Extract columns from aggr property
    if (node.properties && node.properties.aggr) {
      const aggrMatch = node.properties.aggr.match(/\[([^\]]+)\]/);
      if (aggrMatch) {
        const aggrContent = aggrMatch[1];
        // Parse comma-separated aggregation expressions
        // Example: [max(j.env), max(j.value)] -> extract column names: env, value
        parseCommaSeparated(aggrContent).forEach((aggr) => {
          const trimmed = aggr.trim();
          // Extract column name from aggregation expression
          // Examples: max(j.env) -> env, max(j.value) -> value, avg(a.max_bin_val) -> max_bin_val
          // Pattern: function_name(qualifier.column) or function_name(column)
          // Try qualifier.column first (e.g., j.env -> env)
          const qualifierMatch = trimmed.match(/\([^)]*\.(\w+)\)/);
          if (qualifierMatch) {
            aggrOutputColumns.push(qualifierMatch[1]);
          } else {
            // Try just column (e.g., max(column) -> column)
            const columnMatch = trimmed.match(/\((\w+)\)/);
            if (columnMatch) {
              aggrOutputColumns.push(columnMatch[1]);
            }
          }
        });
      }
    }

    if (node.properties && node.properties.gby) {
      const gbyMatch = node.properties.gby.match(/\[([^\]]+)\]/);
      if (gbyMatch) {
        const gbyContent = gbyMatch[1];
        // Parse comma-separated values while respecting nested parentheses and brackets
        parseCommaSeparated(gbyContent).forEach((col) => {
          const trimmed = col.trim();
          // Check if it's a function call (e.g., date_bin(...))
          // Extract function name from the beginning
          const functionMatch = trimmed.match(/^(\w+)\s*\(/);
          if (functionMatch) {
            const functionName = functionMatch[1];
            gbyOutputColumns.push(functionName);

            // For date_bin function, extract input column name (timestamp column)
            if (functionName === 'date_bin') {
              // Extract the function arguments (everything between first ( and last ))
              // Find the matching closing parenthesis
              let parenDepth = 0;
              const startPos = trimmed.indexOf('(');
              let endPos = startPos;

              for (let i = startPos; i < trimmed.length; i++) {
                if (trimmed[i] === '(') parenDepth++;
                if (trimmed[i] === ')') {
                  parenDepth--;
                  if (parenDepth === 0) {
                    endPos = i;
                    break;
                  }
                }
              }

              if (endPos > startPos) {
                const functionArgs = trimmed.substring(startPos + 1, endPos);
                // date_bin typically has format: date_bin(interval, timestamp_column)
                // Extract the last argument which should be the timestamp column
                // Parse arguments while respecting nested structures
                const args = parseCommaSeparated(functionArgs);
                if (args.length >= 2) {
                  // Last argument is the timestamp column
                  const timestampArg = args[args.length - 1];
                  const columnMatch = timestampArg.match(/(\w+)@\d+/);
                  if (columnMatch) {
                    dateBinInputColumns.set(functionName, columnMatch[1]);
                  }
                }
              }
            }
          } else {
            // Regular column: try to extract column name after "as" keyword first
            const asMatch = trimmed.match(/\s+as\s+([^\s@]+)/i);
            if (asMatch) {
              gbyOutputColumns.push(asMatch[1].trim());
            } else {
              // Otherwise, extract column name before @ symbol
              const columnMatch = trimmed.match(/^([^@]+)/);
              if (columnMatch) {
                gbyOutputColumns.push(columnMatch[1].trim());
              }
            }
          }
        });
      }
    }

    // Calculate positions for children and get input arrow count
    // All nodes at the same depth should have the same X position (vertical alignment)
    let maxChildY = y + nodeHeight + this.config.verticalSpacing;
    let totalInputArrows = 0;
    const allInputArrowPositions: number[] = []; // Track all input arrow positions
    // AggregateExec: outputColumns from gby (if present), outputSortOrder from input (child) with date_bin handling
    let outputColumns: string[] = [];
    let outputSortOrder: string[] = [];

    if (node.children.length > 0) {
      // Use the same X position as parent for all children (vertical alignment)
      const childX = x;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // Adjust vertical spacing to make arrows 3/5 of original length
        const adjustedVerticalSpacing = (this.config.verticalSpacing * 3) / 5;
        const childY = y + nodeHeight + adjustedVerticalSpacing;

        // Generate child elements recursively (children are not root)
        // All children at the same depth use the same X position
        const childInfo = this.generateNodeElements(child, childX, childY, elements, false);

        // AggregateExec: outputColumns from gby + aggr if present, otherwise from input (child)
        // outputSortOrder from input (child) with date_bin handling
        if (i === 0) {
          // Combine gby columns and aggr columns for output columns
          if (gbyOutputColumns.length > 0 || aggrOutputColumns.length > 0) {
            outputColumns = [...gbyOutputColumns, ...aggrOutputColumns];
          } else {
            // Fallback to child's columns if no gby or aggr
            outputColumns = [...childInfo.outputColumns];
          }

          // Build sort order: start with child's sort order
          outputSortOrder = [...childInfo.outputSortOrder];

          // For date_bin functions, if their input column is in sort order, add date_bin to sort order
          dateBinInputColumns.forEach((inputColumn, functionName) => {
            if (childInfo.outputSortOrder.includes(inputColumn)) {
              // Find the position of input column in sort order
              const inputIndex = childInfo.outputSortOrder.indexOf(inputColumn);
              // Insert date_bin after the input column (or replace if needed)
              // Actually, we should add it after the input column
              if (!outputSortOrder.includes(functionName)) {
                outputSortOrder.splice(inputIndex + 1, 0, functionName);
              }
            }
          });
        }

        // AggregateExec output arrows = input arrows (same as FilterExec)
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
          const rectangleLeft = x;
          const rectangleRight = x + nodeWidth;
          arrowPositions = [];
          if (numArrows === 1) {
            arrowPositions.push(x + nodeWidth / 2);
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
        const rectangleBottom = y + nodeHeight; // Bottom edge of parent rectangle
        const childTop = childY; // Top edge of child rectangle

        // Create arrows - vertical lines connecting child top to parent bottom
        // Use helper method to handle ellipsis for many arrows
        // Pass child's columns and sort order to display on arrows
        this.createArrowsWithEllipsis(
          numArrows,
          arrowPositions,
          childInfo.inputArrowPositions,
          childTop,
          rectangleBottom,
          childInfo.rectId,
          rectId,
          elements,
          childInfo.outputColumns,
          childInfo.outputSortOrder
        );

        // Track the maximum Y position for next child
        maxChildY = Math.max(maxChildY, childInfo.y + childInfo.height);
      }
    }

    // AggregateExec: outputColumns and outputSortOrder from input
    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: totalInputArrows,
      inputArrowPositions: allInputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }

  /**
   * Special handling for ProjectionExec nodes
   * @param _isRoot - Whether this node is the root node (root nodes don't have output arrows)
   *                  Currently unused but kept for documentation - root nodes are determined dynamically
   */
  private generateProjectionExecElements(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    elements: ExcalidrawElement[],
    _isRoot: boolean = false
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    rectId: string;
    inputArrowCount: number;
    inputArrowPositions: number[];
    outputColumns: string[];
    outputSortOrder: string[];
  } {
    const nodeWidth = 300;
    const nodeHeight = 80;

    // Create rectangle
    const rectId = this.generateId();
    const rect: ExcalidrawRectangle = {
      id: rectId,
      type: 'rectangle',
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: { type: 3 },
      seed: this.generateSeed(),
      version: 7,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
    };
    elements.push(rect);

    // Create operator name text (centered, bold)
    const operatorTextId = this.generateId();
    const operatorText: ExcalidrawText = {
      id: operatorTextId,
      type: 'text',
      x,
      y: y + 5,
      width: nodeWidth,
      height: 25,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: null,
      seed: this.generateSeed(),
      version: 3,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: 'ProjectionExec',
      fontSize: 20,
      fontFamily: 7, // Bold
      textAlign: 'center',
      verticalAlign: 'top',
      baseline: 20,
      containerId: rectId,
      originalText: 'ProjectionExec',
      autoResize: false,
      lineHeight: 1.25,
    };
    elements.push(operatorText);

    // Helper function to parse comma-separated values while respecting nested parentheses and brackets
    const parseCommaSeparated = (text: string): string[] => {
      const items: string[] = [];
      let pos = 0;
      let parenDepth = 0;
      let bracketDepth = 0;
      let braceDepth = 0;
      let currentItem = '';

      while (pos < text.length) {
        const char = text[pos];

        if (char === '(') {
          parenDepth++;
          currentItem += char;
          pos++;
        } else if (char === ')') {
          parenDepth--;
          currentItem += char;
          pos++;
        } else if (char === '[') {
          bracketDepth++;
          currentItem += char;
          pos++;
        } else if (char === ']') {
          bracketDepth--;
          currentItem += char;
          pos++;
        } else if (char === '{') {
          braceDepth++;
          currentItem += char;
          pos++;
        } else if (char === '}') {
          braceDepth--;
          currentItem += char;
          pos++;
        } else if (char === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
          // Comma outside nested structures means end of this item
          items.push(currentItem.trim());
          currentItem = '';
          pos++;
        } else {
          currentItem += char;
          pos++;
        }
      }

      if (currentItem.trim()) {
        items.push(currentItem.trim());
      }

      return items;
    };

    // Extract expr property and simplify detail text
    // Example: [date_bin(...)@1 as time_bin, max(j.env)@2 as env] -> time_bin, env (for outputColumns)
    // But for details: if function exists, show function name (e.g., date_bin) instead of full expression
    // ProjectionExec: outputColumns come from aliases/column names in expr
    let detailText = '';
    const outputColumns: string[] = [];
    const detailItems: string[] = [];

    if (node.properties && node.properties.expr) {
      const exprMatch = node.properties.expr.match(/\[([^\]]+)\]/);
      if (exprMatch) {
        const exprContent = exprMatch[1];
        // Parse comma-separated items respecting nested parentheses
        const items = parseCommaSeparated(exprContent);

        items.forEach((item) => {
          const trimmed = item.trim();
          // Extract alias after "as" keyword for outputColumns
          const asMatch = trimmed.match(/\s+as\s+(.+?)(?:\s*@|$)/i);
          let aliasOrColumn = '';
          if (asMatch) {
            aliasOrColumn = asMatch[1].trim();
          } else {
            // No alias, extract column name before @ symbol
            const columnMatch = trimmed.match(/^([^@]+)/);
            aliasOrColumn = columnMatch ? columnMatch[1].trim() : trimmed;
          }
          outputColumns.push(aliasOrColumn);

          // For details: check if expression before "as" is a function
          // Extract the expression part (before "as")
          const exprPart = trimmed.split(/\s+as\s+/i)[0].trim();
          // Check if it's a function (contains opening parenthesis before @)
          const functionMatch = exprPart.match(/^(\w+)\s*\(/);
          if (functionMatch) {
            // It's a function, show only function name in details
            detailItems.push(functionMatch[1]);
          } else {
            // Not a function, show the alias/column name
            detailItems.push(aliasOrColumn);
          }
        });

        detailText = detailItems.join(', ');
      } else {
        // Fallback: just remove brackets if format doesn't match
        detailText = node.properties.expr.replace(/^\[|\]$/g, '');
      }
    }

    // Create detail text at bottom center
    if (detailText) {
      const detailTextId = this.generateId();
      const detailTextElement: ExcalidrawText = {
        id: detailTextId,
        type: 'text',
        x: x + 10,
        y: y + nodeHeight - 25, // Position near bottom
        width: nodeWidth - 20,
        height: 20,
        angle: 0,
        strokeColor: this.config.nodeColor,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: this.generateIndex(),
        roundness: null,
        seed: this.generateSeed(),
        version: 1,
        versionNonce: this.generateSeed(),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        text: detailText,
        fontSize: 14,
        fontFamily: 6, // Normal font
        textAlign: 'center',
        verticalAlign: 'top',
        baseline: 14,
        containerId: null,
        originalText: detailText,
        autoResize: false,
        lineHeight: 1.25,
      };
      elements.push(detailTextElement);
    }

    // Calculate positions for children and get input arrow count
    // All nodes at the same depth should have the same X position (vertical alignment)
    let maxChildY = y + nodeHeight + this.config.verticalSpacing;
    let totalInputArrows = 0;
    const allInputArrowPositions: number[] = []; // Track all input arrow positions
    // ProjectionExec: outputSortOrder comes from input (child)
    let outputSortOrder: string[] = [];

    if (node.children.length > 0) {
      // Use the same X position as parent for all children (vertical alignment)
      const childX = x;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // Adjust vertical spacing to make arrows 3/5 of original length
        const adjustedVerticalSpacing = (this.config.verticalSpacing * 3) / 5;
        const childY = y + nodeHeight + adjustedVerticalSpacing;

        // Generate child elements recursively (children are not root)
        // All children at the same depth use the same X position
        const childInfo = this.generateNodeElements(child, childX, childY, elements, false);

        // ProjectionExec: outputSortOrder from input (child)
        if (i === 0) {
          outputSortOrder = [...childInfo.outputSortOrder];
        }

        // ProjectionExec output arrows = input arrows (same as FilterExec)
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
          const rectangleLeft = x;
          const rectangleRight = x + nodeWidth;
          arrowPositions = [];
          if (numArrows === 1) {
            arrowPositions.push(x + nodeWidth / 2);
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
        const rectangleBottom = y + nodeHeight; // Bottom edge of parent rectangle
        const childTop = childY; // Top edge of child rectangle

        // Create arrows - vertical lines connecting child top to parent bottom
        // Use helper method to handle ellipsis for many arrows
        // Pass child's columns and sort order to display on arrows
        this.createArrowsWithEllipsis(
          numArrows,
          arrowPositions,
          childInfo.inputArrowPositions,
          childTop,
          rectangleBottom,
          childInfo.rectId,
          rectId,
          elements,
          childInfo.outputColumns,
          childInfo.outputSortOrder
        );

        // Track the maximum Y position for next child
        maxChildY = Math.max(maxChildY, childInfo.y + childInfo.height);
      }
    }

    // ProjectionExec: outputColumns from expr, outputSortOrder from input
    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: totalInputArrows,
      inputArrowPositions: allInputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }

  /**
   * Special handling for SortExec nodes
   * @param _isRoot - Whether this node is the root node (root nodes don't have output arrows)
   *                  Currently unused but kept for documentation - root nodes are determined dynamically
   */
  private generateSortExecElements(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    elements: ExcalidrawElement[],
    _isRoot: boolean = false
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    rectId: string;
    inputArrowCount: number;
    inputArrowPositions: number[];
    outputColumns: string[];
    outputSortOrder: string[];
  } {
    const nodeWidth = 300;
    const nodeHeight = 80;

    // Create rectangle
    const rectId = this.generateId();
    const rect: ExcalidrawRectangle = {
      id: rectId,
      type: 'rectangle',
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: { type: 3 },
      seed: this.generateSeed(),
      version: 7,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
    };
    elements.push(rect);

    // Create operator name text (centered, bold)
    const operatorTextId = this.generateId();
    const operatorText: ExcalidrawText = {
      id: operatorTextId,
      type: 'text',
      x,
      y: y + 5,
      width: nodeWidth,
      height: 25,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: null,
      seed: this.generateSeed(),
      version: 3,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: 'SortExec',
      fontSize: 20,
      fontFamily: 7, // Bold
      textAlign: 'center',
      verticalAlign: 'top',
      baseline: 20,
      containerId: rectId,
      originalText: 'SortExec',
      autoResize: false,
      lineHeight: 1.25,
    };
    elements.push(operatorText);

    // Extract expr property and format as detail text
    // Format: [env@1 ASC NULLS LAST, service@2 ASC NULLS LAST, host@3 ASC NULLS LAST]
    // Extract column names (before @) and format as [env, service, host]
    // SortExec: outputSortOrder comes from expr details
    let detailText = '';
    const outputSortOrder: string[] = [];
    if (node.properties) {
      const parts: string[] = [];

      if (node.properties.expr) {
        // Extract column names from expr: remove @N ASC NULLS LAST parts
        // Example: [env@1 ASC NULLS LAST, service@2 ASC NULLS LAST, host@3 ASC NULLS LAST]
        // Result: [env, service, host]
        const exprMatch = node.properties.expr.match(/\[([^\]]+)\]/);
        if (exprMatch) {
          const exprContent = exprMatch[1];
          // Split by comma and extract column name (part before @)
          const columns = exprContent.split(',').map((col) => {
            const trimmed = col.trim();
            // Extract column name before @ symbol
            const columnMatch = trimmed.match(/^([^@]+)/);
            return columnMatch ? columnMatch[1].trim() : trimmed;
          });
          outputSortOrder.push(...columns);
          parts.push(`[${columns.join(', ')}]`);
        }
      }

      if (node.properties.preserve_partitioning) {
        parts.push(`preserve_partitioning=${node.properties.preserve_partitioning}`);
      }

      // Format: first part on first line, second part on second line
      if (parts.length > 0) {
        if (parts.length === 1) {
          detailText = parts[0];
        } else {
          detailText = `${parts[0]} \n${parts[1]}`;
        }
      }
    }

    // Create detail text at bottom center
    if (detailText) {
      const detailTextId = this.generateId();
      const detailTextElement: ExcalidrawText = {
        id: detailTextId,
        type: 'text',
        x: x + 10,
        y: y + nodeHeight - 35, // Position near bottom (allowing for 2 lines)
        width: nodeWidth - 20,
        height: 35,
        angle: 0,
        strokeColor: this.config.nodeColor,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: this.generateIndex(),
        roundness: null,
        seed: this.generateSeed(),
        version: 1,
        versionNonce: this.generateSeed(),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        text: detailText,
        fontSize: 14,
        fontFamily: 6, // Normal font
        textAlign: 'center',
        verticalAlign: 'top',
        baseline: 14,
        containerId: null,
        originalText: detailText,
        autoResize: false,
        lineHeight: 1.25,
      };
      elements.push(detailTextElement);
    }

    // Calculate positions for children and get input arrow count
    // All nodes at the same depth should have the same X position (vertical alignment)
    let maxChildY = y + nodeHeight + this.config.verticalSpacing;
    let totalInputArrows = 0;
    const allInputArrowPositions: number[] = []; // Track all input arrow positions
    // SortExec: outputColumns from input (child)
    let outputColumns: string[] = [];

    if (node.children.length > 0) {
      // Use the same X position as parent for all children (vertical alignment)
      const childX = x;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // Adjust vertical spacing to make arrows 3/5 of original length
        const adjustedVerticalSpacing = (this.config.verticalSpacing * 3) / 5;
        const childY = y + nodeHeight + adjustedVerticalSpacing;

        // Generate child elements recursively (children are not root)
        // All children at the same depth use the same X position
        const childInfo = this.generateNodeElements(child, childX, childY, elements, false);

        // SortExec: outputColumns from input (child)
        if (i === 0) {
          outputColumns = [...childInfo.outputColumns];
        }

        // SortExec: output arrows = input arrows (preserve exact count and positions)
        const numArrows = Math.max(1, childInfo.inputArrowCount);
        totalInputArrows += numArrows;

        // Use child's input arrow positions if available and count matches
        // Otherwise, calculate balanced positions
        let arrowPositions: number[];
        if (childInfo.inputArrowPositions.length === numArrows && numArrows > 0) {
          // Align with child's input arrows - preserve exact positions
          arrowPositions = childInfo.inputArrowPositions;
        } else {
          // Balance arrows across parent width
          const rectangleLeft = x;
          const rectangleRight = x + nodeWidth;
          arrowPositions = [];
          if (numArrows === 1) {
            arrowPositions.push(x + nodeWidth / 2);
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

        // Store input arrow positions for this node (these will be used as output positions)
        allInputArrowPositions.push(...arrowPositions);

        // Calculate arrow positions - since nodes are vertically aligned, make arrows vertical
        const rectangleBottom = y + nodeHeight; // Bottom edge of parent rectangle
        const childTop = childY; // Top edge of child rectangle

        // Create arrows - vertical lines connecting child top to parent bottom
        // Use helper method to handle ellipsis for many arrows
        // Pass child's columns and sort order to display on arrows
        this.createArrowsWithEllipsis(
          numArrows,
          arrowPositions,
          childInfo.inputArrowPositions,
          childTop,
          rectangleBottom,
          childInfo.rectId,
          rectId,
          elements,
          childInfo.outputColumns,
          childInfo.outputSortOrder
        );

        // Track the maximum Y position for next child
        maxChildY = Math.max(maxChildY, childInfo.y + childInfo.height);
      }
    }

    // SortExec: outputColumns from input, outputSortOrder from expr
    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: totalInputArrows,
      inputArrowPositions: allInputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }

  /**
   * Special handling for SortPreservingMergeExec nodes
   * SortPreservingMergeExec always produces one arrow output no matter how many input arrows it receives
   * @param _isRoot - Whether this node is the root node (root nodes don't have output arrows)
   *                  Currently unused but kept for documentation - root nodes are determined dynamically
   */
  private generateSortPreservingMergeExecElements(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    elements: ExcalidrawElement[],
    _isRoot: boolean = false
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    rectId: string;
    inputArrowCount: number;
    inputArrowPositions: number[];
    outputColumns: string[];
    outputSortOrder: string[];
  } {
    const nodeWidth = 300;
    const nodeHeight = 80;

    // Create rectangle
    const rectId = this.generateId();
    const rect: ExcalidrawRectangle = {
      id: rectId,
      type: 'rectangle',
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: { type: 3 },
      seed: this.generateSeed(),
      version: 7,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
    };
    elements.push(rect);

    // Create operator name text (centered, bold)
    const operatorTextId = this.generateId();
    const operatorText: ExcalidrawText = {
      id: operatorTextId,
      type: 'text',
      x,
      y: y + 5,
      width: nodeWidth,
      height: 25,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: null,
      seed: this.generateSeed(),
      version: 3,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: 'SortPreservingMergeExec',
      fontSize: 20,
      fontFamily: 7, // Bold
      textAlign: 'center',
      verticalAlign: 'top',
      baseline: 20,
      containerId: rectId,
      originalText: 'SortPreservingMergeExec',
      autoResize: false,
      lineHeight: 1.25,
    };
    elements.push(operatorText);

    // Helper function to parse comma-separated values while respecting nested parentheses and brackets
    const parseCommaSeparated = (text: string): string[] => {
      const items: string[] = [];
      let pos = 0;
      let parenDepth = 0;
      let bracketDepth = 0;
      let braceDepth = 0;
      let currentItem = '';

      while (pos < text.length) {
        const char = text[pos];

        if (char === '(') {
          parenDepth++;
          currentItem += char;
          pos++;
        } else if (char === ')') {
          parenDepth--;
          currentItem += char;
          pos++;
        } else if (char === '[') {
          bracketDepth++;
          currentItem += char;
          pos++;
        } else if (char === ']') {
          bracketDepth--;
          currentItem += char;
          pos++;
        } else if (char === '{') {
          braceDepth++;
          currentItem += char;
          pos++;
        } else if (char === '}') {
          braceDepth--;
          currentItem += char;
          pos++;
        } else if (char === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
          // Comma outside nested structures means end of this item
          items.push(currentItem.trim());
          currentItem = '';
          pos++;
        } else {
          currentItem += char;
          pos++;
        }
      }

      if (currentItem.trim()) {
        items.push(currentItem.trim());
      }

      return items;
    };

    // Extract expr or expression property and format as detail text
    // Format: [f_dkey@0 ASC NULLS LAST, date_bin(...)@1 ASC NULLS LAST]
    // Extract column/function names: for functions, extract only function name (e.g., date_bin)
    // For columns, extract column name before @
    // Result: [f_dkey, date_bin]
    // SortPreservingMergeExec: outputSortOrder is the same as columns/functions in details
    let detailText = '';
    const outputSortOrder: string[] = [];
    if (node.properties) {
      // Check both expr (key=value format) and expression (no key format)
      const exprValue = node.properties.expr || node.properties.expression;
      if (exprValue) {
        // Extract content from brackets
        const exprMatch = exprValue.match(/\[([^\]]+)\]/);
        if (exprMatch) {
          const exprContent = exprMatch[1];
          // Parse comma-separated items respecting nested parentheses
          const items = parseCommaSeparated(exprContent);

          // Process each item to extract column or function name
          const simplifiedItems: string[] = [];
          items.forEach((item) => {
            const trimmed = item.trim();
            // Check if it's a function (contains opening parenthesis before @)
            const functionMatch = trimmed.match(/^(\w+)\s*\(/);
            if (functionMatch) {
              // It's a function, extract just the function name
              simplifiedItems.push(functionMatch[1]);
              outputSortOrder.push(functionMatch[1]);
            } else {
              // It's a column, extract column name before @
              const columnMatch = trimmed.match(/^([^@]+)/);
              if (columnMatch) {
                const columnName = columnMatch[1].trim();
                simplifiedItems.push(columnName);
                outputSortOrder.push(columnName);
              }
            }
          });

          detailText = `[${simplifiedItems.join(', ')}]`;
        }
      }
    }

    // Create detail text at bottom center
    if (detailText) {
      const detailTextId = this.generateId();
      const detailTextElement: ExcalidrawText = {
        id: detailTextId,
        type: 'text',
        x: x + 10,
        y: y + nodeHeight - 25, // Position near bottom
        width: nodeWidth - 20,
        height: 20,
        angle: 0,
        strokeColor: this.config.nodeColor,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: this.generateIndex(),
        roundness: null,
        seed: this.generateSeed(),
        version: 1,
        versionNonce: this.generateSeed(),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        text: detailText,
        fontSize: 14,
        fontFamily: 6, // Normal font
        textAlign: 'center',
        verticalAlign: 'top',
        baseline: 14,
        containerId: null,
        originalText: detailText,
        autoResize: false,
        lineHeight: 1.25,
      };
      elements.push(detailTextElement);
    }

    // Calculate positions for children and get input arrow count
    // All nodes at the same depth should have the same X position (vertical alignment)
    let maxChildY = y + nodeHeight + this.config.verticalSpacing;
    const allInputArrowPositions: number[] = []; // Track all input arrow positions
    // SortPreservingMergeExec: outputColumns from input (child)
    let outputColumns: string[] = [];

    if (node.children.length > 0) {
      // Use the same X position as parent for all children (vertical alignment)
      const childX = x;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // Adjust vertical spacing to make arrows 3/5 of original length
        const adjustedVerticalSpacing = (this.config.verticalSpacing * 3) / 5;
        const childY = y + nodeHeight + adjustedVerticalSpacing;

        // Generate child elements recursively (children are not root)
        // All children at the same depth use the same X position
        const childInfo = this.generateNodeElements(child, childX, childY, elements, false);

        // SortPreservingMergeExec: outputColumns from input (child)
        if (i === 0) {
          outputColumns = [...childInfo.outputColumns];
        }

        // SortPreservingMergeExec receives arrows from children
        const numArrows = Math.max(1, childInfo.inputArrowCount);

        // Use child's input arrow positions if available and count matches
        // Otherwise, calculate balanced positions
        let arrowPositions: number[];
        if (childInfo.inputArrowPositions.length === numArrows && numArrows > 0) {
          // Align with child's input arrows
          arrowPositions = childInfo.inputArrowPositions;
        } else {
          // Balance arrows across parent width
          const rectangleLeft = x;
          const rectangleRight = x + nodeWidth;
          arrowPositions = [];
          if (numArrows === 1) {
            arrowPositions.push(x + nodeWidth / 2);
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
        const rectangleBottom = y + nodeHeight; // Bottom edge of parent rectangle
        const childTop = childY; // Top edge of child rectangle

        // Create arrows - vertical lines connecting child top to parent bottom
        // Use helper method to handle ellipsis for many arrows
        // Pass child's columns and sort order to display on arrows
        this.createArrowsWithEllipsis(
          numArrows,
          arrowPositions,
          childInfo.inputArrowPositions,
          childTop,
          rectangleBottom,
          childInfo.rectId,
          rectId,
          elements,
          childInfo.outputColumns,
          childInfo.outputSortOrder
        );

        // Track the maximum Y position for next child
        maxChildY = Math.max(maxChildY, childInfo.y + childInfo.height);
      }
    }

    // SortPreservingMergeExec: always outputs 1 arrow regardless of input arrows
    // Return 1 arrow at the center position
    // SortPreservingMergeExec: outputColumns from input, outputSortOrder is the same as columns/functions in details
    const outputArrowPosition = x + nodeWidth / 2;
    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: 1,
      inputArrowPositions: [outputArrowPosition],
      outputColumns,
      outputSortOrder, // outputSortOrder is set from expr details above
    };
  }

  /**
   * Special handling for CoalescePartitionsExec nodes
   * CoalescePartitionsExec always produces one arrow output no matter how many input arrows it receives
   * It does not have any details to display
   * @param _isRoot - Whether this node is the root node (root nodes don't have output arrows)
   *                  Currently unused but kept for documentation - root nodes are determined dynamically
   */
  private generateCoalescePartitionsExecElements(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    elements: ExcalidrawElement[],
    _isRoot: boolean = false
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    rectId: string;
    inputArrowCount: number;
    inputArrowPositions: number[];
    outputColumns: string[];
    outputSortOrder: string[];
  } {
    const nodeWidth = 300;
    const nodeHeight = 80;

    // Create rectangle
    const rectId = this.generateId();
    const rect: ExcalidrawRectangle = {
      id: rectId,
      type: 'rectangle',
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: { type: 3 },
      seed: this.generateSeed(),
      version: 7,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
    };
    elements.push(rect);

    // Create operator name text (centered, bold)
    const operatorTextId = this.generateId();
    const operatorText: ExcalidrawText = {
      id: operatorTextId,
      type: 'text',
      x,
      y: y + 5,
      width: nodeWidth,
      height: 25,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: null,
      seed: this.generateSeed(),
      version: 3,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: 'CoalescePartitionsExec',
      fontSize: 20,
      fontFamily: 7, // Bold
      textAlign: 'center',
      verticalAlign: 'top',
      baseline: 20,
      containerId: rectId,
      originalText: 'CoalescePartitionsExec',
      autoResize: false,
      lineHeight: 1.25,
    };
    elements.push(operatorText);

    // CoalescePartitionsExec does not have any details to display

    // Calculate positions for children and get input arrow count
    // All nodes at the same depth should have the same X position (vertical alignment)
    let maxChildY = y + nodeHeight + this.config.verticalSpacing;
    const allInputArrowPositions: number[] = []; // Track all input arrow positions
    // CoalescePartitionsExec: outputColumns and outputSortOrder from input (child)
    let outputColumns: string[] = [];
    let outputSortOrder: string[] = [];

    if (node.children.length > 0) {
      // Use the same X position as parent for all children (vertical alignment)
      const childX = x;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // Adjust vertical spacing to make arrows 3/5 of original length
        const adjustedVerticalSpacing = (this.config.verticalSpacing * 3) / 5;
        const childY = y + nodeHeight + adjustedVerticalSpacing;

        // Generate child elements recursively (children are not root)
        // All children at the same depth use the same X position
        const childInfo = this.generateNodeElements(child, childX, childY, elements, false);

        // CoalescePartitionsExec: outputColumns and outputSortOrder from input (child)
        if (i === 0) {
          outputColumns = [...childInfo.outputColumns];
          outputSortOrder = [...childInfo.outputSortOrder];
        }

        // CoalescePartitionsExec receives arrows from children
        const numArrows = Math.max(1, childInfo.inputArrowCount);

        // Use child's input arrow positions if available and count matches
        // Otherwise, calculate balanced positions
        let arrowPositions: number[];
        if (childInfo.inputArrowPositions.length === numArrows && numArrows > 0) {
          // Align with child's input arrows
          arrowPositions = childInfo.inputArrowPositions;
        } else {
          // Balance arrows across parent width
          const rectangleLeft = x;
          const rectangleRight = x + nodeWidth;
          arrowPositions = [];
          if (numArrows === 1) {
            arrowPositions.push(x + nodeWidth / 2);
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
        const rectangleBottom = y + nodeHeight; // Bottom edge of parent rectangle
        const childTop = childY; // Top edge of child rectangle

        // Create arrows - vertical lines connecting child top to parent bottom
        // Use helper method to handle ellipsis for many arrows
        // Pass child's columns and sort order to display on arrows
        this.createArrowsWithEllipsis(
          numArrows,
          arrowPositions,
          childInfo.inputArrowPositions,
          childTop,
          rectangleBottom,
          childInfo.rectId,
          rectId,
          elements,
          childInfo.outputColumns,
          childInfo.outputSortOrder
        );

        // Track the maximum Y position for next child
        maxChildY = Math.max(maxChildY, childInfo.y + childInfo.height);
      }
    }

    // CoalescePartitionsExec: always outputs 1 arrow regardless of input arrows
    // Return 1 arrow at the center position
    // CoalescePartitionsExec: outputColumns and outputSortOrder from input
    const outputArrowPosition = x + nodeWidth / 2;
    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: 1,
      inputArrowPositions: [outputArrowPosition],
      outputColumns,
      outputSortOrder,
    };
  }

  /**
   * Special handling for HashJoinExec nodes
   * HashJoinExec has two inputs: build side (first child) and probe side (second child)
   * The join inputs are the two direct children of HashJoinExec: node.children[0] (build side) and node.children[1] (probe side)
   * These can be ANY operator type (CoalesceBatchesExec, CoalescePartitionsExec, DataSourceExec, FilterExec, etc.)
   * Arrows must start from the TOP edges of whatever operator rectangles those children are, regardless of their type
   */
  private generateHashJoinExecElements(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    elements: ExcalidrawElement[],
    _isRoot: boolean = false
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    rectId: string;
    inputArrowCount: number;
    inputArrowPositions: number[];
    outputColumns: string[];
    outputSortOrder: string[];
  } {
    const nodeWidth = 300;
    const nodeHeight = 125; // Increased to accommodate details text and hash table

    // Create rectangle
    const rectId = this.generateId();
    const rect: ExcalidrawRectangle = {
      id: rectId,
      type: 'rectangle',
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: { type: 3 },
      seed: this.generateSeed(),
      version: 7,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
    };
    elements.push(rect);

    // Extract join mode from properties (e.g., mode=CollectLeft)
    let joinMode = '';
    if (node.properties && node.properties.mode) {
      joinMode = node.properties.mode;
    }

    // Create operator name text with join mode (centered, bold)
    const operatorTextId = this.generateId();
    const operatorText = joinMode ? `HashJoinExec: ${joinMode}` : 'HashJoinExec';
    const operatorTextElement: ExcalidrawText = {
      id: operatorTextId,
      type: 'text',
      x,
      y: y + 5,
      width: nodeWidth,
      height: 25,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: null,
      seed: this.generateSeed(),
      version: 3,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: operatorText,
      fontSize: 20,
      fontFamily: 7, // Bold
      textAlign: 'center',
      verticalAlign: 'top',
      baseline: 20,
      containerId: rectId,
      originalText: operatorText,
      autoResize: false,
      lineHeight: 1.25,
    };
    elements.push(operatorTextElement);

    // Create orange-border ellipse (HashTable) inside the rectangle
    // The ellipse should have orange border but transparent fill, with "HashTable" label inside
    // Position it lower to avoid overlapping with details text
    const hashTableWidth = 138;
    const hashTableHeight = 41;
    const hashTableX = x + nodeWidth / 2 - hashTableWidth / 2;
    // Move hash table down - position it below the details text area (around y + 70)
    const hashTableY = y + 70;
    const hashTableId = this.generateId();
    const hashTable: ExcalidrawEllipse = {
      id: hashTableId,
      type: 'ellipse',
      x: hashTableX,
      y: hashTableY,
      width: hashTableWidth,
      height: hashTableHeight,
      angle: 0,
      strokeColor: '#f08c00', // Orange border color
      backgroundColor: 'transparent', // Transparent fill
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: { type: 2 },
      seed: this.generateSeed(),
      version: 1,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
    };
    elements.push(hashTable);

    // Create "HashTable" text label inside the ellipse
    const hashTableTextId = this.generateId();
    const hashTableText: ExcalidrawText = {
      id: hashTableTextId,
      type: 'text',
      x: hashTableX + hashTableWidth / 2 - 35, // Center the text
      y: hashTableY + hashTableHeight / 2 - 9.2, // Center vertically
      width: 70,
      height: 18.4,
      angle: 0,
      strokeColor: '#f08c00', // Orange color to match border
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: null,
      seed: this.generateSeed(),
      version: 1,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: 'HashTable',
      fontSize: 16,
      fontFamily: 7, // Bold
      textAlign: 'center',
      verticalAlign: 'middle',
      baseline: 16,
      containerId: null,
      originalText: 'HashTable',
      autoResize: true,
      lineHeight: 1.15,
    };
    elements.push(hashTableText);

    // Create details text showing join_type and on=
    const details: string[] = [];
    if (node.properties) {
      if (node.properties.join_type) {
        details.push(`join_type=${node.properties.join_type}`);
      }
      if (node.properties.on) {
        // Simplify the on= expression: remove @ symbols and indices
        // Example: on=[(d_dkey@0, f_dkey@0)] -> on=[(d_dkey, f_dkey)]
        let onValue = node.properties.on;
        // Remove @ symbols and numbers after them
        onValue = onValue.replace(/@\d+/g, '');
        details.push(`on=${onValue}`);
      }
    }

    if (details.length > 0) {
      const detailTextId = this.generateId();
      // Calculate text height for centering
      const textHeight = details.length * 17.5; // Approximate height per line
      const detailText: ExcalidrawText = {
        id: detailTextId,
        type: 'text',
        x: x + 10,
        y: y + 35, // Position below operator name
        width: nodeWidth - 20,
        height: textHeight,
        angle: 0,
        strokeColor: this.config.nodeColor,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: this.generateIndex(),
        roundness: null,
        seed: this.generateSeed(),
        version: 1,
        versionNonce: this.generateSeed(),
        isDeleted: false,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        text: details.join('\n'),
        fontSize: 14,
        fontFamily: 6, // Normal font
        textAlign: 'center', // Center align the text
        verticalAlign: 'top',
        baseline: 14,
        containerId: null,
        originalText: details.join('\n'),
        autoResize: false,
        lineHeight: 1.25,
      };
      elements.push(detailText);
    }

    // HashJoinExec must have exactly 2 children: build side (first) and probe side (second)
    if (node.children.length !== 2) {
      throw new Error(
        `HashJoinExec must have exactly 2 children, but found ${node.children.length}`
      );
    }

    // First input: operator right below HashJoinExec (build side)
    const buildSideChild = node.children[0];
    // Second input: operator further below but with same indent as first (probe side)
    const probeSideChild = node.children[1];

    // Position build side (first child) to the LEFT of HashJoinExec
    // Position probe side (second child) to the RIGHT of HashJoinExec
    // Both at the same Y level (not stacked vertically)
    const childY = y + nodeHeight + this.config.verticalSpacing;

    // Calculate X positions: build side to the left, probe side to the right
    const standardNodeWidth = 300;
    const buildSideX = x - standardNodeWidth - this.config.horizontalSpacing;
    const probeSideX = x + nodeWidth + this.config.horizontalSpacing;

    const buildSideInfo = this.generateNodeElements(
      buildSideChild,
      buildSideX,
      childY,
      elements,
      false
    );
    const probeSideInfo = this.generateNodeElements(
      probeSideChild,
      probeSideX,
      childY,
      elements,
      false
    );

    // Calculate hash table ellipse center position
    const hashTableCenterX = hashTableX + hashTableWidth / 2;
    const hashTableCenterY = hashTableY + hashTableHeight / 2;

    // Helper function to calculate intersection point on ellipse edge
    // Given a point (px, py) and ellipse center (cx, cy) with width w and height h,
    // find the intersection point on the ellipse boundary along the line from point to center
    const getEllipseEdgePoint = (
      px: number,
      py: number,
      cx: number,
      cy: number,
      w: number,
      h: number
    ): [number, number] => {
      // Vector from ellipse center to point
      const dx = px - cx;
      const dy = py - cy;

      // Normalize the direction
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) return [cx, cy];

      // Unit vector (direction from center toward the point)
      const ux = dx / length;
      const uy = dy / length;

      // For an ellipse: (x-cx)^2/a^2 + (y-cy)^2/b^2 = 1
      // where a = w/2, b = h/2
      const a = w / 2; // semi-major axis (horizontal)
      const b = h / 2; // semi-minor axis (vertical)

      // Find the intersection point on ellipse boundary in direction (ux, uy)
      // Parametric form: x = cx + t*ux, y = cy + t*uy
      // Substituting into ellipse equation: (t*ux)^2/a^2 + (t*uy)^2/b^2 = 1
      // Solving for t: t^2 * (ux^2/a^2 + uy^2/b^2) = 1
      // t = 1 / sqrt(ux^2/a^2 + uy^2/b^2)
      const denominator = Math.sqrt((ux * ux) / (a * a) + (uy * uy) / (b * b));
      if (denominator === 0) return [cx, cy];

      const t = 1 / denominator;
      const ex = cx + t * ux;
      const ey = cy + t * uy;

      return [ex, ey];
    };

    // Create arrows from build side to hash table ellipse edge
    // Arrows MUST start from the TOP edge of the build side operator rectangle
    const buildSideArrows = Math.max(1, buildSideInfo.inputArrowCount);

    // Distribute arrows evenly across the TOP edge of the build side rectangle
    // Use central region (60% of width) to avoid corners
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

    // Top edge of build side rectangle - THIS IS WHERE ARROWS START
    // Note: buildSideInfo.y is maxChildY (bottom), but we need the top edge
    // The rectangle was created at childY, so that's the top edge
    const buildSideTopY = childY;

    for (let i = 0; i < buildSideArrows; i++) {
      const arrowStartX = buildSideTopArrowPositions[i];
      // Calculate intersection point on hash table ellipse edge
      const [hashTableEdgeX, hashTableEdgeY] = getEllipseEdgePoint(
        arrowStartX,
        buildSideTopY,
        hashTableCenterX,
        hashTableCenterY,
        hashTableWidth,
        hashTableHeight
      );
      const arrowId = this.generateId();
      const arrow = this.createArrowWithBinding(
        arrowId,
        arrowStartX,
        buildSideTopY, // Start from TOP edge of build side rectangle
        hashTableEdgeX,
        hashTableEdgeY, // End at hash table ellipse edge
        buildSideInfo.rectId,
        hashTableId
      );
      elements.push(arrow);
    }

    // Create arrows from probe side to HashJoinExec rectangle
    // Arrows MUST start from the TOP edge of the probe side operator rectangle
    const probeSideArrows = Math.max(1, probeSideInfo.inputArrowCount);

    // Distribute arrows evenly across the TOP edge of the probe side rectangle
    // Use central region (60% of width) to avoid corners
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

    // Top edge of probe side rectangle - THIS IS WHERE ARROWS START
    // Note: probeSideInfo.y is maxChildY (bottom), but we need the top edge
    // The rectangle was created at childY, so that's the top edge
    const probeSideTopY = childY;

    for (let i = 0; i < probeSideArrows; i++) {
      const arrowStartX = probeSideTopArrowPositions[i];
      // Calculate intersection point on hash table ellipse edge
      const [hashTableEdgeX, hashTableEdgeY] = getEllipseEdgePoint(
        arrowStartX,
        probeSideTopY,
        hashTableCenterX,
        hashTableCenterY,
        hashTableWidth,
        hashTableHeight
      );
      const arrowId = this.generateId();
      const arrow = this.createArrowWithBinding(
        arrowId,
        arrowStartX,
        probeSideTopY, // Start from TOP edge of probe side rectangle
        hashTableEdgeX,
        hashTableEdgeY, // End at hash table ellipse edge
        probeSideInfo.rectId,
        hashTableId
      );
      elements.push(arrow);
    }

    // Display columns on arrows from probe side (using probe side's columns and sort order)
    if (probeSideInfo.outputColumns.length > 0) {
      const arrowMidY = (probeSideTopY + hashTableCenterY) / 2;
      const rightmostArrowX =
        probeSideTopArrowPositions.length > 0
          ? probeSideTopArrowPositions[probeSideTopArrowPositions.length - 1]
          : probeSideX + probeSideInfo.width / 2;
      const rightOffset = 5;
      const projectionTextX = rightmostArrowX + rightOffset;

      const orderedColumns = new Set(probeSideInfo.outputSortOrder);
      const groupId = this.generateId();
      let currentX = projectionTextX;
      const charWidth = 8;
      const textHeight = 17.5;

      let i = 0;
      while (i < probeSideInfo.outputColumns.length) {
        const column = probeSideInfo.outputColumns[i];
        const isOrdered = orderedColumns.has(column);
        const color = isOrdered ? '#1e90ff' : this.config.nodeColor;

        const groupParts: string[] = [column];
        let j = i + 1;
        while (j < probeSideInfo.outputColumns.length) {
          const nextColumn = probeSideInfo.outputColumns[j];
          const nextIsOrdered = orderedColumns.has(nextColumn);
          const nextColor = nextIsOrdered ? '#1e90ff' : this.config.nodeColor;
          if (nextColor === color) {
            groupParts.push(nextColumn);
            j++;
          } else {
            break;
          }
        }

        const groupText = i > 0 ? ', ' + groupParts.join(', ') : groupParts.join(', ');
        const groupTextId = this.generateId();
        const groupWidth = groupText.length * charWidth;
        const groupTextElement: ExcalidrawText = {
          id: groupTextId,
          type: 'text',
          x: currentX,
          y: arrowMidY - 8.75,
          width: groupWidth,
          height: textHeight,
          angle: 0,
          strokeColor: color,
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 1,
          strokeStyle: 'solid',
          roughness: 0,
          opacity: 100,
          groupIds: [groupId],
          frameId: null,
          index: this.generateIndex(),
          roundness: null,
          seed: this.generateSeed(),
          version: 1,
          versionNonce: this.generateSeed(),
          isDeleted: false,
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
          text: groupText,
          fontSize: 14,
          fontFamily: 6,
          textAlign: 'left',
          verticalAlign: 'top',
          baseline: 14,
          containerId: null,
          originalText: groupText,
          autoResize: false,
          lineHeight: 1.25,
        };
        elements.push(groupTextElement);
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
          ...projectionText.split(',').map((col) => {
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
    const outputArrowPositions: number[] = [];
    if (probeSideArrows === 1) {
      outputArrowPositions.push(x + nodeWidth / 2);
    } else {
      // Distribute arrows in the central region (60% of width) instead of full width
      // This keeps them closer to the middle and avoids corners
      const centerRegionWidth = nodeWidth * 0.6;
      const centerRegionLeft = x + nodeWidth / 2 - centerRegionWidth / 2;
      const centerRegionRight = x + nodeWidth / 2 + centerRegionWidth / 2;
      const spacing = (centerRegionRight - centerRegionLeft) / (probeSideArrows - 1);
      for (let j = 0; j < probeSideArrows; j++) {
        outputArrowPositions.push(centerRegionLeft + j * spacing);
      }
    }

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
      inputArrowCount: outputArrowCount,
      inputArrowPositions: outputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }

  /**
   * Generates Excalidraw elements for UnionExec
   * UnionExec can have many inputs (not just 1 or 2)
   * The number of output arrows is the total number of output arrows from all its inputs
   */
  private generateUnionExecElements(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    elements: ExcalidrawElement[],
    _isRoot: boolean = false
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
    rectId: string;
    inputArrowCount: number;
    inputArrowPositions: number[];
    outputColumns: string[];
    outputSortOrder: string[];
  } {
    const nodeWidth = 300;
    const nodeHeight = 80;

    // Create rectangle
    const rectId = this.generateId();
    const rect: ExcalidrawRectangle = {
      id: rectId,
      type: 'rectangle',
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: { type: 3 },
      seed: this.generateSeed(),
      version: 7,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
    };
    elements.push(rect);

    // Create operator name text (centered, bold)
    const operatorTextId = this.generateId();
    const operatorText: ExcalidrawText = {
      id: operatorTextId,
      type: 'text',
      x,
      y: y + 5,
      width: nodeWidth,
      height: 25,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      frameId: null,
      index: this.generateIndex(),
      roundness: null,
      seed: this.generateSeed(),
      version: 3,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: 'UnionExec',
      fontSize: 20,
      fontFamily: 7, // Bold
      textAlign: 'center',
      verticalAlign: 'top',
      baseline: 20,
      containerId: rectId,
      originalText: 'UnionExec',
      autoResize: false,
      lineHeight: 1.25,
    };
    elements.push(operatorText);

    // Calculate positions for children and get input arrow count
    // UnionExec can have many inputs
    let maxChildY = y + nodeHeight + this.config.verticalSpacing;
    let totalInputArrows = 0;
    const allInputArrowPositions: number[] = [];
    // UnionExec: outputColumns and outputSortOrder from first child (assuming all children have same schema)
    let outputColumns: string[] = [];
    let outputSortOrder: string[] = [];

    if (node.children.length > 0) {
      // Use the same X position as parent for all children (vertical alignment)
      const childX = x;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // Adjust vertical spacing to make arrows 3/5 of original length
        const adjustedVerticalSpacing = (this.config.verticalSpacing * 3) / 5;
        const childY = y + nodeHeight + adjustedVerticalSpacing;

        // Generate child elements recursively (children are not root)
        // All children at the same depth use the same X position
        const childInfo = this.generateNodeElements(child, childX, childY, elements, false);

        // UnionExec: outputColumns and outputSortOrder from first child
        if (i === 0) {
          outputColumns = [...childInfo.outputColumns];
          outputSortOrder = [...childInfo.outputSortOrder];
        }

        // UnionExec: sum up all input arrows from all children
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
          const rectangleLeft = x;
          const rectangleRight = x + nodeWidth;
          arrowPositions = [];
          if (numArrows === 1) {
            arrowPositions.push(x + nodeWidth / 2);
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
        const rectangleBottom = y + nodeHeight;
        const childTop = childY;

        // Create arrows - vertical lines connecting child top to parent bottom
        // Use helper method to handle ellipsis for many arrows
        // Pass child's columns and sort order to display on arrows
        this.createArrowsWithEllipsis(
          numArrows,
          arrowPositions,
          childInfo.inputArrowPositions,
          childTop,
          rectangleBottom,
          childInfo.rectId,
          rectId,
          elements,
          childInfo.outputColumns,
          childInfo.outputSortOrder
        );

        // Track the maximum Y position for next child
        maxChildY = Math.max(maxChildY, childInfo.y + childInfo.height);
      }
    }

    // UnionExec: output arrows = total input arrows from all children
    // Calculate output arrow positions distributed across the width
    const outputArrowPositions: number[] = [];
    if (totalInputArrows === 0) {
      // No children, use single arrow at center
      outputArrowPositions.push(x + nodeWidth / 2);
    } else if (totalInputArrows === 1) {
      outputArrowPositions.push(x + nodeWidth / 2);
    } else if (totalInputArrows === 2) {
      outputArrowPositions.push(x);
      outputArrowPositions.push(x + nodeWidth);
    } else {
      // More than two arrows: distribute evenly
      const spacing = nodeWidth / (totalInputArrows - 1);
      for (let j = 0; j < totalInputArrows; j++) {
        outputArrowPositions.push(x + j * spacing);
      }
    }

    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: totalInputArrows, // UnionExec: output arrows = total input arrows
      inputArrowPositions: outputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }
}
