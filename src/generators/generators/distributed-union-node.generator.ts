import { WrapperNodeGenerator } from './wrapper-node.generator';
import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';

export class DistributedUnionNodeGenerator extends WrapperNodeGenerator {
  constructor() {
    super({ outputMode: 'passthrough', details: (n) => [
      'active: ' + (n.properties?.active ?? 'assignment unresolved'),
      'inactive: ' + (n.properties?.inactive ?? 'unknown'),
    ] });
  }
  generate(node: ExecutionPlanNode, x: number, y: number, isRoot: boolean, context: GenerationContext): NodeInfo {
    const info = super.generate(node, x, y, isRoot, context);
    const rect = context.elements.find((e) => e.id === info.rectId)!;
    rect.backgroundColor = 'transparent'; rect.strokeColor = context.config.nodeColor;
    rect.customData = { role: 'union-selection', active: node.properties?.active, inactive: node.properties?.inactive };
    const capacity = Number(node.properties?.capacity);
    if (Number.isSafeInteger(capacity) && capacity >= 0) {
      const arrows = context.arrowCalculator.calculateOutputArrowPositions(capacity, info.x, info.width);
      info.inputArrowCount = arrows.fullCount; info.inputArrowPositions = arrows.positions;
      info.emitsNoStreams = capacity === 0;
    }
    return info;
  }
}
