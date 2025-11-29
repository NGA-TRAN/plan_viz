import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { ExcalidrawText } from '../../types/excalidraw.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_FAMILIES, TEXT_HEIGHTS, COLORS } from '../constants';

/**
 * Default node generator for unimplemented operators
 * Creates a basic rectangle with operator name and "Unimplemented" text
 */
export class DefaultNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    // Use DATASOURCE_WIDTH (300) as default for consistency with other operators like AggregateExec, SortExec, etc.
    // Only use custom config if it's explicitly set to a non-default value
    const defaultConfigWidth = 200; // Default from ExcalidrawGenerator constructor
    const nodeWidth = context.config.nodeWidth === defaultConfigWidth ?
      NODE_DIMENSIONS.DATASOURCE_WIDTH :
      context.config.nodeWidth;
    const nodeHeight = context.config.nodeHeight ?? NODE_DIMENSIONS.DEFAULT_HEIGHT;

    // Create rectangle for the node
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

    // Create operator name text (centered, bold, red)
    const operatorText = context.elementFactory.createText({
      id: context.idGenerator.generateId(),
      x,
      y: y + 5,
      width: nodeWidth,
      height: TEXT_HEIGHTS.OPERATOR,
      text: node.operator,
      fontSize: context.config.operatorFontSize,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: COLORS.RED_ERROR,
    });
    context.elements.push(operatorText);

    // For unimplemented operators, add "unimplemented" text in red in the details section (centered)
    // Position it in the bottom center of the rectangle
    const detailTextY = y + nodeHeight - TEXT_HEIGHTS.DETAILS_LINE - 10;
    const unimplementedText: ExcalidrawText = context.elementFactory.createText({
      id: context.idGenerator.generateId(),
      x: x + 10,
      y: detailTextY,
      width: nodeWidth - 20,
      height: TEXT_HEIGHTS.DETAILS_LINE,
      text: 'unimplemented',
      fontSize: context.config.detailsFontSize,
      fontFamily: FONT_FAMILIES.NORMAL,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: null,
      strokeColor: COLORS.RED_ERROR,
    });
    context.elements.push(unimplementedText);

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

    // For default nodes, output columns and sort order are the same as input (from children)
    const outputColumns: string[] = [];
    const outputSortOrder: string[] = [];

    if (childResult.firstChildInfo) {
      outputColumns.push(...childResult.firstChildInfo.outputColumns);
      outputSortOrder.push(...childResult.firstChildInfo.outputSortOrder);
    }

    // Calculate output arrow positions with ellipsis support
    const { positions: outputArrowPositions, fullCount: outputArrowCount } =
      context.arrowCalculator.calculateOutputArrowPositions(
        childResult.totalInputArrows,
        x,
        nodeWidth
      );

    return {
      x,
      y: childResult.maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: outputArrowCount,
      inputArrowPositions: outputArrowPositions.length > 0 ? outputArrowPositions : childResult.allInputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }
}

