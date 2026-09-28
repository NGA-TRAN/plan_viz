import { compactExpression } from '../utils/adaptive-layout';
import { listContent } from '../../parsers/plan-text';
import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';

/**
 * ProjectionExec node generator
 * ProjectionExec projects columns based on expr property
 * outputColumns come from aliases/column names in expr
 * outputSortOrder comes from input (child)
 */
export class ProjectionNodeGenerator extends BaseNodeGenerator {
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
      text: 'ProjectionExec',
      fontSize: FONT_SIZES.OPERATOR,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    });
    context.elements.push(operatorText);

    // Extract expr property and simplify detail text
    // Example: [date_bin(...)@1 as time_bin, max(j.env)@2 as env] -> time_bin, env (for outputColumns)
    // But for details: if function exists, show function name (e.g., date_bin) instead of full expression
    // ProjectionExec: outputColumns come from aliases/column names in expr
    let detailText = '';
    const outputColumns: string[] = [];
    if (node.properties?.expr) {
      const items = context.propertyParser.parseCommaSeparated(listContent(node.properties.expr));
      outputColumns.push(...items.map((item) => context.propertyParser.extractColumnName(item)));
      detailText = outputColumns.map(compactExpression).join(', ');
    }

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

    // ProjectionExec: outputColumns from expr, outputSortOrder from input (child)
    let outputSortOrder: string[] = [];
    if (childResult.firstChildInfo) {
      outputSortOrder = [...childResult.firstChildInfo.outputSortOrder];
    }

    // ProjectionExec: output arrows = input arrows (same as FilterExec)
    // Calculate output arrow positions with ellipsis support
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
      inputArrowPositions: outputArrowPositions.length > 0 ? outputArrowPositions : childResult.allInputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }
}

