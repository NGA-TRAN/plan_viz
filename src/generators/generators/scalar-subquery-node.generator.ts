import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';
import { ExcalidrawArrow, ExcalidrawElement } from '../../types/excalidraw.types';

/**
 * ScalarSubqueryExec: first child is the main input (pass-through);
 * remaining children are subquery plans evaluated once.
 */
export class ScalarSubqueryNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    if (node.children.length < 1) {
      throw new Error('ScalarSubqueryExec must have at least one child (the main input)');
    }

    const nodeWidth = NODE_DIMENSIONS.DATASOURCE_WIDTH;
    const nodeHeight = NODE_DIMENSIONS.DEFAULT_HEIGHT;
    const rectId = context.idGenerator.generateId();
    context.elements.push(
      context.elementFactory.createRectangle({
        id: rectId,
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
        strokeColor: context.config.nodeColor,
        roundnessType: 3,
      })
    );

    context.elements.push(
      context.elementFactory.createText({
        id: context.idGenerator.generateId(),
        x,
        y: y + 5,
        width: nodeWidth,
        height: TEXT_HEIGHTS.OPERATOR,
        text: 'ScalarSubqueryExec',
        fontSize: FONT_SIZES.OPERATOR,
        fontFamily: FONT_FAMILIES.BOLD,
        textAlign: 'center',
        verticalAlign: 'top',
        containerId: rectId,
        strokeColor: context.config.nodeColor,
      })
    );

    const subqueryCount =
      node.properties?.subqueries ?? String(Math.max(0, node.children.length - 1));
    context.elements.push(
      context.elementFactory.createText({
        id: context.idGenerator.generateId(),
        x: x + 10,
        y: y + 35,
        width: nodeWidth - 20,
        height: TEXT_HEIGHTS.DETAILS_LINE,
        text: `subqueries=${subqueryCount}`,
        fontSize: FONT_SIZES.DETAILS,
        fontFamily: FONT_FAMILIES.NORMAL,
        textAlign: 'center',
        verticalAlign: 'top',
        strokeColor: context.config.nodeColor,
      })
    );

    const gutter = context.config.horizontalSpacing;
    const childY = y + nodeHeight + (context.config.verticalSpacing * 3) / 5;
    const childrenInfo: NodeInfo[] = [];
    const childSpans: Array<{ start: number; minX: number; maxX: number }> = [];
    let maxChildY = y + nodeHeight + context.config.verticalSpacing;

    // Generate each child at x=0, then pack by the full subtree bounding box
    // (NodeInfo.width is only the child's own box; joins hang left and right).
    for (const child of node.children) {
      const start = context.elements.length;
      const childInfo = context.generateChildNode(child, 0, childY, false);
      childrenInfo.push(childInfo);
      maxChildY = Math.max(maxChildY, childInfo.y + childInfo.height);
      const bounds = this.subtreeHorizontalBounds(context.elements.slice(start), childInfo);
      childSpans.push({ start, minX: bounds.minX, maxX: bounds.maxX });
    }

    const subtreeWidths = childSpans.map((span) => span.maxX - span.minX);
    const totalWidth =
      subtreeWidths.reduce((sum, width) => sum + width, 0) + (childrenInfo.length - 1) * gutter;
    let cursor = x + nodeWidth / 2 - totalWidth / 2;

    for (let i = 0; i < childrenInfo.length; i++) {
      const span = childSpans[i];
      const nextStart =
        i + 1 < childSpans.length ? childSpans[i + 1].start : context.elements.length;
      const shiftAmount = cursor - span.minX;
      if (Math.abs(shiftAmount) > 0.1) {
        childrenInfo[i].x += shiftAmount;
        this.shiftElementsX(context.elements, span.start, nextStart, shiftAmount);
      }
      cursor += subtreeWidths[i] + gutter;
    }

    const parentBottomY = y + nodeHeight;
    const sliceWidth = nodeWidth / childrenInfo.length;

    for (let i = 0; i < childrenInfo.length; i++) {
      const childInfo = childrenInfo[i];
      const arrowCount = Math.max(1, childInfo.inputArrowCount);
      const centerWidth = childInfo.width * 0.6;
      const startLeft = childInfo.x + childInfo.width / 2 - centerWidth / 2;
      const startRight = startLeft + centerWidth;
      const startPositions = context.arrowCalculator.distributeArrows(
        arrowCount,
        startLeft,
        startRight
      );
      const sliceLeft = x + i * sliceWidth;
      const sliceRight = sliceLeft + sliceWidth;
      const endPositions = this.parallelEndPositions(
        context,
        startPositions,
        sliceLeft,
        sliceRight,
        x,
        x + nodeWidth
      );
      for (let a = 0; a < arrowCount; a++) {
        const arrowId = context.idGenerator.generateId();
        context.elements.push(
          context.elementFactory.createArrow({
            id: arrowId,
            startX: startPositions[a],
            startY: childY,
            endX: endPositions[a],
            endY: parentBottomY,
            childRectId: childInfo.rectId,
            parentRectId: rectId,
            strokeColor: context.config.arrowColor,
          })
        );
        this.bindArrowToElements(context, arrowId, [childInfo.rectId, rectId]);
      }
    }

    const main = childrenInfo[0];
    const outputCount = Math.max(1, main.inputArrowCount);
    const { positions: outputArrowPositions, fullCount } =
      context.arrowCalculator.calculateOutputArrowPositions(outputCount, x, nodeWidth);

    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: fullCount,
      inputArrowPositions: outputArrowPositions,
      outputColumns: [...main.outputColumns],
      outputSortOrder: [...main.outputSortOrder],
    };
  }

  /** Horizontal span of boxes/text in a child subtree (arrows ignored). */
  private subtreeHorizontalBounds(
    elements: ExcalidrawElement[],
    fallback: NodeInfo
  ): { minX: number; maxX: number } {
    let minX = Infinity;
    let maxX = -Infinity;
    for (const element of elements) {
      if (element.type === 'arrow') {
        continue;
      }
      minX = Math.min(minX, element.x);
      maxX = Math.max(maxX, element.x + (element.width ?? 0));
    }
    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
      return { minX: fallback.x, maxX: fallback.x + fallback.width };
    }
    return { minX, maxX };
  }

  private shiftElementsX(
    elements: ExcalidrawElement[],
    start: number,
    end: number,
    shiftAmount: number
  ): void {
    for (let j = start; j < end; j++) {
      const element = elements[j];
      if (element.type === 'arrow') {
        const arrow = element as ExcalidrawArrow;
        element.x += shiftAmount;
        if (!arrow.startBinding || !arrow.endBinding) {
          if (arrow.points) {
            for (const point of arrow.points) {
              point[0] += shiftAmount;
            }
          }
        }
      } else {
        element.x += shiftAmount;
      }
    }
  }

  /**
   * Same spacing as the child starts so the fan stays parallel (join-style),
   * centered on this child's slice of the parent and clamped onto the box.
   */
  private parallelEndPositions(
    context: GenerationContext,
    startPositions: number[],
    sliceLeft: number,
    sliceRight: number,
    parentLeft: number,
    parentRight: number
  ): number[] {
    const count = startPositions.length;
    if (count === 1) {
      return [(sliceLeft + sliceRight) / 2];
    }
    const gap = startPositions[1] - startPositions[0];
    const span = gap * (count - 1);
    const sliceCenter = (sliceLeft + sliceRight) / 2;
    let endLeft = sliceCenter - span / 2;
    let endRight = endLeft + span;
    if (endLeft < parentLeft) {
      endRight += parentLeft - endLeft;
      endLeft = parentLeft;
    }
    if (endRight > parentRight) {
      endLeft -= endRight - parentRight;
      endRight = parentRight;
    }
    return context.arrowCalculator.distributeArrows(count, endLeft, endRight);
  }
}
