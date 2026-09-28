/**
 * Represents a node in the Apache Data Fusion physical execution plan tree
 */
export interface OperatorWrapper {
  operator: string;
  argumentsText?: string;
  rawText: string;
}

export interface ExecutionPlanNode {
  /** Inline decorators, outermost first; children still belong to the inner operator. */
  wrappers?: OperatorWrapper[];
  /** The operator type (e.g., ProjectionExec, FilterExec) */
  operator: string;
  /** Optional properties/metadata for the operator */
  properties?: Record<string, string>;
  /** Child nodes in the execution plan */
  children: ExecutionPlanNode[];
  /** Indentation level in the original plan text */
  level: number;
}

/**
 * Result of parsing an execution plan
 */
export interface ParsedExecutionPlan {
  /** Root node of the execution plan tree */
  root: ExecutionPlanNode | null;
  /** Original plan text */
  originalText: string;
}

/**
 * Configuration for parsing execution plans
 */
export interface ParserConfig {
  /** Number of spaces per indentation level */
  indentationSize?: number;
  /** Whether to extract operator properties from brackets */
  extractProperties?: boolean;
}
