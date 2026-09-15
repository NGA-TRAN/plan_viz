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
 * SymmetricHashJoinExec: streaming join with a hash table on each side.
 * Two orange ellipses distinguish it from HashJoinExec (one ellipse).
 */
export class SymmetricHashJoinNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    const nodeWidth = NODE_DIMENSIONS.SYMMETRIC_HASH_JOIN_WIDTH;
    const nodeHeight = NODE_DIMENSIONS.SYMMETRIC_HASH_JOIN_HEIGHT;

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
        text: 'SymmetricHashJoinExec',
        fontSize: FONT_SIZES.OPERATOR,
        fontFamily: FONT_FAMILIES.BOLD,
        textAlign: 'center',
        verticalAlign: 'top',
        containerId: rectId,
        strokeColor: context.config.nodeColor,
      })
    );

    const details: string[] = [];
    if (node.properties?.mode) {
      details.push(`mode=${node.properties.mode}`);
    }
    if (node.properties?.join_type) {
      details.push(`join_type=${node.properties.join_type}`);
    }
    if (node.properties?.on) {
      details.push(`on=${node.properties.on.replace(/@\d+/g, '')}`);
    }
    if (node.properties?.filter) {
      details.push(`filter=${this.truncate(node.properties.filter, FILTER_MAX_LENGTH)}`);
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

    const tableWidth = HASH_TABLE_DIMENSIONS.WIDTH;
    const tableHeight = HASH_TABLE_DIMENSIONS.HEIGHT;
    const tableY = y + nodeHeight - tableHeight - 12;
    const tableGap = 24;
    const tablesSpan = tableWidth * 2 + tableGap;
    const leftTableX = x + (nodeWidth - tablesSpan) / 2;
    const rightTableX = leftTableX + tableWidth + tableGap;
    const leftTable = this.createHashTable(context, leftTableX, tableY, tableWidth, tableHeight);
    const rightTable = this.createHashTable(context, rightTableX, tableY, tableWidth, tableHeight);

    if (node.children.length !== 2) {
      throw new Error(
        `SymmetricHashJoinExec must have exactly 2 children, but found ${node.children.length}`
      );
    }

    const childY = y + nodeHeight + context.config.verticalSpacing;
    const leftX = x - nodeWidth - context.config.horizontalSpacing;
    const rightX = x + nodeWidth + context.config.horizontalSpacing;
    const leftInfo = context.generateChildNode(node.children[0], leftX, childY, false);
    const rightInfo = context.generateChildNode(node.children[1], rightX, childY, false);

    const leftArrows = Math.max(1, leftInfo.inputArrowCount);
    const rightArrows = Math.max(1, rightInfo.inputArrowCount);

    this.drawArrowsToHashTable(context, leftInfo, leftArrows, childY, leftTable, 'left');
    this.drawArrowsToHashTable(context, rightInfo, rightArrows, childY, rightTable, 'right');

    let outputColumns: string[] = [];
    if (node.properties?.projection) {
      outputColumns = context.propertyParser.extractProjectionColumns(node.properties.projection);
    } else {
      outputColumns = this.mergeColumns(leftInfo.outputColumns, rightInfo.outputColumns);
    }

    const outputArrowCount = Math.max(leftArrows, rightArrows);
    const { positions: outputArrowPositions, fullCount } =
      context.arrowCalculator.calculateOutputArrowPositions(outputArrowCount, x, nodeWidth);

    return {
      x,
      y: Math.max(leftInfo.y + leftInfo.height, rightInfo.y + rightInfo.height),
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: fullCount,
      inputArrowPositions: outputArrowPositions,
      outputColumns,
      outputSortOrder: [],
    };
  }

  private createHashTable(
    context: GenerationContext,
    tableX: number,
    tableY: number,
    width: number,
    height: number
  ): { id: string; centerX: number; centerY: number; width: number; height: number } {
    const id = context.idGenerator.generateId();
    context.elements.push(
      context.elementFactory.createEllipse({
        id,
        x: tableX,
        y: tableY,
        width,
        height,
        strokeColor: COLORS.ORANGE_BORDER,
        backgroundColor: COLORS.TRANSPARENT,
        roundnessType: 2,
      })
    );
    context.elements.push(
      context.elementFactory.createText({
        id: context.idGenerator.generateId(),
        x: tableX + width / 2 - 35,
        y: tableY + height / 2 - 9.2,
        width: 70,
        height: 18.4,
        text: 'HashTable',
        fontSize: FONT_SIZES.HASH_TABLE,
        fontFamily: FONT_FAMILIES.BOLD,
        textAlign: 'center',
        verticalAlign: 'middle',
        strokeColor: COLORS.ORANGE_BORDER,
        autoResize: true,
        lineHeight: 1.15,
      })
    );
    return {
      id,
      centerX: tableX + width / 2,
      centerY: tableY + height / 2,
      width,
      height,
    };
  }

  private drawArrowsToHashTable(
    context: GenerationContext,
    childInfo: NodeInfo,
    arrowCount: number,
    childY: number,
    table: { id: string; centerX: number; centerY: number; width: number; height: number },
    side: 'left' | 'right'
  ): void {
    const centerWidth = childInfo.width * 0.6;
    const startLeft = childInfo.x + childInfo.width / 2 - centerWidth / 2;
    const startRight = startLeft + centerWidth;
    const startPositions = context.arrowCalculator.distributeArrows(
      arrowCount,
      startLeft,
      startRight
    );

    const outerIndex = side === 'left' ? 0 : startPositions.length - 1;
    let outerEndX = table.centerX;
    let outerEndY = table.centerY;

    for (let i = 0; i < arrowCount; i++) {
      const [endX, endY] = context.geometryUtils.getEllipseEdgePoint(
        startPositions[i],
        childY,
        table.centerX,
        table.centerY,
        table.width,
        table.height
      );
      if (i === outerIndex) {
        outerEndX = endX;
        outerEndY = endY;
      }
      const arrowId = context.idGenerator.generateId();
      context.elements.push(
        context.elementFactory.createArrow({
          id: arrowId,
          startX: startPositions[i],
          startY: childY,
          endX,
          endY,
          childRectId: childInfo.rectId,
          parentRectId: table.id,
          strokeColor: context.config.arrowColor,
        })
      );
      this.bindArrowToElements(context, arrowId, [childInfo.rectId, table.id]);
    }

    this.placeJoinSideColumnLabels(
      context,
      childInfo.outputColumns,
      childInfo.outputSortOrder,
      side,
      startPositions[outerIndex] ?? childInfo.x + childInfo.width / 2,
      childY,
      outerEndX,
      outerEndY,
      childInfo.groupId
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
