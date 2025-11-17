import {
  ExcalidrawData,
  ExcalidrawElement,
  ExcalidrawRectangle,
  ExcalidrawArrow,
  ExcalidrawText,
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

  constructor(config: ExcalidrawConfig = {}) {
    this.config = {
      nodeWidth: config.nodeWidth ?? 200,
      nodeHeight: config.nodeHeight ?? 80,
      verticalSpacing: config.verticalSpacing ?? 100,
      horizontalSpacing: config.horizontalSpacing ?? 50,
      fontSize: config.fontSize ?? 16,
      nodeColor: config.nodeColor ?? '#1971c2',
      arrowColor: config.arrowColor ?? '#495057',
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
      this.generateNodeElements(root, 0, 0, elements);
    }

    return {
      type: 'excalidraw',
      version: 2,
      source: 'datafusion-plan-viz',
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
   */
  private generateNodeElements(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    elements: ExcalidrawElement[]
  ): { x: number; y: number; width: number } {
    // Create rectangle for the node
    const rectId = this.generateId();
    const rect = this.createRectangle(rectId, x, y);
    elements.push(rect);

    // Create text for the node
    const text = this.createText(rectId, node, x, y);
    elements.push(text);

    // Calculate positions for children
    let currentX = x;
    let maxChildY = y + this.config.nodeHeight + this.config.verticalSpacing;

    if (node.children.length > 0) {
      // Calculate total width needed for all children
      const childWidths = node.children.map(() => this.config.nodeWidth);
      const totalChildWidth =
        childWidths.reduce((sum, w) => sum + w, 0) +
        (node.children.length - 1) * this.config.horizontalSpacing;

      // Center children under parent
      const startX = x + (this.config.nodeWidth - totalChildWidth) / 2;
      currentX = startX;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childY = y + this.config.nodeHeight + this.config.verticalSpacing;

        // Generate child elements recursively
        const childInfo = this.generateNodeElements(child, currentX, childY, elements);

        // Create arrow from parent to child
        const arrowId = this.generateId();
        const arrow = this.createArrow(
          arrowId,
          x + this.config.nodeWidth / 2,
          y + this.config.nodeHeight,
          currentX + this.config.nodeWidth / 2,
          childY,
          rectId,
          child
        );
        elements.push(arrow);

        // Update position for next child
        currentX += this.config.nodeWidth + this.config.horizontalSpacing;

        // Track the maximum Y position
        maxChildY = Math.max(maxChildY, childInfo.y + this.config.nodeHeight);
      }
    }

    return {
      x: currentX,
      y: maxChildY,
      width: this.config.nodeWidth,
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
      fillStyle: 'hachure',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      roundness: { type: 3 },
      seed: this.generateSeed(),
      version: 1,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
    };
  }

  /**
   * Creates a text element for a node
   */
  private createText(
    containerId: string,
    node: ExecutionPlanNode,
    x: number,
    y: number
  ): ExcalidrawText {
    let text = node.operator;
    if (node.properties && Object.keys(node.properties).length > 0) {
      const props = Object.entries(node.properties)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      text += '\n\n' + props;
    }

    return {
      id: this.generateId(),
      type: 'text',
      x: x + 10,
      y: y + 10,
      width: this.config.nodeWidth - 20,
      height: this.config.nodeHeight - 20,
      angle: 0,
      strokeColor: this.config.nodeColor,
      backgroundColor: 'transparent',
      fillStyle: 'hachure',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      roundness: null,
      seed: this.generateSeed(),
      version: 1,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      text,
      fontSize: this.config.fontSize,
      fontFamily: 1,
      textAlign: 'left',
      verticalAlign: 'top',
      baseline: this.config.fontSize,
      containerId,
      originalText: text,
      lineHeight: 1.25,
    };
  }

  /**
   * Creates an arrow element between nodes
   */
  private createArrow(
    id: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    parentId: string,
    _childNode: ExecutionPlanNode
  ): ExcalidrawArrow {
    return {
      id,
      type: 'arrow',
      x: startX,
      y: startY,
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY),
      angle: 0,
      strokeColor: this.config.arrowColor,
      backgroundColor: 'transparent',
      fillStyle: 'hachure',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      roundness: { type: 2 },
      seed: this.generateSeed(),
      version: 1,
      versionNonce: this.generateSeed(),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      points: [
        [0, 0],
        [endX - startX, endY - startY],
      ],
      lastCommittedPoint: null,
      startBinding: {
        elementId: parentId,
        focus: 0,
        gap: 1,
      },
      endBinding: null,
      startArrowhead: null,
      endArrowhead: 'arrow',
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
}
