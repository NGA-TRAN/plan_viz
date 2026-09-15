import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';

export type WrapperOutputMode = 'passthrough' | 'one';

export interface WrapperNodeOptions {
  details: (node: ExecutionPlanNode) => string[];
  outputMode: WrapperOutputMode;
}

/**
 * Unary pass-through box for BufferExec, CooperativeExec, and DataSinkExec.
 */
export class WrapperNodeGenerator extends BaseNodeGenerator {
  constructor(private readonly options: WrapperNodeOptions) {
    super();
  }

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
        text: node.operator,
        fontSize: FONT_SIZES.OPERATOR,
        fontFamily: FONT_FAMILIES.BOLD,
        textAlign: 'center',
        verticalAlign: 'top',
        containerId: rectId,
        strokeColor: context.config.nodeColor,
      })
    );

    const details = this.options.details(node);
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

    let outputColumns: string[] = [];
    let outputSortOrder: string[] = [];
    if (childResult.firstChildInfo) {
      outputColumns = [...childResult.firstChildInfo.outputColumns];
      outputSortOrder = [...childResult.firstChildInfo.outputSortOrder];
    }
    const outputCount = this.options.outputMode === 'one' ? 1 : childResult.totalInputArrows;
    const { positions: outputArrowPositions, fullCount: outputArrowCount } =
      context.arrowCalculator.calculateOutputArrowPositions(
        outputCount,
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

export function bufferWrapperOptions(): WrapperNodeOptions {
  return {
    details: (node) => (node.properties?.capacity ? [`capacity=${node.properties.capacity}`] : []),
    outputMode: 'passthrough',
  };
}

export function cooperativeWrapperOptions(): WrapperNodeOptions {
  return {
    details: () => [],
    outputMode: 'passthrough',
  };
}

export function dataSinkWrapperOptions(): WrapperNodeOptions {
  return {
    details: (node) => (node.properties?.sink ? [`sink=${node.properties.sink}`] : []),
    outputMode: 'one',
  };
}
