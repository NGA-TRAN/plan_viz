import { partitionCounts } from '../../analysis/partition-analysis';
import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { GenerationContext } from '../types/generation-context.types';
import { NodeInfo } from '../types/node-info.types';
import { DefaultNodeGenerator } from './default-node.generator';

/** Shared neutral boxes with the public upstream operator's audited stream contract. */
export class UpstreamNodeGenerator extends DefaultNodeGenerator {
  generate(node: ExecutionPlanNode, x: number, y: number, isRoot: boolean, context: GenerationContext): NodeInfo {
    // Keep original metadata and names; no vendor-specific property rewriting.
    const counts = context.partitionCounts ?? partitionCounts(node);
    let childInfo: NodeInfo | undefined;
    const result = super.generate(node, x, y, isRoot, { ...context,
      partitionCounts: counts,
      generateChildNode: (child, childX, childY, isChildRoot) => {
        childInfo = context.generateChildNode(child, childX, childY, isChildRoot, counts);
        return childInfo;
      },
    });
    if (childInfo && node.children.length === 1 && ['BroadcastExec', 'SamplerExec', 'CacheExec', 'DistributedExec'].includes(node.operator)) {
      result.outputColumns = childInfo.outputColumns;
      result.outputSortOrder = childInfo.outputSortOrder;
    }
    return result;
  }
}
