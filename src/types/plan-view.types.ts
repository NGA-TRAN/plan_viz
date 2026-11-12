import type { ConverterConfig } from '../services/converter.service';
import type { ParserConfig } from './execution-plan.types';
import type { PlanDocument } from './plan-document.types';
import type { ExcalidrawData } from './excalidraw.types';

export type PaletteId = 'orange' | 'blue' | 'purple' | 'spectrum';
export type MetricDisplay = 'off' | 'labels' | 'heatmap';
export type StructureDisplay = 'off' | 'explain';
export type Knowledge<T> =
  | { state: 'known'; value: T; evidenceIds: readonly string[] }
  | { state: 'unknown'; reason: string }
  | { state: 'not-applicable' };
export interface SourceSpan { start: number; end: number }
export interface InputSelection { section?: number; variant?: string }
export interface ProfileOptions {
  operatorProfile?: string;
  metricProfile?: string;
  exportProfile?: string;
}
export interface DeclaredProvenance {
  engine?: string;
  revision?: string;
  exportFormat?: string;
  runId?: string;
  executionState?: 'running' | 'completed' | 'failed' | 'cancelled' | 'unknown';
  note: string;
}
export interface PlanInspectionOptions {
  parser?: ParserConfig;
  input?: InputSelection;
  interpretation?: ProfileOptions;
  /** Always caller-declared, never upgraded to verified provenance. */
  provenance?: DeclaredProvenance;
}
export type MetricViewOptions =
  | { display: 'off'; metric?: never; palette?: never; cohort?: never }
  | { display: 'labels'; metric: string; cohort?: string; palette?: never }
  | { display: 'heatmap'; metric: string; cohort?: string; palette?: PaletteId };
export interface PlanAnalysisOptions extends PlanInspectionOptions {
  metrics?: MetricViewOptions;
  structure?: StructureDisplay;
}
export type PlanViewOptions = PlanAnalysisOptions & Pick<ConverterConfig, 'generator' | 'distributed'>;

export interface Diagnostic {
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  sourceIds: readonly string[];
  spans: readonly SourceSpan[];
}
export type PlanViewErrorCode = 'INVALID_OPTIONS' | 'INVALID_SECTION' | 'INVALID_VARIANT'
  | 'UNSUPPORTED_VARIANT' | 'SELECTION_REQUIRED' | 'INVALID_PLAN' | 'UNKNOWN_METRIC'
  | 'METRIC_SCOPE_MISMATCH' | 'INVALID_COHORT' | 'UNKNOWN_PROFILE' | 'HASH_UNAVAILABLE';
export interface VariantDescriptor {
  id: string;
  label: string;
  kind: 'physical' | 'logical' | 'unknown';
  spans: readonly SourceSpan[];
  normalizedText: string;
  sourceMap: readonly { normalized: SourceSpan; original: readonly SourceSpan[] }[];
}
export interface SectionDescriptor {
  id: string;
  number: number;
  title: string;
  spans: readonly SourceSpan[];
  variants: readonly VariantDescriptor[];
}
export interface RawField {
  id: string;
  sectionId: string | null;
  variantId: string | null;
  sourceId: string | null;
  stageId: string | null;
  name: string;
  rawValue: string;
  spans: readonly SourceSpan[];
}
export interface CapturedInput {
  id: string;
  contentHash: string;
  parserSchemaVersion: 1;
  originalText: string;
  sections: readonly SectionDescriptor[];
  rawFields: readonly RawField[];
  callerProvenance: DeclaredProvenance | null;
}
export interface SelectedPlan { sectionId: string; section: number; variantId: string }
export interface SourceNodeRecord {
  id: string;
  operator: string;
  sourcePath: readonly number[];
  stage: { kind: 'single-tree' | 'coordinator' | 'stage' | 'recorded'; id: string | null };
  spans: readonly SourceSpan[];
  childIds: readonly string[];
}
export interface InstanceRecord {
  id: string;
  sourceId: string;
  stageTask: Knowledge<number>;
  effectiveContext: Knowledge<{ index: number; count: number }>;
  attempt: Knowledge<string>;
}
export interface SourceIndex {
  nodes: readonly SourceNodeRecord[];
  instances: readonly InstanceRecord[];
}
export type ObservationOwner =
  | { kind: 'operator'; sourceId: string; scopeId: string }
  | { kind: 'instance'; sourceId: string; instanceId: string; scopeId: string }
  | { kind: 'stage' | 'query'; scopeId: string }
  | { kind: 'unresolved'; sourceId: string | null; reason: string };
