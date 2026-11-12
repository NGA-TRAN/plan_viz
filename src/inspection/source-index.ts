import { ExecutionPlanNode } from '../types/execution-plan.types';
import { DistributedAnalysis, PlanDocument, PlanNode } from '../types/plan-document.types';
import { CapturedInput, EvidenceRecord, InstanceRecord, RawField, SelectedPlan, SourceIndex, SourceNodeRecord, VariantDescriptor } from '../types/plan-view.types';
import { analyzeDistributed } from '../analysis/distributed-analysis';
import { preprocessExecutionPlanLines } from '../parsers/execution-plan-lines';
import { originalSpans, sourceLines } from './capture';
import { fieldTokens, metricTokens, FieldToken } from './fields';

export interface IndexedToken { token: FieldToken; source: SourceNodeRecord | null; stageId: string | null; field: RawField }
export interface IndexedPlan {
  index: SourceIndex;
  sourceByNode: Map<ExecutionPlanNode, SourceNodeRecord>;
  instanceByNode: Map<ExecutionPlanNode, InstanceRecord>;
  tokens: IndexedToken[];
  rawFields: RawField[];
  evidence: EvidenceRecord[];
  analysis?: DistributedAnalysis;
}

export function indexPlan(input: CapturedInput, selection: SelectedPlan, variant: VariantDescriptor, document: PlanDocument): IndexedPlan {
  const namespace = input.id + ':p1:' + selection.sectionId + ':' + selection.variantId;
  const nodes: SourceNodeRecord[] = [];
  const instances: InstanceRecord[] = [];
  const sourceByNode = new Map<ExecutionPlanNode, SourceNodeRecord>();
  const instanceByNode = new Map<ExecutionPlanNode, InstanceRecord>();
  const lines = sourceLines(variant.normalizedText);
  const singleTreeLines = document.kind === 'single' ? preprocessExecutionPlanLines(variant.normalizedText) : [];
  const lineSources = new Map<number, SourceNodeRecord>();
  let cursor = 0;
  const visit = (node: ExecutionPlanNode, path: number[], stage: SourceNodeRecord['stage']): void => {
    const id = namespace + ':' + (stage.id ?? 'tree') + ':' + (path.join('.') || 'root');
    let line: typeof lines[number] | undefined;
    if ('line' in node) line = lines[(node as PlanNode).line - 1];
    else {
      const parsedLine = singleTreeLines[cursor++];
      if (parsedLine) line = lines[parsedLine.lineNumber - 1];
    }
    const record: SourceNodeRecord = { id, operator: node.operator, sourcePath: path, stage,
      spans: line ? originalSpans(variant, line) : [], childIds: node.children.map((_, i) => namespace + ':' + (stage.id ?? 'tree') + ':' + [...path, i].join('.')) };
    nodes.push(record); sourceByNode.set(node, record);
    if (line) lineSources.set(line.start, record);
    node.children.forEach((child, i) => visit(child, [...path, i], stage));
  };
  if (document.kind === 'single') visit(document.root, [], { kind: 'single-tree', id: null });
  else document.stages.forEach((s) => visit(s.root, [], { kind: document.kind === 'recorded' ? 'recorded' : s.id === 'head' ? 'coordinator' : 'stage', id: s.id }));
  let analysis: DistributedAnalysis | undefined;
  if (document.kind !== 'single') {
    analysis = analyzeDistributed(document, (clone, source) => sourceByNode.set(clone, sourceByNode.get(source)!));
    for (const task of analysis.tasks) {
      const add = (node: PlanNode): void => {
        const source = sourceByNode.get(node)!;
        const context = node.context;
        const instance: InstanceRecord = { id: source.id + ':task:' + (document.kind === 'recorded' ? '?' : task.task) + ':context:' + (context ? context.index + '/' + context.count : '?'), sourceId: source.id,
          stageTask: document.kind === 'recorded' ? { state: 'unknown', reason: 'Recorded task identity is not printed.' } : { state: 'known', value: task.task, evidenceIds: [] },
          effectiveContext: context ? { state: 'known', value: context, evidenceIds: [] } : { state: 'unknown', reason: 'Effective task context is unavailable.' },
          attempt: { state: 'unknown', reason: 'No execution attempt identity is established.' } };
        instances.push(instance); instanceByNode.set(node, instance); node.children.forEach(add);
      };
      add(task.root);
    }
  }
  const rawFields: RawField[] = input.rawFields.map((field) => ({ ...field }));
  const tokens: IndexedToken[] = [];
  const evidence: EvidenceRecord[] = [];
  let stageId: string | null = null;
  for (const line of lines) {
    const header = line.text.match(/^\s*┌─+\s*(Distributed\w*Exec|Stage\s+(\d+))/);
    if (header) stageId = header[2] ?? 'head';
    const source = lineSources.get(line.start) ?? null;
    const ordinary = fieldTokens(line.text, line.start);
    const metrics = metricTokens(line.text, line.start);
    for (const token of [...ordinary, ...metrics]) {
      const spans = originalSpans(variant, token.span);
      const field = rawFields.find((f) => f.sectionId === selection.sectionId && f.variantId === selection.variantId && f.name === token.name &&
        f.spans[0]?.start === spans[0]?.start && f.spans.at(-1)?.end === spans.at(-1)?.end)!;
      field.sourceId = source?.id ?? null;
      field.stageId = stageId;
      if (metrics.includes(token)) tokens.push({ token, source, stageId, field });
    }
    if (source) {
      evidence.push({ id: 'source:' + source.id, origin: 'input', kind: 'printed', sourceIds: [source.id], spans: source.spans,
        rawFieldIds: rawFields.filter((f) => f.sourceId === source.id).map((f) => f.id), dependsOn: [], profileId: null, description: 'Printed operator and properties; execution provenance is not established.' });
    }
  }
  for (const field of rawFields.filter((f) => f.sectionId === selection.sectionId && f.name === 'Duration' && f.variantId === null)) {
    tokens.push({ token: { name: field.name, rawValue: field.rawValue, labels: [], span: field.spans[0] }, source: null, stageId: null, field });
  }
  if (document.kind !== 'single') {
    for (const stage of document.stages) {
      const header = lines.find((line) => stage.id === 'head' ? /^\s*┌─+\s*Distributed\w*Exec/.test(line.text) :
        new RegExp('^\\s*┌─+\\s*Stage\\s+' + stage.id + '\\b').test(line.text));
      evidence.push({ id: 'stage:' + namespace + ':' + stage.id, origin: 'input', kind: 'printed', sourceIds: [],
        spans: header ? originalSpans(variant, header) : [], rawFieldIds: rawFields.filter((f) => f.stageId === stage.id && f.sourceId === null).map((f) => f.id),
        dependsOn: [], profileId: null, description: header ? 'Printed stage header and task cardinality.' : 'Recorded plan; stage-task cardinality is unknown.' });
    }
    for (const instance of instances) {
      const source = nodes.find((n) => n.id === instance.sourceId)!;
      const ancestors = nodes.filter((n) => n.stage.id === source.stage.id && n.sourcePath.length <= source.sourcePath.length &&
        n.sourcePath.every((part, i) => part === source.sourcePath[i]));
      const id = 'instance:' + instance.id;
      evidence.push({ id, origin: 'derived', kind: 'inference', sourceIds: ancestors.map((n) => n.id), spans: ancestors.flatMap((n) => n.spans),
        rawFieldIds: [], dependsOn: ['stage:' + namespace + ':' + source.stage.id, ...ancestors.map((n) => 'source:' + n.id)], profileId: null,
        description: 'Stage task and effective child context follow printed stage cardinality and leaf/UNION assignments. They do not identify an execution attempt.' });
      if (instance.stageTask.state === 'known') instance.stageTask.evidenceIds = [id];
      if (instance.effectiveContext.state === 'known') instance.effectiveContext.evidenceIds = [id];
    }
  }
  return { index: { nodes, instances }, sourceByNode, instanceByNode, tokens, rawFields, evidence, analysis };
}
