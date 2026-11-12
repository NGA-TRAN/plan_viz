import { PlanAnalysisOptions, PlanAnalysisResult, PlanInspection, PlanInspectionOptions, ReadyPlanInspection, PlanViewOptions, PlanViewResult, EvidenceRecord, Diagnostic } from '../types/plan-view.types';
import { PlanDocument } from '../types/plan-document.types';
import { captureInput } from '../inspection/capture';
import { indexPlan, IndexedPlan } from '../inspection/source-index';
import { PlanViewError } from '../inspection/errors';
import { validateOptions } from '../inspection/options';
import { PlanDocumentParser } from '../parsers/plan-document.parser';
import { collectObservations, discoverMetrics } from '../analysis/metrics/observations';
import { metricView } from '../analysis/metrics/view';
import { structuralAnalysis } from '../analysis/structure/analyze';
import { ExcalidrawGenerator } from '../generators/excalidraw.generator';
import { DistributedExcalidrawGenerator } from '../generators/distributed-excalidraw.generator';
import { ExcalidrawElement } from '../types/excalidraw.types';
import { ExecutionPlanNode } from '../types/execution-plan.types';
import { renderReferences } from '../generators/annotations/render-index';
import { annotate } from '../generators/annotations/overlays';

interface InspectionWork { inspection: PlanInspection; indexed?: IndexedPlan }

function parsePhysical(text: string, options: PlanInspectionOptions): PlanDocument {
  const document = new PlanDocumentParser(options.parser).parse(text);
  const validate = (node: ExecutionPlanNode): void => {
    if (options.parser?.extractProperties !== false && !/^[A-Za-z_]\w*(?:\([^\n]*\))?$/.test(node.operator)) throw new Error('Invalid operator in selected physical plan.');
    node.children.forEach(validate);
  };
  if (document.kind === 'single') validate(document.root);
  else document.stages.forEach((stage) => validate(stage.root));
  return document;
}

async function inspect(text: string, options: PlanInspectionOptions): Promise<InspectionWork> {
  validateOptions(options);
  const input = await captureInput(text, options.provenance);
  if (!input.sections.length) throw new PlanViewError('INVALID_PLAN', 'Execution plan text cannot be empty');
  const unselected: InspectionWork = { inspection: { schemaVersion: 1, status: 'selection-required', input, selection: null, document: null, index: null, observations: [], metrics: [], evidence: [], diagnostics: [] } };
  if (options.input?.section === undefined && input.sections.length > 1) return unselected;
  const section = input.sections[(options.input?.section ?? 1) - 1];
  if (!section) throw new PlanViewError('INVALID_SECTION', 'Section is not in the captured input.');
  const variant = options.input?.variant === undefined ? section.variants.find((v) => v.kind === 'physical') : section.variants.find((v) => v.id === options.input!.variant);
  if (!variant) {
    if (options.input?.variant !== undefined) throw new PlanViewError('INVALID_VARIANT', 'Variant is not in the selected section.');
    return unselected;
  }
  if (variant.kind !== 'physical') throw new PlanViewError('UNSUPPORTED_VARIANT', 'Only physical plan variants can be analyzed.');
  const selection = { sectionId: section.id, section: section.number, variantId: variant.id };
  let document: PlanDocument;
  let indexed: IndexedPlan;
  try {
    document = parsePhysical(variant.normalizedText, options);
    indexed = indexPlan(input, selection, variant, document);
  } catch (error) {
    throw new PlanViewError('INVALID_PLAN', error instanceof Error ? error.message : 'Invalid selected physical plan.');
  }
  const scopeId = input.id + ':' + section.id + ':' + variant.id;
  const variantDiagnostics: Diagnostic[] = [];
  for (const alternative of section.variants.filter((v) => v.kind === 'physical' && v.id !== variant.id)) {
    try {
      parsePhysical(alternative.normalizedText, options);
    } catch (error) {
      variantDiagnostics.push({ code: 'unselected-variant-invalid', severity: 'warning', sourceIds: [], spans: alternative.spans,
        message: 'Unselected ' + alternative.id + ' retained as raw input: ' + (error instanceof Error ? error.message : 'invalid physical syntax') });
    }
  }
  const { observations, evidence } = collectObservations(indexed, scopeId, options);
  const declarations: EvidenceRecord[] = Object.values(options.interpretation ?? {}).filter((id): id is string => id !== undefined).map((id) => ({
    id: 'profile:' + id, origin: 'caller', kind: 'declared', sourceIds: [], spans: [], rawFieldIds: [], dependsOn: [], profileId: id,
    description: 'Caller assumes profile ' + id + '. This does not verify the input producer.' }));
  if (options.provenance) {
    declarations.push({ id: 'caller-provenance', origin: 'caller', kind: 'declared', sourceIds: [], spans: [], rawFieldIds: [], dependsOn: [],
      profileId: null, description: options.provenance.note });
  }
  const inspection: ReadyPlanInspection = { schemaVersion: 1, status: 'ready', input: { ...input, rawFields: indexed.rawFields }, selection, document, index: indexed.index,
    observations, metrics: discoverMetrics(observations, indexed.index), evidence: [...declarations, ...indexed.evidence, ...evidence],
    diagnostics: [...variantDiagnostics, ...(indexed.analysis?.diagnostics ?? []).map((d): Diagnostic => ({ code: d.code, severity: 'warning', message: d.message, sourceIds: [], spans: [] }))] };
  return { inspection, indexed };
}

export async function inspectPlan(text: string, options: PlanInspectionOptions = {}): Promise<PlanInspection> {
  return (await inspect(text, options)).inspection;
}

export async function analyzePlan(text: string, options: PlanAnalysisOptions = {}): Promise<PlanAnalysisResult> {
  validateOptions(options);
  const { inspection, indexed } = await inspect(text, options);
  if (inspection.status !== 'ready') throw new PlanViewError('SELECTION_REQUIRED', 'Select a section and physical variant before analysis.');
  return { schemaVersion: 1, inspection, metrics: metricView(inspection, options.metrics),
    structure: structuralAnalysis(inspection, indexed!, options), diagnostics: inspection.diagnostics };
}

export async function convertPlanView(text: string, options: PlanViewOptions = {}): Promise<PlanViewResult> {
  validateOptions(options);
  const { inspection, indexed } = await inspect(text, options);
  if (inspection.status !== 'ready') throw new PlanViewError('SELECTION_REQUIRED', 'Select a section and physical variant before conversion.');
  const result: PlanAnalysisResult = { schemaVersion: 1, inspection, metrics: metricView(inspection, options.metrics),
    structure: structuralAnalysis(inspection, indexed!, options), diagnostics: inspection.diagnostics };
  const shapes = new Map<ExecutionPlanNode, ExcalidrawElement>();
  const document = inspection.document;
  const scene = document.kind === 'single' ? new ExcalidrawGenerator(options.generator).generate(document.root, undefined, shapes) :
    new DistributedExcalidrawGenerator(options.generator, options.distributed).generate(document, indexed!.analysis!, (node, shape) => shapes.set(node, shape));
  const renderIndex = renderReferences(indexed!, shapes);
  annotate(scene, result, renderIndex);
  return { ...result, scene, renderIndex };
}
