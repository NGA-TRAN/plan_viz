import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS, COLORS } from '../constants';
import { DetailTextBuilder } from '../builders/detail-text.builder';

/**
 * AggregateExec node generator
 * AggregateExec aggregates data based on gby (group by) and aggr (aggregation) properties
 * Supports ordering_mode=Sorted which changes the operator label and adds a detail line
 */
export class AggregateNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    const nodeWidth = NODE_DIMENSIONS.DATASOURCE_WIDTH;
    // Check if ordering_mode=Sorted is present to determine height
    const hasOrderingModeSorted = node.properties?.ordering_mode === 'Sorted';
    // Increase height when ordering_mode is present to accommodate the third line
    const nodeHeight = hasOrderingModeSorted ? 100 : NODE_DIMENSIONS.DEFAULT_HEIGHT;

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
    // If ordering_mode=Sorted is present, change label to "AggregateExec - Pipeline"
    const operatorLabel = hasOrderingModeSorted ? 'AggregateExec - Pipeline' : 'AggregateExec';
    const operatorText = context.elementFactory.createText({
      id: context.idGenerator.generateId(),
      x,
      y: y + 5,
      width: nodeWidth,
      height: TEXT_HEIGHTS.OPERATOR,
      text: operatorLabel,
      fontSize: FONT_SIZES.OPERATOR,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    });
    context.elements.push(operatorText);

    // Extract properties and format as detail text
    const detailBuilder = new DetailTextBuilder(context.elementFactory, context.idGenerator);

    if (node.properties) {
      const parts: string[] = [];

      if (node.properties.mode) {
        parts.push(`mode=${node.properties.mode}`);
      }

      if (node.properties.gby) {
        // Extract column names from gby using PropertyParser
        const gbyMatch = node.properties.gby.match(/\[([^\]]+)\]/);
        if (gbyMatch) {
          const gbyContent = gbyMatch[1];
          const columns = context.propertyParser.parseCommaSeparated(gbyContent).map((col) => {
            const trimmed = col.trim();
            // Check if it's a function call (e.g., date_bin(...))
            const functionMatch = trimmed.match(/^(\w+)\s*\(/);
            if (functionMatch) {
              // Return just the function name, not the content inside
              return functionMatch[1];
            }
            // Try to extract column name after "as" keyword first
            const asMatch = trimmed.match(/\s+as\s+([^\s@]+)/i);
            if (asMatch) {
              return asMatch[1].trim();
            }
            // Otherwise, extract column name before @ symbol
            const columnMatch = trimmed.match(/^([^@]+)/);
            return columnMatch ? columnMatch[1].trim() : trimmed;
          });
          parts.push(`gby=[${columns.join(', ')}]`);
        } else {
          // Fallback: use original gby if format doesn't match
          parts.push(`gby=${node.properties.gby}`);
        }
      }

      if (node.properties.aggr) {
        parts.push(`aggr=${node.properties.aggr}`);
      }

      // Format: mode on first line (purple), gby and aggr on second line
      if (parts.length > 0) {
        const hasMode = parts[0].startsWith('mode=');
        if (hasMode) {
          // Line 1: mode (purple)
          detailBuilder.addLine(parts[0], COLORS.PURPLE_MODE);
          // Remaining parts on Line 2
          if (parts.length > 1) {
            detailBuilder.addLine(parts.slice(1).join(', '), context.config.nodeColor);
          }
        } else {
          // No mode, just render everything in default color
          detailBuilder.addLine(parts[0], context.config.nodeColor);
          if (parts.length > 1) {
            detailBuilder.addLine(parts.slice(1).join(', '), context.config.nodeColor);
          }
        }
      }
    }

    // Create detail text elements
    if (detailBuilder.getLineCount() > 0) {
      // Adjust Y position based on whether ordering_mode is present
      // When ordering_mode is present, we need more space, so position detail text higher
      const detailTextY = hasOrderingModeSorted ? y + nodeHeight - 55 : y + nodeHeight - 35;
      const lineHeight = TEXT_HEIGHTS.DETAILS_LINE;
      const detailLines = detailBuilder.build(x + 10, detailTextY, nodeWidth - 20);

      // Adjust heights to match expected output (20 instead of 17.5)
      for (let i = 0; i < detailLines.length; i++) {
        detailLines[i].height = 20;
        detailLines[i].y = detailTextY + i * lineHeight;
        context.elements.push(detailLines[i]);
      }
    }

    // If ordering_mode=Sorted is present, add it as a separate detail text below
    if (hasOrderingModeSorted) {
      const orderingText = context.elementFactory.createText({
        id: context.idGenerator.generateId(),
        x: x + 10,
        y: y + nodeHeight - 20, // Position at bottom with padding
        width: nodeWidth - 20,
        height: 20,
        text: 'ordering_mode=Sorted',
        fontSize: FONT_SIZES.DETAILS,
        fontFamily: FONT_FAMILIES.NORMAL,
        textAlign: 'center',
        verticalAlign: 'top',
        strokeColor: '#8b0000', // Dark red (lowercase to match expected files)
      });
      context.elements.push(orderingText);
    }

    // Extract gby columns (including function names) and aggr columns for output columns
    const gbyOutputColumns: string[] = [];
    const aggrOutputColumns: string[] = [];
    const dateBinInputColumns: Map<string, string> = new Map(); // Map function name -> input column name

    // Extract columns from aggr property
    if (node.properties?.aggr) {
      const aggrMatch = node.properties.aggr.match(/\[([^\]]+)\]/);
      if (aggrMatch) {
        const aggrContent = aggrMatch[1];
        // Parse comma-separated aggregation expressions
        context.propertyParser.parseCommaSeparated(aggrContent).forEach((aggr) => {
          const trimmed = aggr.trim();
          // Extract column name from aggregation expression
          // Examples: max(j.env) -> env, max(j.value) -> value, avg(a.max_bin_val) -> max_bin_val
          // Pattern: function_name(qualifier.column) or function_name(column)
          // Try qualifier.column first (e.g., j.env -> env)
          const qualifierMatch = trimmed.match(/\([^)]*\.(\w+)\)/);
          if (qualifierMatch) {
            aggrOutputColumns.push(qualifierMatch[1]);
          } else {
            // Try just column (e.g., max(column) -> column)
            const columnMatch = trimmed.match(/\((\w+)\)/);
            if (columnMatch) {
              aggrOutputColumns.push(columnMatch[1]);
            }
          }
        });
      }
    }

    // Extract columns from gby property
    if (node.properties?.gby) {
      const gbyMatch = node.properties.gby.match(/\[([^\]]+)\]/);
      if (gbyMatch) {
        const gbyContent = gbyMatch[1];
        context.propertyParser.parseCommaSeparated(gbyContent).forEach((col) => {
          const trimmed = col.trim();
          // Check if it's a function call (e.g., date_bin(...))
          const functionMatch = trimmed.match(/^(\w+)\s*\(/);
          if (functionMatch) {
            const functionName = functionMatch[1];
            gbyOutputColumns.push(functionName);

            // For date_bin function, extract input column name (timestamp column)
            if (functionName === 'date_bin') {
              // Extract the function arguments (everything between first ( and last ))
              const startPos = trimmed.indexOf('(');
              let endPos = startPos;
              let parenDepth = 0;

              for (let i = startPos; i < trimmed.length; i++) {
                if (trimmed[i] === '(') parenDepth++;
                if (trimmed[i] === ')') {
                  parenDepth--;
                  if (parenDepth === 0) {
                    endPos = i;
                    break;
                  }
                }
              }

              if (endPos > startPos) {
                const functionArgs = trimmed.substring(startPos + 1, endPos);
                // date_bin typically has format: date_bin(interval, timestamp_column)
                // Extract the last argument which should be the timestamp column
                const args = context.propertyParser.parseCommaSeparated(functionArgs);
                if (args.length >= 2) {
                  // Last argument is the timestamp column
                  const timestampArg = args[args.length - 1];
                  const columnMatch = timestampArg.match(/(\w+)@\d+/);
                  if (columnMatch) {
                    dateBinInputColumns.set(functionName, columnMatch[1]);
                  }
                }
              }
            }
          } else {
            // Regular column: try to extract column name after "as" keyword first
            const asMatch = trimmed.match(/\s+as\s+([^\s@]+)/i);
            if (asMatch) {
              gbyOutputColumns.push(asMatch[1].trim());
            } else {
              // Otherwise, extract column name before @ symbol
              const columnMatch = trimmed.match(/^([^@]+)/);
              if (columnMatch) {
                gbyOutputColumns.push(columnMatch[1].trim());
              }
            }
          }
        });
      }
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

    // AggregateExec: outputColumns from gby + aggr if present, otherwise from input (child)
    // outputSortOrder from input (child) with date_bin handling
    let outputColumns: string[] = [];
    let outputSortOrder: string[] = [];

    if (childResult.firstChildInfo) {
      // Combine gby columns and aggr columns for output columns
      if (gbyOutputColumns.length > 0 || aggrOutputColumns.length > 0) {
        outputColumns = [...gbyOutputColumns, ...aggrOutputColumns];
      } else {
        // Fallback to child's columns if no gby or aggr
        outputColumns = [...childResult.firstChildInfo.outputColumns];
      }

      // Build sort order: start with child's sort order
      outputSortOrder = [...childResult.firstChildInfo.outputSortOrder];

      // For date_bin functions, if their input column is in sort order, add date_bin to sort order
      dateBinInputColumns.forEach((inputColumn, functionName) => {
        if (childResult.firstChildInfo!.outputSortOrder.includes(inputColumn)) {
          // Find the position of input column in sort order
          const inputIndex = childResult.firstChildInfo!.outputSortOrder.indexOf(inputColumn);
          // Insert date_bin after the input column
          if (!outputSortOrder.includes(functionName)) {
            outputSortOrder.splice(inputIndex + 1, 0, functionName);
          }
        }
      });
    }

    // AggregateExec: output arrows = input arrows (same as FilterExec)
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

