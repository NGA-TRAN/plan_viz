import { PlanViewOptions } from '../types/plan-view.types';
import { palettes, profiles } from '../analysis/metrics/catalog';
import { PlanViewError } from './errors';

function object(value: unknown): boolean {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function fail(message: string): never {
  throw new PlanViewError('INVALID_OPTIONS', message);
}

export function validateOptions(options: PlanViewOptions): void {
  if (!object(options)) fail('Options must be an object.');
  for (const key of ['input', 'parser', 'interpretation', 'provenance', 'generator', 'distributed'] as const) {
    if (options[key] !== undefined && !object(options[key])) fail(key + ' must be an object.');
  }
  if (options.input?.section !== undefined && (!Number.isInteger(options.input.section) || options.input.section < 1)) {
    throw new PlanViewError('INVALID_SECTION', 'Section must be a positive integer.');
  }
  if (options.input?.variant !== undefined && (typeof options.input.variant !== 'string' || !options.input.variant)) throw new PlanViewError('INVALID_VARIANT', 'Variant must be an ID from input inspection.');
  if (options.structure !== undefined && !['off', 'explain'].includes(options.structure)) fail('Structure must be off or explain.');
  const metrics = options.metrics;
  if (metrics !== undefined) {
    if (!object(metrics) || !['off', 'labels', 'heatmap'].includes(metrics.display)) fail('Metric display must be off, labels or heatmap.');
    if (metrics.display === 'off') {
      if (metrics.metric !== undefined || metrics.palette !== undefined || metrics.cohort !== undefined) fail('Off mode cannot select a metric, palette or cohort.');
    } else {
      if (typeof metrics.metric !== 'string' || !metrics.metric.trim()) fail('A metric name is required.');
      if (metrics.cohort !== undefined && (typeof metrics.cohort !== 'string' || !metrics.cohort)) fail('Cohort must be a nonempty ID.');
      if (metrics.display === 'labels' && metrics.palette !== undefined) fail('Palette applies only to heatmap mode.');
      if (metrics.display === 'heatmap' && metrics.palette !== undefined && !palettes.some((p) => p.id === metrics.palette)) fail('Unknown palette.');
    }
  }
  for (const [key, component] of [['operatorProfile', 'operator'], ['metricProfile', 'metric'], ['exportProfile', 'exporter']] as const) {
    const id = options.interpretation?.[key];
    if (id !== undefined && !profiles.some((p) => p.id === id && p.component === component)) throw new PlanViewError('UNKNOWN_PROFILE', 'Unknown ' + key + ': ' + id);
  }
  if (options.provenance) {
    if (typeof options.provenance.note !== 'string' || !options.provenance.note.trim()) fail('Declared provenance requires a note.');
    for (const key of ['engine', 'revision', 'exportFormat', 'runId'] as const) if (options.provenance[key] !== undefined && typeof options.provenance[key] !== 'string') fail(key + ' must be text.');
    if (options.provenance.executionState !== undefined && !['running', 'completed', 'failed', 'cancelled', 'unknown'].includes(options.provenance.executionState)) fail('Invalid execution state.');
  }
}
