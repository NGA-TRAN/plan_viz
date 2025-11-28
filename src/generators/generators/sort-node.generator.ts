import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';

/**
 * SortExec node generator
 * SortExec sorts data based on expr property
 * outputColumns from input (child)
 * outputSortOrder from expr
 */
export class SortNodeGenerator extends BaseNodeGenerator {
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
      text: 'SortExec',
      fontSize: FONT_SIZES.OPERATOR,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    });
    context.elements.push(operatorText);

    // Extract expr property and format as detail text
    // Format: [env@1 ASC NULLS LAST, service@2 ASC NULLS LAST, host@3 ASC NULLS LAST]
    // Extract column names (before @) and format as [env, service, host]
    // SortExec: outputSortOrder comes from expr details
    let detailText = '';
    const outputSortOrder: string[] = [];

    if (node.properties) {
      const parts: string[] = [];

      if (node.properties.expr) {
        // Extract column names from expr: remove @N ASC NULLS LAST parts
        // Example: [env@1 ASC NULLS LAST, service@2 ASC NULLS LAST, host@3 ASC NULLS LAST]
        // Result: [env, service, host]
        const exprMatch = node.properties.expr.match(/\[([^\]]+)\]/);
        if (exprMatch) {
          const exprContent = exprMatch[1];
          // Split by comma and extract column name (part before @)
          const columns = exprContent.split(',').map((col) => {
            const trimmed = col.trim();
            // Extract column name before @ symbol
            const columnMatch = trimmed.match(/^([^@]+)/);
            return columnMatch ? columnMatch[1].trim() : trimmed;
          });
          outputSortOrder.push(...columns);
          parts.push(`[${columns.join(', ')}]`);
        }
      }

      if (node.properties.preserve_partitioning) {
        parts.push(`preserve_partitioning=${node.properties.preserve_partitioning}`);
      }

      // Format: first part on first line, second part on second line
      if (parts.length > 0) {
        if (parts.length === 1) {
          detailText = parts[0];
        } else {
          detailText = `${parts[0]} \n${parts[1]}`;
        }
      }
    }

    // Create detail text at bottom center
    if (detailText) {
      const detailTextElement = context.elementFactory.createText({
        id: context.idGenerator.generateId(),
        x: x + 10,
        y: y + nodeHeight - 35, // Position near bottom (allowing for 2 lines)
        width: nodeWidth - 20,
        height: 35,
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

    // SortExec: outputColumns from input (child)
    let outputColumns: string[] = [];
    if (childResult.firstChildInfo) {
      outputColumns = [...childResult.firstChildInfo.outputColumns];
    }

    // SortExec: output arrows = input arrows (preserve exact count and positions)
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

