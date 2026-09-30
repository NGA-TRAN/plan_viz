import { ExecutionPlanNode } from './execution-plan.types';

export interface TaskContext { index: number; count: number }
export interface ChildAssignment { child: number; context: TaskContext }
export interface PlanNode extends ExecutionPlanNode {
  children: PlanNode[];
  id: string;
  line: number;
  raw: string;
  variant?: number;
  assignments?: Record<number, ChildAssignment[]>;
  network?: { producer: string; boundary: string };
  context?: TaskContext;
  inactive?: number[];
}
export interface PlanStage {
  id: string;
  tasks: number;
  printedPartitions?: number;
  root: PlanNode;
}
export interface PlanDiagnostic {
  code: string;
  message: string;
  node?: string;
}
export type PlanDocument =
  | { kind: 'single'; root: ExecutionPlanNode; text: string }
  | { kind: 'distributed' | 'recorded'; stages: PlanStage[]; text: string; diagnostics: PlanDiagnostic[] };
export interface PlanSection { title: string; text: string }
export interface PartitionCount {
  value?: number;
  assigned?: number;
  evidence: string;
}
export interface TaskPlan {
  stage: string;
  task: number;
  root: PlanNode;
  counts: Map<ExecutionPlanNode, PartitionCount>;
}
export interface NetworkConnection {
  producer: string;
  consumer: string;
  boundary: string;
  operator: string;
  pairs: Array<{ from: number; to: number; streams?: number }>;
  routingKnown: boolean;
}
export interface DistributedAnalysis {
  tasks: TaskPlan[];
  connections: NetworkConnection[];
  diagnostics: PlanDiagnostic[];
}
