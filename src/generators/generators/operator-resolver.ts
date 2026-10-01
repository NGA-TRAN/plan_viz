import { inferOperatorFamily } from '../../analysis/operator-contracts';
import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeGeneratorRegistry } from './node-generator.registry';
import { NodeGeneratorStrategy } from './node-generator.strategy';

export interface OperatorResolution {
  generator: NodeGeneratorStrategy;
  family: string;
  inferred: boolean;
}

export function resolveOperator(
  node: ExecutionPlanNode,
  registry: NodeGeneratorRegistry
): OperatorResolution {
  if (registry.hasGenerator(node.operator)) {
    return { generator: registry.getGenerator(node.operator), family: node.operator, inferred: false };
  }
  const family = inferOperatorFamily(node) ?? 'default';
  return { generator: registry.getGenerator(family), family, inferred: family !== 'default' };
}
