import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS, COLORS } from '../constants';
import { DetailTextBuilder } from '../builders/detail-text.builder';

/**
 * RepartitionExec node generator
 * RepartitionExec repartitions data based on partitioning strategy (Hash, RoundRobinBatch, etc.)
 * Output arrow count is determined by the partitioning number
 */
export class RepartitionNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    isRoot: boolean,
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
      text: 'RepartitionExec',
      fontSize: FONT_SIZES.OPERATOR,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    });
    context.elements.push(operatorText);

    // Extract partitioning property and display as detail text
    let partitioningDetail = '';
    let outputArrowCount = 0;
    if (node.properties && node.properties.partitioning) {
      const partitioning = node.properties.partitioning;

      // Simplify Hash partitioning format
      // Example: Hash([d_dkey@0, env@1, service@2, host@3], 16) -> Hash([d_dkey, env, service, host], 16)
      const hashMatch = partitioning.match(/^Hash\(\[([^\]]+)\],\s*(\d+)\)$/);
      if (hashMatch) {
        const columnsStr = hashMatch[1];
        const partitionCount = hashMatch[2];
        // Extract column names (remove @N parts)
        const columns = columnsStr.split(',').map((col) => {
          const trimmed = col.trim();
          // Extract column name before @ symbol
          const columnMatch = trimmed.match(/^([^@]+)/);
          return columnMatch ? columnMatch[1].trim() : trimmed;
        });
        partitioningDetail = `Hash([${columns.join(', ')}], ${partitionCount})`;
        outputArrowCount = parseInt(partitionCount, 10);
      } else {
        // RoundRobinBatch format: RoundRobinBatch(16) -> RoundRobinBatch(16)
        const roundRobinMatch = partitioning.match(/^RoundRobinBatch\((\d+)\)$/);
        if (roundRobinMatch) {
          partitioningDetail = `RoundRobinBatch(${roundRobinMatch[1]})`;
          outputArrowCount = parseInt(roundRobinMatch[1], 10);
        } else {
          // Fallback: use original format
          partitioningDetail = partitioning;
          // Try to extract number from partitioning formats:
          // - RoundRobinBatch(16) -> 16
          // - Hash([env@0], 16) -> 16 (number after comma before closing paren)
          let numberMatch = partitioning.match(/\((\d+)\)$/);
          if (!numberMatch) {
            // Try Hash format: number after comma before closing paren
            numberMatch = partitioning.match(/,\s*(\d+)\)$/);
          }
          if (numberMatch) {
            outputArrowCount = parseInt(numberMatch[1], 10);
          }
        }
      }
    }

    // Build detail text lines using DetailTextBuilder
    const detailBuilder = new DetailTextBuilder(context.elementFactory, context.idGenerator);

    // Add partitioning detail
    if (partitioningDetail) {
      detailBuilder.addLine(partitioningDetail, context.config.nodeColor);
    }

    // Check for preserve_order property
    const hasPreserveOrder = node.properties?.preserve_order === 'true';
    if (hasPreserveOrder) {
      detailBuilder.addLine('preserve_order=true', COLORS.DARK_RED);
    }

    // Check for sort_exprs property and extract column names
    if (node.properties?.sort_exprs) {
      const sortExprs = node.properties.sort_exprs;
      // Extract column names from expressions like "f_dkey@0 ASC NULLS LAST, timestamp@1 ASC NULLS LAST"
      // sort_exprs is a plain string (not wrapped in brackets), so parse it directly
      const expressions = sortExprs.split(',');
      const columnNames: string[] = [];
      for (const expr of expressions) {
        const trimmed = expr.trim();
        // Extract column name before @ symbol
        const columnMatch = trimmed.match(/^([^@\s]+)/);
        if (columnMatch) {
          columnNames.push(columnMatch[1].trim());
        }
      }
      if (columnNames.length > 0) {
        detailBuilder.addLine(`sort_exprs=[${columnNames.join(', ')}]`, context.config.nodeColor);
      }
    }

    // Add limit information if present
    this.extractAndAddLimit(node, detailBuilder, context);

    // Create detail text elements
    // Position details above bottom with padding (same as original)
    // Pattern from expected output:
    // - 1 line: bottom - 22.5
    // - 2 lines: first at bottom - 57.5, second at bottom - 40
    // - 3 lines: first at bottom - 57.5, second at bottom - 40, third at bottom - 22.5
    // So: first line at bottom - 57.5 (when numLines > 1), last line at bottom - 22.5
    const numLines = detailBuilder.getLineCount();
    if (numLines > 0) {
      const bottom = y + nodeHeight;
      let startY: number;
      if (numLines === 1) {
        startY = bottom - 22.5;
        const detailLines = detailBuilder.build(x + 10, startY, nodeWidth - 20);
        context.elements.push(...detailLines);
      } else {
        // First line at bottom - 57.5, last line at bottom - 22.5
        // Calculate spacing: (57.5 - 22.5) / (numLines - 1) = 35 / (numLines - 1)
        const spacing = (57.5 - 22.5) / (numLines - 1);
        startY = bottom - 57.5;
        // Build elements and adjust Y positions
        const detailLines = detailBuilder.build(x + 10, startY, nodeWidth - 20);
        // Adjust Y positions: first at startY, then increment by spacing
        for (let i = 0; i < detailLines.length; i++) {
          detailLines[i].y = startY + i * spacing;
        }
        context.elements.push(...detailLines);
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

    // RepartitionExec: outputColumns from input (child)
    let outputColumns: string[] = [];
    let outputSortOrder: string[] = [];

    if (childResult.firstChildInfo) {
      outputColumns = [...childResult.firstChildInfo.outputColumns];

      // Determine output sort order based on partitioning type
      // For Hash and RoundRobinBatch partitioning: only preserve sort order when:
      //   - Input is ordered (has outputSortOrder) AND
      //   - Either preserve_order=true (with multiple input partitions) OR input has single partition
      const isHashPartitioning = partitioningDetail.startsWith('Hash');
      const isRoundRobinPartitioning = partitioningDetail.startsWith('RoundRobinBatch');
      const inputIsOrdered = childResult.firstChildInfo.outputSortOrder.length > 0;
      const hasSingleInputPartition = childResult.totalInputArrows === 1;
      const preserveOrder = node.properties?.preserve_order === 'true';

      if (isHashPartitioning || isRoundRobinPartitioning) {
        if (inputIsOrdered && (preserveOrder || hasSingleInputPartition)) {
          // Preserve sort order
          outputSortOrder = [...childResult.firstChildInfo.outputSortOrder];
        } else {
          // Don't preserve sort order for Hash/RoundRobinBatch partitioning
          outputSortOrder = [];
        }
      } else {
        // For other partitioning types, preserve sort order from input
        outputSortOrder = [...childResult.firstChildInfo.outputSortOrder];
      }
    }

    // Calculate output arrow positions based on partitioning number with ellipsis support
    const countToUse = outputArrowCount > 0 ? outputArrowCount : childResult.totalInputArrows;
    const { positions: outputArrowPositions, fullCount: outputArrowFullCount } =
      isRoot || countToUse === 0 ?
        { positions: [], fullCount: 0 } :
        context.arrowCalculator.calculateOutputArrowPositions(countToUse, x, nodeWidth);

    // Root nodes (first line of physical_plan) don't have output arrows
    // For RepartitionExec, return outputArrowCount as inputArrowCount so parent knows how many arrows to create
    return {
      x,
      y: childResult.maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: isRoot ? 0 : outputArrowFullCount,
      inputArrowPositions: isRoot ? [] : outputArrowPositions.length > 0 ? outputArrowPositions : childResult.allInputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }
}

