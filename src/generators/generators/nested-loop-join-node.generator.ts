import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import {
  NODE_DIMENSIONS,
  FONT_SIZES,
  FONT_FAMILIES,
  TEXT_HEIGHTS,
  HASH_TABLE_DIMENSIONS,
  COLORS,
} from '../constants';

const FILTER_MAX_LENGTH = 60;

/**
 * NestedLoopJoinExec node generator.
 * Two-input build-probe join. Left partitions feed one shared Buffer
 * (teal, not the orange HashTable). Output partitions follow the probe.
 */
export class NestedLoopJoinNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    const nodeWidth = NODE_DIMENSIONS.DATASOURCE_WIDTH;
    const nodeHeight = NODE_DIMENSIONS.SORT_MERGE_JOIN_HEIGHT;

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
        text: 'NestedLoopJoinExec',
        fontSize: FONT_SIZES.OPERATOR,
        fontFamily: FONT_FAMILIES.BOLD,
        textAlign: 'center',
        verticalAlign: 'top',
        containerId: rectId,
        strokeColor: context.config.nodeColor,
      })
    );

    const bufferWidth = HASH_TABLE_DIMENSIONS.WIDTH;
    const bufferHeight = HASH_TABLE_DIMENSIONS.HEIGHT;
    const bufferX = x + nodeWidth / 2 - bufferWidth / 2;
    const bufferY = y + HASH_TABLE_DIMENSIONS.Y_OFFSET;
    const bufferId = context.idGenerator.generateId();
    context.elements.push(
      context.elementFactory.createEllipse({
        id: bufferId,
        x: bufferX,
        y: bufferY,
        width: bufferWidth,
        height: bufferHeight,
        strokeColor: COLORS.BUFFER,
        backgroundColor: COLORS.TRANSPARENT,
        roundnessType: 2,
      })
    );
    context.elements.push(
      context.elementFactory.createText({
        id: context.idGenerator.generateId(),
        x: bufferX + bufferWidth / 2 - 28,
        y: bufferY + bufferHeight / 2 - 9.2,
        width: 56,
        height: 18.4,
        text: 'Buffer',
        fontSize: FONT_SIZES.HASH_TABLE,
        fontFamily: FONT_FAMILIES.BOLD,
        textAlign: 'center',
        verticalAlign: 'middle',
        strokeColor: COLORS.BUFFER,
        autoResize: true,
        lineHeight: 1.15,
      })
    );

    const details: string[] = [];
    if (node.properties?.join_type) {
      details.push(`join_type=${node.properties.join_type}`);
    }
    if (node.properties?.filter) {
      details.push(`filter=${this.truncate(node.properties.filter, FILTER_MAX_LENGTH)}`);
    }
    if (node.properties?.projection) {
      details.push(`projection=${node.properties.projection}`);
    }
    if (details.length > 0) {
      context.elements.push(
        context.elementFactory.createText({
          id: context.idGenerator.generateId(),
          x: x + 10,
          y: y + 35,
          width: nodeWidth - 20,
          height: details.length * TEXT_HEIGHTS.DETAILS_LINE,
          text: details.join('\n'),
          fontSize: FONT_SIZES.DETAILS,
          fontFamily: FONT_FAMILIES.NORMAL,
          textAlign: 'center',
          verticalAlign: 'top',
          strokeColor: context.config.nodeColor,
        })
      );
    }

    if (node.children.length !== 2) {
      throw new Error(
        `NestedLoopJoinExec must have exactly 2 children, but found ${node.children.length}`
      );
    }

    const leftChild = node.children[0];
    const rightChild = node.children[1];
    const childY = y + nodeHeight + context.config.verticalSpacing;
    const leftX = x - nodeWidth - context.config.horizontalSpacing;
    const rightX = x + nodeWidth + context.config.horizontalSpacing;

    const leftInfo = context.generateChildNode(leftChild, leftX, childY, false);
    const rightInfo = context.generateChildNode(rightChild, rightX, childY, false);

    const leftArrows = Math.max(1, leftInfo.inputArrowCount);
    const rightArrows = Math.max(1, rightInfo.inputArrowCount);
    const parentBottomY = y + nodeHeight;
    const bufferCenterX = bufferX + bufferWidth / 2;
    const bufferCenterY = bufferY + bufferHeight / 2;

    this.drawBuildArrowsToBuffer(
      context,
      leftInfo,
      leftArrows,
      childY,
      bufferId,
      bufferCenterX,
      bufferCenterY,
      bufferWidth,
      bufferHeight
    );
    this.drawProbeArrows(
      context,
      rightInfo,
      rightArrows,
      x + nodeWidth / 2,
      x + nodeWidth,
      childY,
      parentBottomY,
      rectId
    );

    let outputColumns: string[] = [];
    if (node.properties?.projection) {
      outputColumns = context.propertyParser.extractProjectionColumns(node.properties.projection);
    } else {
      outputColumns = this.mergeColumns(leftInfo.outputColumns, rightInfo.outputColumns);
    }

    const { positions: outputArrowPositions, fullCount: outputArrowCount } =
      context.arrowCalculator.calculateOutputArrowPositions(rightArrows, x, nodeWidth);

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

  private drawBuildArrowsToBuffer(
    context: GenerationContext,
    childInfo: NodeInfo,
    arrowCount: number,
    childY: number,
    bufferId: string,
    bufferCenterX: number,
    bufferCenterY: number,
    bufferWidth: number,
    bufferHeight: number
  ): void {
    const centerWidth = childInfo.width * 0.6;
    const startLeft = childInfo.x + childInfo.width / 2 - centerWidth / 2;
    const startRight = startLeft + centerWidth;
    const startPositions = context.arrowCalculator.distributeArrows(
      arrowCount,
      startLeft,
      startRight
    );

    for (let i = 0; i < arrowCount; i++) {
      const [endX, endY] = context.geometryUtils.getEllipseEdgePoint(
        startPositions[i],
        childY,
        bufferCenterX,
        bufferCenterY,
        bufferWidth,
        bufferHeight
      );
      const arrowId = context.idGenerator.generateId();
      context.elements.push(
        context.elementFactory.createArrow({
          id: arrowId,
          startX: startPositions[i],
          startY: childY,
          endX,
          endY,
          childRectId: childInfo.rectId,
          parentRectId: bufferId,
          strokeColor: context.config.arrowColor,
        })
      );
      this.bindArrowToElements(context, arrowId, [childInfo.rectId, bufferId]);
    }

    const [outerEndX, outerEndY] = context.geometryUtils.getEllipseEdgePoint(
      startPositions[0] ?? childInfo.x + childInfo.width / 2,
      childY,
      bufferCenterX,
      bufferCenterY,
      bufferWidth,
      bufferHeight
    );
    this.placeJoinSideColumnLabels(
      context,
      childInfo.outputColumns,
      childInfo.outputSortOrder,
      'left',
      startPositions[0] ?? childInfo.x + childInfo.width / 2,
      childY,
      outerEndX,
      outerEndY
    );
  }

  private drawProbeArrows(
    context: GenerationContext,
    childInfo: NodeInfo,
    arrowCount: number,
    endLeft: number,
    endRight: number,
    childY: number,
    parentBottomY: number,
    parentRectId: string
  ): void {
    const centerWidth = childInfo.width * 0.6;
    const startLeft = childInfo.x + childInfo.width / 2 - centerWidth / 2;
    const startRight = startLeft + centerWidth;
    const startPositions = context.arrowCalculator.distributeArrows(
      arrowCount,
      startLeft,
      startRight
    );
    const endPositions = context.arrowCalculator.distributeArrows(arrowCount, endLeft, endRight);

    for (let i = 0; i < arrowCount; i++) {
      const arrowId = context.idGenerator.generateId();
      context.elements.push(
        context.elementFactory.createArrow({
          id: arrowId,
          startX: startPositions[i],
          startY: childY,
          endX: endPositions[i],
          endY: parentBottomY,
          childRectId: childInfo.rectId,
          parentRectId,
          strokeColor: context.config.arrowColor,
        })
      );
      this.bindArrowToElements(context, arrowId, [childInfo.rectId, parentRectId]);
    }

    const outerIndex = startPositions.length - 1;
    this.placeJoinSideColumnLabels(
      context,
      childInfo.outputColumns,
      childInfo.outputSortOrder,
      'right',
      startPositions[outerIndex] ?? childInfo.x + childInfo.width / 2,
      childY,
      endPositions[outerIndex] ?? (endLeft + endRight) / 2,
      parentBottomY
    );
  }

  private mergeColumns(left: string[], right: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const col of [...left, ...right]) {
      if (!seen.has(col)) {
        seen.add(col);
        result.push(col);
      }
    }
    return result;
  }

  private truncate(text: string, max: number): string {
    if (text.length <= max) {
      return text;
    }
    return `${text.slice(0, max - 3)}...`;
  }
}
