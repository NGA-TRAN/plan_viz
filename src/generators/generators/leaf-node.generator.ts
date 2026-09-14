import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { NODE_DIMENSIONS, FONT_SIZES, FONT_FAMILIES, TEXT_HEIGHTS } from '../constants';

export interface LeafNodeOptions {
  details: (node: ExecutionPlanNode) => string[];
  outputArrows: (node: ExecutionPlanNode) => number;
}

/**
 * Shared leaf box for EmptyExec, PlaceholderRowExec, LazyMemoryExec, ValuesExec.
 * No file-group ellipses. Output arrow count is operator-specific.
 */
export class LeafNodeGenerator extends BaseNodeGenerator {
  constructor(private readonly options: LeafNodeOptions) {
    super();
  }

  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    const details = this.options.details(node);
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

    const arrowCount = Math.max(0, this.options.outputArrows(node));
    const { positions, fullCount } = context.arrowCalculator.calculateOutputArrowPositions(
      arrowCount,
      x,
      nodeWidth
    );

    return {
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: fullCount,
      inputArrowPositions: positions,
      outputColumns: [],
      outputSortOrder: [],
      emitsNoStreams: arrowCount === 0,
    };
  }
}

export function emptyLeafOptions(): LeafNodeOptions {
  return {
    details: (node) => {
      if (node.properties?.produce_one_row !== undefined) {
        return [`produce_one_row=${node.properties.produce_one_row}`];
      }
      return ['empty'];
    },
    // One tree edge to the parent so EmptyExec is not a floating box.
    // Root plans still draw no outgoing arrows (root never does).
    outputArrows: () => 1,
  };
}

export function placeholderLeafOptions(): LeafNodeOptions {
  return {
    details: () => ['produce_one_row=true'],
    outputArrows: () => 1,
  };
}

export function memoryLeafOptions(): LeafNodeOptions {
  return {
    details: (node) => {
      const lines: string[] = [];
      if (node.properties?.partitions) {
        lines.push(`partitions=${node.properties.partitions}`);
      }
      if (node.properties?.partition_sizes) {
        lines.push(`partition_sizes=${node.properties.partition_sizes}`);
      }
      return lines;
    },
    outputArrows: (node) => {
      const raw = node.properties?.partitions;
      if (!raw) {
        return 1;
      }
      const parsed = parseInt(raw.replace(/[^\d]/g, ''), 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    },
  };
}
