import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { ExcalidrawText } from '../../types/excalidraw.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';

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
    // Create rectangle for the node
    const rectId = context.idGenerator.generateId();
    const rect = context.elementFactory.createRectangle({
      id: rectId,
      x,
      y,
      width: context.config.nodeWidth,
      height: context.config.nodeHeight,
      strokeColor: context.config.nodeColor,
      roundnessType: 3,
    });
    context.elements.push(rect);

    // Create operator name text (bold, like other operators)
    const operatorText = this.createOperatorText(
      node.operator,
      rectId,
      x,
      y,
      context.config.nodeWidth,
      context
    );
    context.elements.push(operatorText);

    // For unimplemented operators, add "Unimplemented" text in red in the details section
    const unimplementedText: ExcalidrawText = context.elementFactory.createText({
      id: context.idGenerator.generateId(),
      x: x + 10,
      y: y + context.config.operatorFontSize + 14,
      width: context.config.nodeWidth - 20,
      height: context.config.detailsFontSize + 4,
      text: 'Unimplemented',
      fontSize: context.config.detailsFontSize,
      fontFamily: 1, // Regular font
      textAlign: 'left',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: '#ff0000', // Red color
    });
    context.elements.push(unimplementedText);

    // Process children using the recursive generator from context
    const childResult = this.processChildren(
      node,
      x,
      y,
      context.config.nodeHeight,
      rectId,
      context.config.nodeWidth,
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
        context.config.nodeWidth
      );

    return {
      x,
      y: childResult.maxChildY,
      width: context.config.nodeWidth,
      height: context.config.nodeHeight,
      rectId,
      inputArrowCount: outputArrowCount,
      inputArrowPositions: outputArrowPositions.length > 0 ? outputArrowPositions : childResult.allInputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }
}

