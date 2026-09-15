import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';

/**
 * AnalyzeExec: unary wrapper for EXPLAIN ANALYZE. Passes through partitions
 * and child columns/sort. Details show verbose=true|false.
 */
export class AnalyzeNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
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
        text: 'AnalyzeExec',
        fontSize: FONT_SIZES.OPERATOR,
        fontFamily: FONT_FAMILIES.BOLD,
        textAlign: 'center',
        verticalAlign: 'top',
        containerId: rectId,
        strokeColor: context.config.nodeColor,
      })
    );

    if (node.properties?.verbose !== undefined) {
      context.elements.push(
        context.elementFactory.createText({
          id: context.idGenerator.generateId(),
          x: x + 10,
          y: y + 35,
          width: nodeWidth - 20,
          height: TEXT_HEIGHTS.DETAILS_LINE,
          text: `verbose=${node.properties.verbose}`,
          fontSize: FONT_SIZES.DETAILS,
          fontFamily: FONT_FAMILIES.NORMAL,
          textAlign: 'center',
          verticalAlign: 'top',
          strokeColor: context.config.nodeColor,
        })
      );
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

    const outputColumns = childResult.firstChildInfo ?
      [...childResult.firstChildInfo.outputColumns] :
      [];
    const outputSortOrder = childResult.firstChildInfo ?
      [...childResult.firstChildInfo.outputSortOrder] :
      [];
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
      outputSortOrder,
    };
  }
}
