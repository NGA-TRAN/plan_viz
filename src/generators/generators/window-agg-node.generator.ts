import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS, COLORS } from '../constants';
import { DetailTextBuilder } from '../builders/detail-text.builder';

const WDW_MAX_LENGTH = 80;

/**
 * WindowAggExec / BoundedWindowAggExec generator.
 * Unary: 1:1 arrows with the child, preserves child sort, and highlights
 * PARTITION BY / ORDER BY names when they can be parsed from `wdw`.
 */
export class WindowAggNodeGenerator extends BaseNodeGenerator {
  constructor(private readonly operatorName: string) {
    super();
  }

  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    const wdwText = node.properties?.wdw || '';
    const modeText = node.properties?.mode;
    const partitionBy = this.extractKeyColumns(node, wdwText, 'partition_by');
    const orderBy = this.extractKeyColumns(node, wdwText, 'order_by');
    const extraLines = (modeText ? 1 : 0) + (partitionBy.length || orderBy.length ? 1 : 0);
    const nodeWidth = NODE_DIMENSIONS.DATASOURCE_WIDTH;
    const nodeHeight = extraLines > 0 ? NODE_DIMENSIONS.AGGREGATE_HEIGHT_WITH_SORTED : NODE_DIMENSIONS.DEFAULT_HEIGHT;

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
        text: this.operatorName,
        fontSize: FONT_SIZES.OPERATOR,
        fontFamily: FONT_FAMILIES.BOLD,
        textAlign: 'center',
        verticalAlign: 'top',
        containerId: rectId,
        strokeColor: context.config.nodeColor,
      })
    );

    const detailBuilder = new DetailTextBuilder(context.elementFactory, context.idGenerator);
    if (modeText) {
      detailBuilder.addLine(`mode=${this.stripBrackets(modeText)}`, COLORS.PURPLE_MODE);
    }
    if (wdwText) {
      detailBuilder.addLine(`wdw=${this.truncate(wdwText)}`, context.config.nodeColor);
    }
    const keyParts: string[] = [];
    if (partitionBy.length > 0) {
      keyParts.push(`partition_by=[${partitionBy.join(', ')}]`);
    }
    if (orderBy.length > 0) {
      keyParts.push(`order_by=[${orderBy.join(', ')}]`);
    }
    if (keyParts.length > 0) {
      detailBuilder.addLine(keyParts.join(', '), COLORS.ORDERED_COLUMN);
    }

    if (detailBuilder.getLineCount() > 0) {
      const detailTextY = extraLines > 0 ? y + nodeHeight - 55 : y + nodeHeight - 35;
      const detailLines = detailBuilder.build(x + 10, detailTextY, nodeWidth - 20);
      for (let i = 0; i < detailLines.length; i++) {
        detailLines[i].height = 20;
        detailLines[i].y = detailTextY + i * TEXT_HEIGHTS.DETAILS_LINE;
        context.elements.push(detailLines[i]);
      }
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

    const windowFields = this.extractFieldNames(wdwText);
    const childColumns = childResult.firstChildInfo ? [...childResult.firstChildInfo.outputColumns] : [];
    const outputColumns = this.unique([...childColumns, ...windowFields]);
    const childSort = childResult.firstChildInfo ? [...childResult.firstChildInfo.outputSortOrder] : [];
    const windowSort = [...partitionBy, ...orderBy].filter((col) => outputColumns.includes(col));
    const outputSortOrder = this.unique([...childSort, ...windowSort]);

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

  private truncate(text: string): string {
    const normalized = text.startsWith('[') ? text : `[${text}]`;
    if (normalized.length <= WDW_MAX_LENGTH) {
      return normalized;
    }
    return `${normalized.slice(0, WDW_MAX_LENGTH - 3)}...`;
  }

  private stripBrackets(value: string): string {
    return value.replace(/^\[|\]$/g, '');
  }

  private extractKeyColumns(
    node: ExecutionPlanNode,
    wdwText: string,
    key: string
  ): string[] {
    const fromProps = node.properties?.[key];
    const namedInWdw = wdwText.match(new RegExp(`${key}\\s*[=:]\\s*\\[([^\\]]+)\\]`, 'i'));
    let raw = '';
    if (fromProps) {
      const bracketed = fromProps.match(/\[([^\]]+)\]/);
      raw = bracketed ? bracketed[1] : fromProps;
    } else if (namedInWdw) {
      raw = namedInWdw[1];
    }
    if (!raw) {
      return [];
    }
    return raw
      .split(',')
      .map((part) => {
        const trimmed = part.trim();
        const columnMatch = trimmed.match(/^([^@\s]+)/);
        return columnMatch ? columnMatch[1].trim() : trimmed;
      })
      .filter((col) => col.length > 0);
  }

  private extractFieldNames(wdwText: string): string[] {
    const names: string[] = [];
    const fieldRe = /name:\s*"([^"]+)"/g;
    let match = fieldRe.exec(wdwText);
    while (match) {
      names.push(match[1]);
      match = fieldRe.exec(wdwText);
    }
    return names;
  }

  private unique(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
      if (!seen.has(value)) {
        seen.add(value);
        result.push(value);
      }
    }
    return result;
  }
}
