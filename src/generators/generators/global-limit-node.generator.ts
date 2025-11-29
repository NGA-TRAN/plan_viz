import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';

/**
 * GlobalLimitExec node generator
 * GlobalLimitExec limits the number of rows fetched globally across partitions
 * Output columns and sort order are the same as input
 * Must have exactly 1 input arrow (error if many)
 * Always has 1 output arrow
 */
export class GlobalLimitNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    // GlobalLimitExec must have exactly 1 child
    if (node.children.length !== 1) {
      throw new Error(
        `GlobalLimitExec must have exactly 1 child, but found ${node.children.length}`
      );
    }

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
    const operatorText = context.elementFactory.createText({
      id: context.idGenerator.generateId(),
      x,
      y: y + 5,
      width: nodeWidth,
      height: TEXT_HEIGHTS.OPERATOR,
      text: 'GlobalLimitExec',
      fontSize: FONT_SIZES.OPERATOR,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    });
    context.elements.push(operatorText);

    // Extract skip and fetch properties and display as detail text
    const detailParts: string[] = [];
    if (node.properties?.skip !== undefined) {
      detailParts.push(`skip=${node.properties.skip}`);
    }
    if (node.properties?.fetch !== undefined) {
      detailParts.push(`fetch=${node.properties.fetch}`);
    }

    const detailText = detailParts.join(', ');

    // Create detail text at bottom center
    if (detailText) {
      const detailTextElement = context.elementFactory.createText({
        id: context.idGenerator.generateId(),
        x: x + 10,
        y: y + nodeHeight - 25, // Position near bottom
        width: nodeWidth - 20,
        height: 20,
        text: detailText,
        fontSize: FONT_SIZES.DETAILS,
        fontFamily: FONT_FAMILIES.NORMAL,
        textAlign: 'center',
        verticalAlign: 'top',
        strokeColor: context.config.nodeColor,
      });
      context.elements.push(detailTextElement);
    }

    // Process children using the recursive generator from context
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

    // Validate that there's exactly 1 input arrow
    if (childResult.totalInputArrows !== 1) {
      throw new Error(
        `GlobalLimitExec must have exactly 1 input arrow, but found ${childResult.totalInputArrows}`
      );
    }

    // GlobalLimitExec: output columns and sort order are the same as input (from children)
    const outputColumns: string[] = [];
    const outputSortOrder: string[] = [];

    if (childResult.firstChildInfo) {
      outputColumns.push(...childResult.firstChildInfo.outputColumns);
      outputSortOrder.push(...childResult.firstChildInfo.outputSortOrder);
    }

    // GlobalLimitExec: always has 1 output arrow
    const outputArrowPositions = [x + nodeWidth / 2];
    const outputArrowCount = 1;

    return {
      x,
      y: childResult.maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: outputArrowCount,
      inputArrowPositions: outputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }
}

