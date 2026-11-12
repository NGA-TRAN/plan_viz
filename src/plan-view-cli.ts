import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from 'commander';
import { ConverterConfig } from './services/converter.service';
import { analyzePlan, convertPlanView, inspectPlan } from './services/plan-view.service';
import { getPlanViewCapabilities } from './analysis/metrics/catalog';
import { MetricViewOptions, PlanViewOptions } from './types/plan-view.types';
import { PlanViewError } from './inspection/errors';

export interface ViewCliOptions {
  input?: string; output?: string; variant?: string; metricDisplay?: string; metric?: string; palette?: string;
  metricCohort?: string; structure?: string; operatorProfile?: string; metricProfile?: string; exportProfile?: string;
  capabilities?: boolean; inspect?: boolean; analyze?: boolean; report?: string;
}
const viewKeys = ['variant', 'metricDisplay', 'metric', 'palette', 'metricCohort', 'structure', 'operatorProfile', 'metricProfile', 'exportProfile', 'capabilities', 'inspect', 'analyze', 'report'];
export function hasViewOptions(program: Command): boolean {
  return viewKeys.some((key) => program.getOptionValueSource(key) === 'cli');
}
function invalid(message: string): never {
  throw new PlanViewError('INVALID_OPTIONS', message);
}
function metricOptions(options: ViewCliOptions): MetricViewOptions {
  const display = options.metricDisplay ?? 'off';
  if (display === 'off') {
    if (options.metric !== undefined || options.palette !== undefined || options.metricCohort !== undefined) invalid('Choose labels or heatmap before selecting a metric.');
    return { display: 'off' };
  }
  if (!options.metric) invalid('--metric is required for enabled metric display.');
  if (display === 'labels') {
    if (options.palette !== undefined) invalid('--palette requires heatmap display.');
    return { display, metric: options.metric, cohort: options.metricCohort };
  }
  if (display !== 'heatmap') invalid('Metric display must be off, labels or heatmap.');
  const palette = options.palette ?? 'orange';
  if (palette !== 'orange' && palette !== 'blue' && palette !== 'purple') invalid('Palette must be orange, blue or purple.');
  return { display, metric: options.metric, cohort: options.metricCohort, palette };
}

/** Returns before reading stdin in capabilities mode. All other modes share the library core. */
export async function runPlanViewCli(program: Command, options: ViewCliOptions, config: ConverterConfig): Promise<void> {
  const explicit = (key: string): boolean => program.getOptionValueSource(key) === 'cli';
  const render = ['allWorkers', 'nodeWidth', 'nodeHeight', 'verticalSpacing', 'horizontalSpacing'];
  const view = ['metricDisplay', 'metric', 'palette', 'metricCohort', 'structure'];
  if ([options.capabilities, options.inspect, options.analyze].filter(Boolean).length > 1) invalid('Choose only one of --capabilities, --inspect or --analyze.');
  if (options.capabilities && ['input', 'section', ...render, ...viewKeys.filter((k) => k !== 'capabilities')].some(explicit)) invalid('--capabilities does not accept input, selection or view options.');
  if (options.inspect && [...view, ...render, 'report'].some(explicit)) invalid('--inspect does not accept rendering or view options.');
  if (options.analyze && [...render, 'report'].some(explicit)) invalid('--analyze does not accept rendering or report-file options.');
  if (options.report !== undefined) {
    if (options.report === '-' || !options.report.trim()) invalid('--report requires a file path.');
    const destination = path.resolve(options.report);
    const identity = (file: string): string => fs.existsSync(file) ? fs.realpathSync(file) : path.resolve(file);
    if ([options.input, options.output].some((file) => file && identity(file) === identity(destination))) invalid('Report, input and scene output must have distinct paths.');
    if (options.input && options.output && identity(options.input) === identity(options.output)) invalid('Input and scene output must have distinct paths.');
  }
  let payload: unknown;
  let report: string | undefined;
  if (options.capabilities) payload = getPlanViewCapabilities();
  else {
    if (options.structure !== undefined && options.structure !== 'off' && options.structure !== 'explain') invalid('Structure must be off or explain.');
    const request: PlanViewOptions = { ...config, input: { ...config.input, variant: options.variant },
      metrics: metricOptions(options), structure: options.structure,
      interpretation: { operatorProfile: options.operatorProfile, metricProfile: options.metricProfile, exportProfile: options.exportProfile } };
    const text = fs.readFileSync(options.input ? path.resolve(options.input) : 0, 'utf8');
    if (options.inspect) payload = await inspectPlan(text, request);
    else if (options.analyze) payload = await analyzePlan(text, request);
    else {
      const result = await convertPlanView(text, request);
      payload = result.scene;
      if (options.report) {
        const { scene: _scene, ...detail } = result;
        void _scene;
        report = JSON.stringify(detail, null, 2);
      }
      for (const diagnostic of result.diagnostics) console.error(diagnostic.code + ': ' + diagnostic.message);
    }
  }
  const json = JSON.stringify(payload, null, 2);
  // Serialize both before writing. Sidecar write failures must not emit successful scene JSON to stdout.
  if (report !== undefined) fs.writeFileSync(options.report!, report, 'utf8');
  if (options.output) {
    fs.writeFileSync(path.resolve(options.output), json, 'utf8');
    console.log('Successfully wrote ' + (options.capabilities || options.inspect || options.analyze ? 'JSON' : 'Excalidraw JSON') + ' to: ' + path.resolve(options.output));
  } else console.log(json);
}
