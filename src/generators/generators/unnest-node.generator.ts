import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';
import { DetailTextBuilder } from '../builders/detail-text.builder';

const UNNEST_DETAIL_KEYS = ['list_type', 'struct_type', 'list', 'struct'];

/**
 * UnnestExec node generator.
 * Unary pass-through of partitions. Drops output sort because unnesting
 * lists breaks row-order guarantees.
 */
export class UnnestNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    const detailParts = this.collectDetails(node);
    const nodeWidth = NODE_DIMENSIONS.DATASOURCE_WIDTH;
    const nodeHeight =
      detailParts.length > 1 ? NODE_DIMENSIONS.AGGREGATE_HEIGHT_WITH_SORTED : NODE_DIMENSIONS.DEFAULT_HEIGHT;

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
        text: 'UnnestExec',
        fontSize: FONT_SIZES.OPERATOR,
        fontFamily: FONT_FAMILIES.BOLD,
        textAlign: 'center',
        verticalAlign: 'top',
        containerId: rectId,
        strokeColor: context.config.nodeColor,
      })
    );

    if (detailParts.length > 0) {
      const detailBuilder = new DetailTextBuilder(context.elementFactory, context.idGenerator);
      for (const part of detailParts) {
        detailBuilder.addLine(part, context.config.nodeColor);
      }
      const detailTextY = y + nodeHeight - (detailParts.length > 1 ? 40 : 25);
      const detailLines = detailBuilder.build(x + 10, detailTextY, nodeWidth - 20);
      for (const line of detailLines) {
        context.elements.push(line);
      }
    }

    const childResult = this.processChildren(
      node,
      x,
      y,
      nodeHeight,
      rectId,
      nodeWidth,
      context,
      (child, childX, childY, isChildRoot, childContext) => {
        return childContext.generateChildNode(child, childX, childY, isChildRoot);
      }
    );

    const outputColumns = childResult.firstChildInfo ? [...childResult.firstChildInfo.outputColumns] : [];
    const { positions: outputArrowPositions, fullCount: outputArrowCount } =
      context.arrowCalculator.calculateOutputArrowPositions(
        childResult.totalInputArrows,
        childResult.fittedX,
        childResult.fittedWidth
      );

    return {
      x: childResult.fittedX,
      y: childResult.maxChildY,
      width: childResult.fittedWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: outputArrowCount,
      inputArrowPositions:
        outputArrowPositions.length > 0 ? outputArrowPositions : childResult.allInputArrowPositions,
      outputColumns,
      outputSortOrder: [],
    };
  }

  private collectDetails(node: ExecutionPlanNode): string[] {
    if (!node.properties) {
      return [];
    }
    const parts: string[] = [];
    for (const key of UNNEST_DETAIL_KEYS) {
      if (node.properties[key]) {
        parts.push(`${key}=${node.properties[key]}`);
      }
    }
    return parts;
  }
}
