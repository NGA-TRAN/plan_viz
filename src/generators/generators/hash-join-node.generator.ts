import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import {
  NODE_DIMENSIONS,
  FONT_SIZES,
  FONT_FAMILIES,
  TEXT_HEIGHTS,
  HASH_TABLE_DIMENSIONS,
} from '../constants';

/**
 * HashJoinExec node generator
 * HashJoinExec has two inputs: build side (first child) and probe side (second child)
 * Children are positioned horizontally (left and right), not vertically
 * Creates a hash table ellipse with orange border
 * Arrows connect from children to hash table ellipse edge
 */
export class HashJoinNodeGenerator extends BaseNodeGenerator {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    _isRoot: boolean,
    context: GenerationContext
  ): NodeInfo {
    const joinMode = node.properties?.mode ?? '';
    const isPartitioned = joinMode.toLowerCase() === 'partitioned';
    const nodeWidth = isPartitioned ?
      NODE_DIMENSIONS.HASH_JOIN_PARTITIONED_WIDTH :
      NODE_DIMENSIONS.DATASOURCE_WIDTH;
    const nodeHeight = isPartitioned ? NODE_DIMENSIONS.HASH_JOIN_PARTITIONED_HEIGHT : 125;

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

    // Create operator name text with join mode (centered, bold)
    const operatorText = joinMode ? `HashJoinExec: ${joinMode}` : 'HashJoinExec';
    const operatorTextElement = context.elementFactory.createText({
      id: context.idGenerator.generateId(),
      x,
      y: y + 5,
      width: nodeWidth,
      height: TEXT_HEIGHTS.OPERATOR,
      text: operatorText,
      fontSize: FONT_SIZES.OPERATOR,
      fontFamily: FONT_FAMILIES.BOLD,
      textAlign: 'center',
      verticalAlign: 'top',
      containerId: rectId,
      strokeColor: context.config.nodeColor,
    });
    context.elements.push(operatorTextElement);

    // CollectLeft (and default): one shared HashTable, created before children
    // so existing goldens keep element order. Partitioned tables are created
    // after children, one per partition.
    const hashTableWidth = HASH_TABLE_DIMENSIONS.WIDTH;
    const hashTableHeight = HASH_TABLE_DIMENSIONS.HEIGHT;
    const hashTableX = x + nodeWidth / 2 - hashTableWidth / 2;
    const hashTableY = y + HASH_TABLE_DIMENSIONS.Y_OFFSET;
    let hashTableId = '';
    if (!isPartitioned) {
      hashTableId = context.idGenerator.generateId();
      const hashTable = context.elementFactory.createEllipse({
        id: hashTableId,
        x: hashTableX,
        y: hashTableY,
        width: hashTableWidth,
        height: hashTableHeight,
        strokeColor: '#f08c00',
        backgroundColor: 'transparent',
        roundnessType: 2,
      });
      context.elements.push(hashTable);

      const hashTableText = context.elementFactory.createText({
        id: context.idGenerator.generateId(),
        x: hashTableX + hashTableWidth / 2 - 35,
        y: hashTableY + hashTableHeight / 2 - 9.2,
        width: 70,
        height: 18.4,
        text: 'HashTable',
        fontSize: 16,
        fontFamily: FONT_FAMILIES.BOLD,
        textAlign: 'center',
        verticalAlign: 'middle',
        strokeColor: '#f08c00',
        autoResize: true,
        lineHeight: 1.15,
      });
      context.elements.push(hashTableText);
    }

    // Create details text showing join_type and on=
    const details: string[] = [];
    if (node.properties) {
      if (node.properties.join_type) {
        details.push(`join_type=${node.properties.join_type}`);
      }
      if (node.properties.on) {
        // Simplify the on= expression: remove @ symbols and indices
        let onValue = node.properties.on;
        onValue = onValue.replace(/@\d+/g, '');
        details.push(`on=${onValue}`);
      }
    }

    if (details.length > 0) {
      const textHeight = details.length * TEXT_HEIGHTS.DETAILS_LINE;
      const detailText = context.elementFactory.createText({
        id: context.idGenerator.generateId(),
        x: x + 10,
        y: y + 35, // Position below operator name
        width: nodeWidth - 20,
        height: textHeight,
        text: details.join('\n'),
        fontSize: FONT_SIZES.DETAILS,
        fontFamily: FONT_FAMILIES.NORMAL,
        textAlign: 'center',
        verticalAlign: 'top',
        strokeColor: context.config.nodeColor,
      });
      context.elements.push(detailText);
    }

    // HashJoinExec must have exactly 2 children: build side (first) and probe side (second)
    if (node.children.length !== 2) {
      throw new Error(
        `HashJoinExec must have exactly 2 children, but found ${node.children.length}`
      );
    }

    const buildSideChild = node.children[0];
    const probeSideChild = node.children[1];

    // Position build side (first child) to the LEFT of HashJoinExec
    // Position probe side (second child) to the RIGHT of HashJoinExec
    // Both at the same Y level (not stacked vertically)
    const childY = y + nodeHeight + context.config.verticalSpacing;
    const standardNodeWidth = NODE_DIMENSIONS.DATASOURCE_WIDTH;
    const buildSideX = x - standardNodeWidth - context.config.horizontalSpacing;
    const probeSideX = x + nodeWidth + context.config.horizontalSpacing;

    // Generate child elements recursively
    const buildSideInfo = context.generateChildNode(buildSideChild, buildSideX, childY, false);
    const probeSideInfo = context.generateChildNode(probeSideChild, probeSideX, childY, false);

    const buildSideArrows = Math.max(1, buildSideInfo.inputArrowCount);
    const probeSideArrows = Math.max(1, probeSideInfo.inputArrowCount);

    if (isPartitioned) {
      this.drawPartitionedHashTables(
        context,
        x,
        y,
        nodeWidth,
        nodeHeight,
        childY,
        buildSideInfo,
        probeSideInfo,
        buildSideArrows,
        probeSideArrows
      );
    } else {
      // Calculate hash table ellipse center position
      const hashTableCenterX = hashTableX + hashTableWidth / 2;
      const hashTableCenterY = hashTableY + hashTableHeight / 2;

      // Create arrows from build side to hash table ellipse edge
      const buildSideTopArrowPositions: number[] = [];
      if (buildSideArrows === 1) {
        buildSideTopArrowPositions.push(buildSideX + buildSideInfo.width / 2);
      } else {
        const centerRegionWidth = buildSideInfo.width * 0.6;
        const centerRegionLeft = buildSideX + buildSideInfo.width / 2 - centerRegionWidth / 2;
        const centerRegionRight = buildSideX + buildSideInfo.width / 2 + centerRegionWidth / 2;
        const spacing = (centerRegionRight - centerRegionLeft) / (buildSideArrows - 1);
        for (let j = 0; j < buildSideArrows; j++) {
          buildSideTopArrowPositions.push(centerRegionLeft + j * spacing);
        }
      }

      const buildSideTopY = childY;
      let buildOuterEndX = hashTableCenterX;
      let buildOuterEndY = hashTableCenterY;

      for (let i = 0; i < buildSideArrows; i++) {
        const arrowStartX = buildSideTopArrowPositions[i];
        // Calculate intersection point on hash table ellipse edge
        const [hashTableEdgeX, hashTableEdgeY] = context.geometryUtils.getEllipseEdgePoint(
          arrowStartX,
          buildSideTopY,
          hashTableCenterX,
          hashTableCenterY,
          hashTableWidth,
          hashTableHeight
        );
        if (i === 0) {
          buildOuterEndX = hashTableEdgeX;
          buildOuterEndY = hashTableEdgeY;
        }
        const arrowId = context.idGenerator.generateId();
        const arrow = context.elementFactory.createArrow({
          id: arrowId,
          startX: arrowStartX,
          startY: buildSideTopY,
          endX: hashTableEdgeX,
          endY: hashTableEdgeY,
          childRectId: buildSideInfo.rectId,
          parentRectId: hashTableId,
          strokeColor: context.config.arrowColor,
        });
        context.elements.push(arrow);
        this.bindArrowToElements(context, arrowId, [buildSideInfo.rectId, hashTableId]);
      }

      this.placeJoinSideColumnLabels(
        context,
        buildSideInfo.outputColumns,
        buildSideInfo.outputSortOrder,
        'left',
        buildSideTopArrowPositions[0] ?? buildSideX + buildSideInfo.width / 2,
        buildSideTopY,
        buildOuterEndX,
        buildOuterEndY
      );

      // Create arrows from probe side to HashJoinExec rectangle
      const probeSideTopArrowPositions: number[] = [];
      if (probeSideArrows === 1) {
        probeSideTopArrowPositions.push(probeSideX + probeSideInfo.width / 2);
      } else {
        const centerRegionWidth = probeSideInfo.width * 0.6;
        const centerRegionLeft = probeSideX + probeSideInfo.width / 2 - centerRegionWidth / 2;
        const centerRegionRight = probeSideX + probeSideInfo.width / 2 + centerRegionWidth / 2;
        const spacing = (centerRegionRight - centerRegionLeft) / (probeSideArrows - 1);
        for (let j = 0; j < probeSideArrows; j++) {
          probeSideTopArrowPositions.push(centerRegionLeft + j * spacing);
        }
      }

      const probeSideTopY = childY;
      let probeOuterEndX = hashTableCenterX;
      let probeOuterEndY = hashTableCenterY;

      for (let i = 0; i < probeSideArrows; i++) {
        const arrowStartX = probeSideTopArrowPositions[i];
        // Calculate intersection point on hash table ellipse edge
        const [hashTableEdgeX, hashTableEdgeY] = context.geometryUtils.getEllipseEdgePoint(
          arrowStartX,
          probeSideTopY,
          hashTableCenterX,
          hashTableCenterY,
          hashTableWidth,
          hashTableHeight
        );
        if (i === probeSideArrows - 1) {
          probeOuterEndX = hashTableEdgeX;
          probeOuterEndY = hashTableEdgeY;
        }
        const arrowId = context.idGenerator.generateId();
        const arrow = context.elementFactory.createArrow({
          id: arrowId,
          startX: arrowStartX,
          startY: probeSideTopY,
          endX: hashTableEdgeX,
          endY: hashTableEdgeY,
          childRectId: probeSideInfo.rectId,
          parentRectId: hashTableId,
          strokeColor: context.config.arrowColor,
        });
        context.elements.push(arrow);
        this.bindArrowToElements(context, arrowId, [probeSideInfo.rectId, hashTableId]);
      }

      this.placeJoinSideColumnLabels(
        context,
        probeSideInfo.outputColumns,
        probeSideInfo.outputSortOrder,
        'right',
        probeSideTopArrowPositions[probeSideTopArrowPositions.length - 1] ??
          probeSideX + probeSideInfo.width / 2,
        probeSideTopY,
        probeOuterEndX,
        probeOuterEndY
      );
    }

    // Extract output columns from projection property
    const outputColumns: string[] = [];
    if (node.properties && node.properties.projection) {
      const projectionMatch = node.properties.projection.match(/\[([^\]]+)\]/);
      if (projectionMatch) {
        const projectionText = projectionMatch[1];
        outputColumns.push(
          ...context.propertyParser.parseCommaSeparated(projectionText).map((col) => {
            const trimmed = col.trim();
            // Extract column name before @ symbol
            const columnMatch = trimmed.match(/^([^@]+)/);
            return columnMatch ? columnMatch[1].trim() : trimmed;
          })
        );
      }
    }

    // HashJoinExec: output arrows = probe side input arrows
    // Output sort order = probe side sort order
    const outputSortOrder = [...probeSideInfo.outputSortOrder];
    const outputArrowCount = probeSideArrows;
    const { positions: outputArrowPositions, fullCount: outputArrowFullCount } =
      context.arrowCalculator.calculateOutputArrowPositions(outputArrowCount, x, nodeWidth);

    // Calculate max child Y for positioning next node
    const maxChildY = Math.max(
      buildSideInfo.y + buildSideInfo.height,
      probeSideInfo.y + probeSideInfo.height
    );

    return {
      x,
      y: maxChildY,
      width: nodeWidth,
      height: nodeHeight,
      rectId,
      inputArrowCount: outputArrowFullCount,
      inputArrowPositions: outputArrowPositions,
      outputColumns,
      outputSortOrder,
    };
  }

  /**
   * Partitioned hash join: one orange hash table per partition pair.
   * Build stream i and probe stream i both hit table i.
   */
  private drawPartitionedHashTables(
    context: GenerationContext,
    x: number,
    y: number,
    nodeWidth: number,
    nodeHeight: number,
    childY: number,
    buildSideInfo: NodeInfo,
    probeSideInfo: NodeInfo,
    buildSideArrows: number,
    probeSideArrows: number
  ): void {
    const tableCount = Math.max(buildSideArrows, probeSideArrows);
    const padding = 16;
    const gap = 10;
    const available = nodeWidth - padding * 2 - gap * Math.max(0, tableCount - 1);
    const tableWidth = Math.min(HASH_TABLE_DIMENSIONS.WIDTH, available / tableCount);
    const tableHeight = HASH_TABLE_DIMENSIONS.HEIGHT;
    const tablesSpan = tableWidth * tableCount + gap * Math.max(0, tableCount - 1);
    let tableX = x + (nodeWidth - tablesSpan) / 2;
    const tableY = y + nodeHeight - tableHeight - 12;
    const useFullLabel = tableWidth >= 100;
    const label = useFullLabel ? 'HashTable' : 'HT';
    const labelWidth = useFullLabel ? 70 : 22;

    const tables: Array<{
      id: string;
      centerX: number;
      centerY: number;
      width: number;
      height: number;
      bottomX: number;
      bottomY: number;
    }> = [];

    for (let i = 0; i < tableCount; i++) {
      const id = context.idGenerator.generateId();
      const centerX = tableX + tableWidth / 2;
      const centerY = tableY + tableHeight / 2;
      context.elements.push(
        context.elementFactory.createEllipse({
          id,
          x: tableX,
          y: tableY,
          width: tableWidth,
          height: tableHeight,
          strokeColor: '#f08c00',
          backgroundColor: 'transparent',
          roundnessType: 2,
        })
      );
      context.elements.push(
        context.elementFactory.createText({
          id: context.idGenerator.generateId(),
          x: centerX - labelWidth / 2,
          y: centerY - 9.2,
          width: labelWidth,
          height: 18.4,
          text: label,
          fontSize: FONT_SIZES.HASH_TABLE,
          fontFamily: FONT_FAMILIES.BOLD,
          textAlign: 'center',
          verticalAlign: 'middle',
          strokeColor: '#f08c00',
          autoResize: true,
          lineHeight: 1.15,
        })
      );
      tables.push({
        id,
        centerX,
        centerY,
        width: tableWidth,
        height: tableHeight,
        bottomX: centerX,
        bottomY: tableY + tableHeight,
      });
      tableX += tableWidth + gap;
    }

    this.drawSideArrowsToPartitionTables(
      context,
      buildSideInfo,
      buildSideArrows,
      childY,
      tables,
      'left'
    );
    this.drawSideArrowsToPartitionTables(
      context,
      probeSideInfo,
      probeSideArrows,
      childY,
      tables,
      'right'
    );
  }

  private drawSideArrowsToPartitionTables(
    context: GenerationContext,
    childInfo: NodeInfo,
    arrowCount: number,
    childY: number,
    tables: Array<{
      id: string;
      centerX: number;
      centerY: number;
      width: number;
      height: number;
      bottomX: number;
      bottomY: number;
    }>,
    side: 'left' | 'right'
  ): void {
    const centerWidth = childInfo.width * 0.6;
    const startLeft = childInfo.x + childInfo.width / 2 - centerWidth / 2;
    const startRight = startLeft + centerWidth;
    const startPositions = context.arrowCalculator.distributeArrows(
      arrowCount,
      startLeft,
      startRight
    );

    for (let i = 0; i < arrowCount; i++) {
      const table = tables[Math.min(i, tables.length - 1)];
      const arrowId = context.idGenerator.generateId();
      context.elements.push(
        context.elementFactory.createArrow({
          id: arrowId,
          startX: startPositions[i],
          startY: childY,
          endX: table.bottomX,
          endY: table.bottomY,
          childRectId: childInfo.rectId,
          parentRectId: table.id,
          strokeColor: context.config.arrowColor,
        })
      );
      this.bindArrowToElements(context, arrowId, [childInfo.rectId, table.id]);
    }

    const outerIndex = side === 'left' ? 0 : startPositions.length - 1;
    const outerStartX = startPositions[outerIndex] ?? childInfo.x + childInfo.width / 2;
    const outerTable = tables[Math.min(outerIndex, tables.length - 1)];
    this.placeJoinSideColumnLabels(
      context,
      childInfo.outputColumns,
      childInfo.outputSortOrder,
      side,
      outerStartX,
      childY,
      outerTable.bottomX,
      outerTable.bottomY
    );
  }
}
