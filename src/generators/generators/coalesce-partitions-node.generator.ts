import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';

/**
 * CoalescePartitionsExec node generator
 * CoalescePartitionsExec always produces one arrow output no matter how many input arrows it receives
 * It does not have any details to display
 */
export class CoalescePartitionsNodeGenerator extends BaseNodeGenerator {
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
    const operatorText = context.elementFactory.createText({
      id: context.idGenerator.generateId(),
      x,
      y: y + 5,
      width: nodeWidth,
      height: TEXT_HEIGHTS.OPERATOR,
      text: 'CoalescePartitionsExec',
      fontSize: FONT_SIZES.OPERATOR,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    });
    context.elements.push(operatorText);

    // CoalescePartitionsExec does not have any details to display

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

    // CoalescePartitionsExec: outputColumns and outputSortOrder from input (child)
    const outputColumns: string[] = [];
    const outputSortOrder: string[] = [];

    if (childResult.firstChildInfo) {
      outputColumns.push(...childResult.firstChildInfo.outputColumns);
      outputSortOrder.push(...childResult.firstChildInfo.outputSortOrder);
    }

    // CoalescePartitionsExec: always outputs 1 arrow regardless of input arrows
    // Return 1 arrow at the center position
    const outputArrowPosition = x + nodeWidth / 2;
    return {
      x,
      y: childResult.maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: 1,
      inputArrowPositions: [outputArrowPosition],
      outputColumns,
      outputSortOrder,
    };
  }
}

