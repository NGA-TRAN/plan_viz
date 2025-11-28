import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';

/**
 * FilterExec node generator
 * FilterExec filters rows based on a predicate and optionally projects columns
 */
export class FilterNodeGenerator extends BaseNodeGenerator {
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
      text: 'FilterExec',
      fontSize: FONT_SIZES.OPERATOR,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    });
    context.elements.push(operatorText);

    // Extract filter expression and projection from properties
    let filterExpression = '';
    let projectionColumns: string[] = [];

    if (node.properties) {
      // Extract projection if present (could be in projection property or in filter string)
      let projectionText = '';
      if (node.properties.projection) {
        projectionText = node.properties.projection;
      } else if (node.properties.filter && node.properties.filter.includes('projection=')) {
        // Extract projection from filter string if it's there
        // Format: "filter_expr, projection=[col1@0, col2@1]"
        const projectionMatch = node.properties.filter.match(/projection=\[([^\]]+)\]/);
        if (projectionMatch) {
          projectionText = `[${projectionMatch[1]}]`; // Add brackets back for extractProjectionColumns
        }
      }

      if (projectionText) {
        // extractProjectionColumns expects format like "[col1@0, col2@1]"
        projectionColumns = context.propertyParser.extractProjectionColumns(projectionText);
      }

      // Extract filter expression
      // Check for filter property (set by parser for FilterExec when no key=value format)
      if (node.properties.filter) {
        filterExpression = node.properties.filter;
        // Remove projection part from filter expression if it's there
        filterExpression = filterExpression.replace(/,\s*projection=\[[^\]]+\]/g, '');
      } else if (node.properties.predicate) {
        filterExpression = node.properties.predicate;
      } else {
        // Fallback: look for any property that looks like a filter expression
        for (const [key, value] of Object.entries(node.properties)) {
          if (key.includes('predicate') || (typeof value === 'string' && value.includes('=') && value.includes('@'))) {
            filterExpression = value;
            break;
          }
        }
      }

      // Remove @ symbols and numbers from filter expression
      if (filterExpression) {
        filterExpression = filterExpression.replace(/@\d+/g, '');
      }
    }

    // Create detail text - filter expression and projection on separate lines
    const details: string[] = [];
    if (filterExpression) {
      details.push(filterExpression);
    }
    if (projectionColumns.length > 0) {
      details.push(`projection=[${projectionColumns.join(', ')}]`);
    }

    if (details.length > 0) {
      const detailText = context.elementFactory.createText({
        id: context.idGenerator.generateId(),
        x: x + 10,
        y: y + 35, // Position below operator name
        width: nodeWidth - 20,
        height: details.length * 20,
        text: details.join('\n'),
        fontSize: FONT_SIZES.DETAILS,
        fontFamily: FONT_FAMILIES.NORMAL,
        textAlign: 'center',
        verticalAlign: 'top',
        strokeColor: context.config.nodeColor,
      });
      context.elements.push(detailText);
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

    // FilterExec: outputColumns from projection if present, otherwise from input (child)
    // outputSortOrder from input (child)
    let outputColumns: string[] = projectionColumns.length > 0 ? projectionColumns : [];
    let outputSortOrder: string[] = [];

    if (childResult.firstChildInfo) {
      if (projectionColumns.length === 0) {
        outputColumns = [...childResult.firstChildInfo.outputColumns];
      }
      outputSortOrder = [...childResult.firstChildInfo.outputSortOrder];
    }

    // FilterExec: output arrows = input arrows
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

