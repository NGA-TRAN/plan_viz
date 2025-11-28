import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';

/**
 * SortPreservingMergeExec node generator
 * SortPreservingMergeExec always produces one arrow output no matter how many input arrows it receives
 * outputColumns from input (child)
 * outputSortOrder from expr/expression property
 */
export class SortPreservingMergeNodeGenerator extends BaseNodeGenerator {
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
      text: 'SortPreservingMergeExec',
      fontSize: FONT_SIZES.OPERATOR,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    });
    context.elements.push(operatorText);

    // Extract expr or expression property and format as detail text
    // Format: [f_dkey@0 ASC NULLS LAST, date_bin(...)@1 ASC NULLS LAST]
    // Extract column/function names: for functions, extract only function name (e.g., date_bin)
    // For columns, extract column name before @
    // Result: [f_dkey, date_bin]
    // SortPreservingMergeExec: outputSortOrder is the same as columns/functions in details
    let detailText = '';
    const outputSortOrder: string[] = [];

    if (node.properties) {
      // Check both expr (key=value format) and expression (no key format)
      const exprValue = node.properties.expr || node.properties.expression;
      if (exprValue) {
        // Extract content from brackets
        const exprMatch = exprValue.match(/\[([^\]]+)\]/);
        if (exprMatch) {
          const exprContent = exprMatch[1];
          // Parse comma-separated items respecting nested parentheses
          const items = context.propertyParser.parseCommaSeparated(exprContent);

          // Process each item to extract column or function name
          const simplifiedItems: string[] = [];
          items.forEach((item) => {
            const trimmed = item.trim();
            // Check if it's a function (contains opening parenthesis before @)
            const functionMatch = trimmed.match(/^(\w+)\s*\(/);
            if (functionMatch) {
              // It's a function, extract just the function name
              simplifiedItems.push(functionMatch[1]);
              outputSortOrder.push(functionMatch[1]);
            } else {
              // It's a column, extract column name before @
              const columnMatch = trimmed.match(/^([^@]+)/);
              if (columnMatch) {
                const columnName = columnMatch[1].trim();
                simplifiedItems.push(columnName);
                outputSortOrder.push(columnName);
              }
            }
          });

          detailText = `[${simplifiedItems.join(', ')}]`;
        }
      }
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

    // SortPreservingMergeExec: outputColumns from input (child)
    let outputColumns: string[] = [];
    if (childResult.firstChildInfo) {
      outputColumns = [...childResult.firstChildInfo.outputColumns];
    }

    // SortPreservingMergeExec: always outputs 1 arrow regardless of input arrows
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
      outputSortOrder, // outputSortOrder is set from expr details above
    };
  }
}

