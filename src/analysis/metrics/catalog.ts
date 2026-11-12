import { PlanViewCapabilities } from '../../types/plan-view.types';

export const METRIC_PROFILE = 'datafusion-7865139';
export const OPERATOR_PROFILE = 'datafusion-physical-7865139';
export const EXPORT_PROFILE = 'distributed-b32ee66';
export const definitions: PlanViewCapabilities['metrics'] = [
  { name: 'elapsed_compute', label: 'Elapsed compute', kind: 'time', placement: 'operator' },
  { name: 'output_rows', label: 'Output rows', kind: 'count', placement: 'operator' },
  { name: 'output_batches', label: 'Output batches', kind: 'count', placement: 'operator' },
  { name: 'output_bytes', label: 'Output bytes', kind: 'bytes', placement: 'operator' },
  { name: 'build_mem_used', label: 'Join build memory', kind: 'bytes', placement: 'operator' },
  { name: 'peak_mem_used', label: 'Aggregate peak memory', kind: 'bytes', placement: 'operator' },
  { name: 'max_mem_used', label: 'Buffer maximum memory', kind: 'bytes', placement: 'operator' },
  { name: 'spill_count', label: 'Spill count', kind: 'count', placement: 'operator' },
  { name: 'spilled_bytes', label: 'Spilled bytes', kind: 'bytes', placement: 'operator' },
  { name: 'spilled_rows', label: 'Spilled rows', kind: 'count', placement: 'operator' },
  { name: 'query_cpu_time', label: 'Query CPU time', kind: 'time', placement: 'query-summary' },
  { name: 'query_cpu_sample_count', label: 'Query CPU samples', kind: 'count', placement: 'query-summary' },
];
const spectrumStops = ['#8db8f2', '#64cdd0', '#7fd18c', '#ead568', '#f5b65f', '#ed8075']
  .map((color, index, colors) => ({ position: index / (colors.length - 1), color }));
export const palettes: PlanViewCapabilities['palettes'] = [
  { id: 'orange', label: 'Orange', zero: '#ffffff', low: '#fff8ed', high: '#ffc078' },
  { id: 'blue', label: 'Blue', zero: '#ffffff', low: '#edf6ff', high: '#91caff' },
  { id: 'purple', label: 'Purple', zero: '#ffffff', low: '#f7f0ff', high: '#c4a1f2' },
  { id: 'spectrum', label: 'Spectrum', zero: '#ffffff', low: spectrumStops[0].color,
    high: spectrumStops[spectrumStops.length - 1].color, positiveStops: spectrumStops },
];
const datafusionSource = { repository: 'https://github.com/DataDog/datafusion', revision: '78651394b6804e2fe9ea99925395ef9d3616aba5' };
export const profiles: PlanViewCapabilities['profiles'] = [
  { id: METRIC_PROFILE, component: 'metric', label: 'DataFusion metric definitions (7865139)', sources: [
    { ...datafusionSource, paths: ['datafusion/physical-expr-common/src/metrics/value.rs', 'datafusion/common/src/display/human_readable.rs', 'datafusion/physical-plan/src/joins/utils.rs', 'datafusion/physical-plan/src/aggregates/grouped_hash_stream.rs', 'datafusion/physical-plan/src/buffer.rs'] },
    { repository: 'https://github.com/DataDog/datafusion-fairness', revision: '873f4406a3900c6d3ad846179f117527167731ad', paths: ['src/datafusion/query_cpu_metrics.rs'] },
  ], limitations: ['Caller-selected assumption, not verified producer metadata.', 'Decimal count suffixes; binary KB/MB/GB/TB. Reported memory peaks are not synchronized query peaks.'] },
  { id: OPERATOR_PROFILE, component: 'operator', label: 'Physical operators (DataFusion 7865139; Distributed b32ee66)', sources: [
    { ...datafusionSource, paths: ['datafusion/physical-plan/src/projection.rs', 'datafusion/physical-plan/src/filter.rs', 'datafusion/physical-plan/src/aggregates/mod.rs', 'datafusion/physical-plan/src/aggregates/grouped_hash_stream.rs', 'datafusion/physical-plan/src/joins/hash_join/stream.rs', 'datafusion/physical-plan/src/sorts/sort.rs', 'datafusion/physical-plan/src/buffer.rs', 'datafusion/physical-plan/src/repartition/mod.rs', 'datafusion/physical-plan/src/coalesce_partitions.rs', 'datafusion/physical-plan/src/sorts/sort_preserving_merge.rs'] },
    { repository: 'https://github.com/datafusion-contrib/datafusion-distributed', revision: 'b32ee66e5f12227a5fe8e8444a022991da0758ea', paths: ['src/execution_plans/network_coalesce.rs', 'src/execution_plans/network_shuffle.rs', 'src/execution_plans/network_broadcast.rs'] },
  ], limitations: ['Conditional on the selected implementation; custom operators and UDF behavior remain unknown.', 'Physical plans only; no query-wide admission verdict.'] },
  { id: EXPORT_PROFILE, component: 'exporter', label: 'Distributed per-task metrics (b32ee66)', sources: [
    { repository: 'https://github.com/datafusion-contrib/datafusion-distributed', revision: 'b32ee66e5f12227a5fe8e8444a022991da0758ea', paths: ['src/metrics/task_metrics_rewriter.rs', 'src/metrics/mod.rs', 'src/explain_analyze.rs'] },
  ], limitations: ['Assumes this exporter and stage-task key domain; does not establish run/attempt identity.', 'Never treats a scalar copied to specialized tasks as a per-task measurement.'] },
];

export function getPlanViewCapabilities(): PlanViewCapabilities {
  return structuredClone({ schemaVersion: 1, displays: [{ id: 'off', label: 'Current plan' }, { id: 'labels', label: 'Labels only' }, { id: 'heatmap', label: 'Labels + heatmap' }],
    defaultDisplay: 'off', palettes, defaultHeatmapPalette: 'orange', metrics: definitions, profiles });
}
