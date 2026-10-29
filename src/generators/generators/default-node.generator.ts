import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';
import { BaseNodeGenerator } from './base-node.generator';
import { FONT_FAMILIES } from '../constants';
import { wrapLabel } from '../utils/adaptive-layout';
import { usesChildPartitionFallback } from '../../analysis/partition-analysis';

/** Generic boxes with explicit or child-inherited partition counts. */
export class DefaultNodeGenerator extends BaseNodeGenerator {
  generate(node: ExecutionPlanNode, x: number, y: number, _isRoot: boolean, context: GenerationContext): NodeInfo {
    const width = Math.max(300, context.config.nodeWidth);
    const title = wrapLabel(node.operator, width - 24, context.config.operatorFontSize);
    const details = Object.entries(node.properties ?? {}).map(([key, value]) => key + '=' + value).join('\n');
    const summary = wrapLabel(details, width - 24, context.config.detailsFontSize);
    const height = Math.max(context.config.nodeHeight,
      title.split('\n').length * 25 + summary.split('\n').length * 18 + 30);
    const rectId = context.idGenerator.generateId();
    context.elements.push(context.elementFactory.createRectangle({
      id: rectId, x, y, width, height, strokeColor: context.config.nodeColor, roundnessType: 3,
    }));
    context.elements.push(context.elementFactory.createText({
      id: context.idGenerator.generateId(), x: x + 12, y: y + 8, width: width - 24,
      height: title.split('\n').length * 25, text: title, fontSize: context.config.operatorFontSize,
      fontFamily: FONT_FAMILIES.BOLD, textAlign: 'center', verticalAlign: 'top',
      containerId: rectId, strokeColor: context.config.nodeColor,
    }));
    if (details) {
      context.elements.push(context.elementFactory.createText({
        id: context.idGenerator.generateId(), x: x + 12, y: y + 15 + title.split('\n').length * 25,
        width: width - 24, height: summary.split('\n').length * 18, text: summary,
        fontSize: context.config.detailsFontSize, fontFamily: FONT_FAMILIES.NORMAL,
        textAlign: 'center', verticalAlign: 'top', strokeColor: context.config.nodeColor,
      }));
    }
    let childCount: number | undefined;
    node.children.forEach((child, i) => {
      const childX = x + (i - (node.children.length - 1) / 2) * (width + context.config.horizontalSpacing);
      const childY = y + height + context.config.verticalSpacing;
      const info = context.generateChildNode(child, childX, childY, false);
      // Some specialized or user-registered renderers know a count that analysis
      // cannot infer. Inherit only a count shared by every child, including omissions.
      childCount = info.streamCountKnown !== false && (info.inputArrowCount > 0 || info.emitsNoStreams) &&
        (i === 0 || childCount === info.inputArrowCount) ? info.inputArrowCount : undefined;
      const knownEmpty = context.partitionCounts?.get(child)?.value === 0;
      const positions = knownEmpty || info.emitsNoStreams ? [] :
        info.inputArrowPositions.length > 0 ? info.inputArrowPositions : [info.x + info.width / 2];
      const targets = context.arrowCalculator.calculateOutputArrowPositions(positions.length, x, width).positions;
      positions.forEach((position, j) => {
        const arrow = context.elementFactory.createArrow({
          id: context.idGenerator.generateId(), startX: position, startY: childY,
          endX: targets[j], endY: y + height, childRectId: info.rectId, parentRectId: rectId,
          strokeColor: context.config.arrowColor,
        });
        if (info.inputArrowCount > positions.length) {
          arrow.customData = { partitionSeries: rectId + '/' + info.rectId,
            partitionIndex: j < 2 ? j : info.inputArrowCount - positions.length + j,
            partitionTotal: info.inputArrowCount };
        }
        context.elements.push(arrow);
        this.bindArrowToElements(context, arrow.id, [info.rectId, rectId]);
      });
    });
    const count = context.partitionCounts?.get(node)?.value ??
      (usesChildPartitionFallback(node) ? childCount : undefined);
    const output = context.arrowCalculator.calculateOutputArrowPositions(count ?? 1, x, width);
    return { x, y, width, height, rectId, inputArrowCount: output.fullCount,
      inputArrowPositions: output.positions, outputColumns: [], outputSortOrder: [],
      emitsNoStreams: count === 0, streamCountKnown: count !== undefined };
  }
}
