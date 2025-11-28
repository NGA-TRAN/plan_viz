import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { NodeInfo } from '../types/node-info.types';
import { GenerationContext } from '../types/generation-context.types';

/**
 * Strategy interface for node generators
 * Each node type (DataSourceExec, FilterExec, etc.) implements this interface
 */
export interface NodeGeneratorStrategy {
  /**
   * Generates Excalidraw elements for a node
   * @param node - The execution plan node to generate elements for
   * @param x - X coordinate for the node
   * @param y - Y coordinate for the node
   * @param isRoot - Whether this node is the root node (root nodes don't have output arrows)
   * @param context - Generation context with utilities and configuration
   * @returns Node information including positioning and connection details
   */
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    isRoot: boolean,
    context: GenerationContext
  ): NodeInfo;
}

