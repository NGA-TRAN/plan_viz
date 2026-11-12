import { MetricViewOptions, MetricViewReport, NormalizedValue, PaletteId, ReadyPlanInspection } from '../../types/plan-view.types';
import { PlanViewError } from '../../inspection/errors';
import { palettes } from './catalog';
import { compareDecimal, ratio } from './values';

function paletteColor(id: PaletteId, intensity: number, isZero: boolean): string {
  const palette = palettes.find((p) => p.id === id)!;
  // Decide zero from the exact value: a small positive ratio may round to zero.
  if (isZero) return palette.zero;
  const channel = (color: string, start: number): number => parseInt(color.slice(start, start + 2), 16);
  return '#' + [1, 3, 5].map((start) => Math.round(channel(palette.low, start) + intensity * (channel(palette.high, start) - channel(palette.low, start))).toString(16).padStart(2, '0')).join('');
}

export function metricView(inspection: ReadyPlanInspection, options?: MetricViewOptions): MetricViewReport {
  const queryObservationIds = inspection.observations.filter((o) => o.owner.kind === 'query').map((o) => o.id);
  if (!options || options.display === 'off') {
    return { display: 'off', metric: null, palette: null, status: 'off', selectedCohort: null,
      cohorts: [], unrankedObservationIds: [], notReportedSourceIds: [], queryObservationIds };
  }
  const available = inspection.metrics.find((m) => m.name === options.metric);
  if (!available) throw new PlanViewError('UNKNOWN_METRIC', 'Unknown metric: ' + options.metric);
  if (available.placement === 'query-summary') throw new PlanViewError('METRIC_SCOPE_MISMATCH', options.metric + ' belongs in query details, not an operator heatmap.');
  if (options.cohort !== undefined && !available.cohorts.some((c) => c.id === options.cohort)) throw new PlanViewError('INVALID_COHORT', 'Unknown comparison cohort: ' + options.cohort);
  const palette = options.display === 'heatmap' ? options.palette ?? 'orange' : null;
  const observations = inspection.observations.filter((o) => o.metric === options.metric);
  const present = new Set(observations.flatMap((o) => 'sourceId' in o.owner && o.owner.sourceId ? [o.owner.sourceId] : []));
  const selectedCohort = options.cohort ?? (available.cohorts.length === 1 ? available.cohorts[0].id : null);
  const cohorts = available.cohorts.map((cohort) => {
    const candidates = observations.filter((o) => cohort.observationIds.includes(o.id));
    // Equal duplicate reports are one ranked value, but all original evidence IDs survive.
    const groups = new Map<string, typeof candidates>();
    for (const o of candidates) {
      const key = JSON.stringify([o.owner, o.labels, o.value!.decimal, o.value!.unit]);
      const group = groups.get(key) ?? []; group.push(o); groups.set(key, group);
    }
    const sorted = [...groups.values()].map((group) => {
      // Equal normalized values can come from exact and rounded tokens. Keep the
      // original precision on each observation and qualify their combined value.
      const value: NormalizedValue = { ...group[0].value!, precision: group.some((o) => o.value!.precision === 'rounded-token') ? 'rounded-token' : 'exact-token' };
      return { group, value };
    }).sort((a, b) => compareDecimal(b.value.decimal, a.value.decimal));
    const maximum = sorted[0].value;
    const allZero = compareDecimal(maximum.decimal, '0') === 0;
    const ranking = sorted.map(({ group, value }, i) => {
      const intensity = ratio(value.decimal, maximum.decimal);
      const rank = sorted.findIndex((g) => compareDecimal(g.value.decimal, value.decimal) === 0) + 1;
      return { observationIds: group.map((o) => o.id), owner: group[0].owner, raw: group.map((o) => o.raw), value, rank: rank || i + 1, intensity,
        color: palette && cohort.id === selectedCohort ? paletteColor(palette, intensity, compareDecimal(value.decimal, '0') === 0) : null };
    });
    return { cohort, ranking, legend: { scale: 'linear' as const, minimum: '0' as const, maximum, allZero, palette,
      stops: palette ? [0, .25, .5, .75, 1].map((position) => ({ position, color: paletteColor(palette, position, allZero || position === 0) })) : [] },
    coverage: { observed: ranking.length, expected: null, complete: null }, subtotal: null };
  });
  return { display: options.display, metric: options.metric, palette, selectedCohort,
    status: !observations.length ? 'not-reported' : !cohorts.length ? 'incomparable' : !selectedCohort ? 'cohort-required' : 'ready', cohorts,
    unrankedObservationIds: observations.filter((o) => !available.cohorts.some((c) => c.observationIds.includes(o.id))).map((o) => o.id),
    notReportedSourceIds: inspection.index.nodes.filter((n) => !present.has(n.id)).map((n) => n.id), queryObservationIds };
}