export interface EvidenceRecord {
  id: string;
  origin: 'input' | 'caller' | 'contract' | 'derived';
  kind: 'printed' | 'declared' | 'measurement' | 'estimate' | 'inference';
  sourceIds: readonly string[];
  spans: readonly SourceSpan[];
  rawFieldIds: readonly string[];
  dependsOn: readonly string[];
  profileId: string | null;
  description: string;
}
export interface NormalizedValue {
  /** Canonical decimal string. No bigint or floating-point conversion in JSON. */
  decimal: string;
  unit: 'ns' | 'byte' | 'count';
  precision: 'exact-token' | 'rounded-token';
}
export interface MetricObservation {
  id: string;
  metric: string;
  raw: string;
  labels: readonly { name: string; rawValue: string }[];
  owner: ObservationOwner;
  value: NormalizedValue | null;
  status: 'typed' | 'raw-only' | 'invalid' | 'conflicting';
  reasons: readonly string[];
  completeness: 'complete' | 'partial' | 'unknown';
  interpretation: 'matched-metadata' | 'assumed-profile' | 'reported-only' | 'unknown';
  producerReduction: Knowledge<'sum' | 'max' | 'min' | 'none' | 'other'>;
  window: Knowledge<string>;
  attempt: Knowledge<string>;
  evidenceIds: readonly string[];
}
export interface CohortDescriptor {
  id: string;
  label: string;
  unit: NormalizedValue['unit'];
  definitionId: string;
  scopeDescription: string;
  interpretation: MetricObservation['interpretation'];
  observationIds: readonly string[];
  completeness: MetricObservation['completeness'];
}
export interface MetricAvailability {
  name: string;
  label: string;
  definitionStatus: 'supported' | 'raw-only';
  placement: 'operator' | 'query-summary' | 'unresolved';
  present: boolean;
  reportedCount: number;
  comparableCount: number;
  invalidCount: number;
  notReportedNodeCount: number;
  availableDisplays: readonly Exclude<MetricDisplay, 'off'>[];
  reasons: readonly string[];
  cohorts: readonly CohortDescriptor[];
}
export interface InspectionBase {
  schemaVersion: 1;
  input: CapturedInput;
  evidence: readonly EvidenceRecord[];
  diagnostics: readonly Diagnostic[];
}
export interface ReadyPlanInspection extends InspectionBase {
  status: 'ready';
  selection: SelectedPlan;
  document: PlanDocument;
  index: SourceIndex;
  observations: readonly MetricObservation[];
  metrics: readonly MetricAvailability[];
}
export interface UnselectedPlanInspection extends InspectionBase {
  status: 'selection-required';
  selection: null;
  document: null;
  index: null;
  observations: readonly [];
  metrics: readonly [];
}
export type PlanInspection = ReadyPlanInspection | UnselectedPlanInspection;
export interface RankedMetricValue {
  observationIds: readonly string[];
  owner: ObservationOwner;
  raw: readonly string[];
  value: NormalizedValue;
  rank: number;
  /** Numeric approximation for painting only; never used for exact ranking. */
  intensity: number;
  color: string | null;
}
export interface MetricCohortReport {
  cohort: CohortDescriptor;
  ranking: readonly RankedMetricValue[];
  legend: { scale: 'linear'; minimum: '0'; maximum: NormalizedValue; allZero: boolean;
    palette: PaletteId | null;
    /** When present, exact zero has a separate swatch and stops describe positive values only. */
    zeroColor?: string;
    stops: readonly { position: number; color: string }[] };
  coverage: { observed: number; expected: number | null; complete: boolean | null };
  subtotal: { value: NormalizedValue; evidenceIds: readonly string[] } | null;
}
export interface MetricViewReport {
  display: MetricDisplay;
  metric: string | null;
  palette: PaletteId | null;
  status: 'off' | 'ready' | 'not-reported' | 'incomparable' | 'cohort-required';
  selectedCohort: string | null;
  cohorts: readonly MetricCohortReport[];
  unrankedObservationIds: readonly string[];
  notReportedSourceIds: readonly string[];
  queryObservationIds: readonly string[];
}
export interface StructuralFinding {
  id: string;
  ruleId: string;
  subject: ObservationOwner;
  property: 'waiting' | 'retained-state' | 'decomposition' | 'layout';
  assessment: 'established' | 'conditional' | 'unknown' | 'not-applicable';
  summary: string;
  explanation: string;
  evidenceIds: readonly string[];
  dependencies: readonly { sourceId: string; inputIndex: number | null }[];
  assumptions: readonly string[];
  missingEvidence: readonly string[];
}
export interface StructureReport {
  display: StructureDisplay;
  findings: readonly StructuralFinding[];
  unknownSourceIds: readonly string[];
}
export interface PlanAnalysisResult {
  schemaVersion: 1;
  inspection: ReadyPlanInspection;
  metrics: MetricViewReport;
  structure: StructureReport;
  diagnostics: readonly Diagnostic[];
}
export interface RenderReference {
  sourceId: string;
  instanceId: string | null;
  status: 'visible' | 'omitted-task' | 'no-shape';
  elementIds: readonly string[];
  groupIds: readonly string[];
  annotationIds: readonly string[];
  reason: string | null;
}
export interface PlanViewResult extends PlanAnalysisResult {
  scene: ExcalidrawData;
  renderIndex: readonly RenderReference[];
}
export interface PlanViewCapabilities {
  schemaVersion: 1;
  displays: readonly { id: MetricDisplay; label: string }[];
  defaultDisplay: 'off';
  /** Exact zero uses `zero`; positive values interpolate through positiveStops, or low/high when absent. */
  palettes: readonly { id: PaletteId; label: string; zero: string; low: string; high: string;
    positiveStops?: readonly { position: number; color: string }[] }[];
  defaultHeatmapPalette: 'orange';
  metrics: readonly { name: string; label: string; kind: 'time' | 'bytes' | 'count'; placement: 'operator' | 'query-summary' }[];
  profiles: readonly { id: string; component: 'operator' | 'metric' | 'exporter';
    label: string; sources: readonly { repository: string; revision: string; paths: readonly string[] }[];
    limitations: readonly string[] }[];
}
