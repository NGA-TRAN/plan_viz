import { IndexedPlan, IndexedToken } from '../../inspection/source-index';
import { mapEntries } from '../../inspection/fields';
import { CohortDescriptor, EvidenceRecord, MetricAvailability, MetricObservation, ObservationOwner, PlanInspectionOptions, SourceIndex } from '../../types/plan-view.types';
import { definitions, EXPORT_PROFILE, METRIC_PROFILE } from './catalog';
import { normalizeValue } from './values';

const unknown = { state: 'unknown' as const, reason: 'Not established by the selected input.' };

function applicable(name: string, operator: string | undefined): boolean {
  if (name === 'build_mem_used') return operator === 'HashJoinExec';
  if (name === 'peak_mem_used') return operator === 'AggregateExec';
  if (name === 'max_mem_used') return operator === 'BufferExec';
  // Query-summary fields use the caller's metric contract, independent of wrapper names.
  return true;
}

export function collectObservations(indexed: IndexedPlan, scopeId: string, options: PlanInspectionOptions): { observations: MetricObservation[]; evidence: EvidenceRecord[] } {
  const observations: MetricObservation[] = [];
  const evidence: EvidenceRecord[] = [];
  const assumed = options.interpretation?.metricProfile === METRIC_PROFILE;
  const exporter = options.interpretation?.exportProfile === EXPORT_PROFILE;
  const add = (entry: IndexedToken, raw: string, owner: ObservationOwner, extraLabels: MetricObservation['labels'] = []): void => {
    const { token, source, field } = entry;
    const id = 'observation-' + (observations.length + 1);
    const definition = definitions.find((d) => d.name === token.name);
    const labels = [...token.labels, ...extraLabels];
    const scalar = labels.length === 0 && owner.kind === 'operator';
    const reportedTimer = !assumed && token.name === 'elapsed_compute' && scalar;
    const supported = !!definition && applicable(token.name, source?.operator);
    const canType = supported && (assumed || reportedTimer) && owner.kind !== 'unresolved';
    const value = canType ? normalizeValue(raw, definition!.kind, assumed) : null;
    const invalid = canType && !value && /^(?:-|NaN|Infinity)|^\d+(?:\.\d+)?\s*(?:ns|us|µs|μs|ms|s|B|KB|MB|GB|TB|K|M|T)?$/.test(raw);
    const interpretation = assumed && supported ? 'assumed-profile' : reportedTimer ? 'reported-only' : 'unknown';
    const reasons: string[] = [];
    if (!value) reasons.push(invalid ? 'Invalid value for this metric.' : owner.kind === 'unresolved' ? owner.reason : 'Metric definition, unit dialect or measurement scope is unresolved.');
    if (reportedTimer) reasons.push('Reported scalar duration comparison only; not CPU, self time, additive work or task attribution.');
    if (assumed) reasons.push('Producer profile is caller-assumed, not verified metadata.');
    const evidenceId = 'evidence:' + id;
    evidence.push({ id: evidenceId, origin: 'input', kind: 'measurement', sourceIds: source ? [source.id] : [], spans: field.spans,
      rawFieldIds: [field.id], dependsOn: [...(source ? ['source:' + source.id] : []), ...(assumed ? ['profile:' + METRIC_PROFILE] : []),
        ...(exporter && owner.kind === 'instance' ? ['profile:' + EXPORT_PROFILE] : []), ...(options.provenance ? ['caller-provenance'] : [])], profileId: assumed ? METRIC_PROFILE : null,
      description: 'Reported ' + token.name + '; ' + reasons.join(' ') });
    observations.push({ id, metric: token.name, raw, labels, owner, value, status: value ? 'typed' : invalid ? 'invalid' : 'raw-only', reasons,
      completeness: options.provenance?.executionState && options.provenance.executionState !== 'completed' && options.provenance.executionState !== 'unknown' ? 'partial' : 'unknown',
      interpretation, producerReduction: assumed && value ? { state: 'known', value: labels.some((l) => l.name === 'partition') ? 'none' : 'sum', evidenceIds: [evidenceId] } : unknown,
      window: unknown, attempt: unknown, evidenceIds: [evidenceId] });
  };
  for (const entry of indexed.tokens) {
    const { token, source, stageId } = entry;
    const query = definitions.some((d) => d.name === token.name && d.placement === 'query-summary') || token.name === 'Duration';
    const owner: ObservationOwner = query ? { kind: 'query', scopeId: scopeId + ':query' + (stageId ? ':' + stageId : '') } :
      source ? { kind: 'operator', sourceId: source.id, scopeId } : stageId ? { kind: 'stage', scopeId: scopeId + ':stage:' + stageId } :
        { kind: 'unresolved', sourceId: null, reason: 'No printed measurement owner.' };
    const entries = mapEntries(token.rawValue);
    if (entries && query) {
      add(entry, token.rawValue, owner); continue;
    }
    if (!entries) {
      add(entry, token.rawValue, owner); continue;
    }
    if (!exporter || !source) {
      add(entry, token.rawValue, { kind: 'unresolved', sourceId: source?.id ?? null, reason: 'Map keys require an applicable exporter and task ownership contract.' });
      continue;
    }
    for (const item of entries) {
      const candidates = indexed.index.instances.filter((i) => i.sourceId === source.id && i.stageTask.state === 'known' && i.stageTask.value === Number(item.key));
      const instance = candidates.length === 1 ? candidates[0] : null;
      add(entry, item.rawValue, instance ? { kind: 'instance', sourceId: source.id, instanceId: instance.id, scopeId } :
        { kind: 'unresolved', sourceId: source.id, reason: 'Task key is not an unambiguous stage-task instance.' }, [{ name: 'stage_task', rawValue: item.key }]);
    }
  }
  // Conflicting duplicate fields cannot be resolved by last-write-wins. Partition labels remain distinct.
  const groups = new Map<string, MetricObservation[]>();
  for (const observation of observations) {
    const key = JSON.stringify([observation.metric, observation.owner, [...observation.labels].sort((a, b) => a.name.localeCompare(b.name))]);
    const group = groups.get(key) ?? []; group.push(observation); groups.set(key, group);
  }
  for (const group of groups.values()) {
    if (new Set(group.map((o) => o.value ? o.value.decimal + o.value.unit : o.raw)).size > 1) {
      for (const observation of group) {
        observation.status = 'conflicting'; observation.reasons = [...observation.reasons, 'Conflicting duplicate measurements retained.'];
      }
    }
  }
  return { observations, evidence };
}

export function discoverMetrics(observations: readonly MetricObservation[], index: SourceIndex): MetricAvailability[] {
  const names = [...new Set([...definitions.map((d) => d.name), ...observations.map((o) => o.metric)])];
  return names.map((name) => {
    const definition = definitions.find((d) => d.name === name);
    const found = observations.filter((o) => o.metric === name);
    const cohortGroups = new Map<string, MetricObservation[]>();
    for (const observation of found) {
      if (observation.status !== 'typed' || !observation.value) continue;
      const key = JSON.stringify([observation.value.unit, observation.interpretation, observation.owner.kind,
        observation.producerReduction.state === 'known' ? observation.producerReduction.value : observation.producerReduction.state,
        observation.completeness, observation.window, observation.attempt, observation.labels.filter((l) => l.name !== 'stage_task')]);
      const group = cohortGroups.get(key) ?? []; group.push(observation); cohortGroups.set(key, group);
    }
    const cohorts: CohortDescriptor[] = [...cohortGroups.values()].map((group, i) => ({
      id: name + ':c' + (i + 1), label: name + ' / ' + group[0].owner.kind + ' / ' + group[0].interpretation,
      unit: group[0].value!.unit, definitionId: name + ':' + group[0].interpretation,
      scopeDescription: group[0].owner.kind === 'instance' ? 'Reported per-task observations under the assumed exporter.' : 'Reported values in the selected variant; no exclusive work or synchronized peak inference.',
      interpretation: group[0].interpretation, observationIds: group.map((o) => o.id), completeness: group[0].completeness,
    }));
    const presentSources = new Set(found.flatMap((o) => 'sourceId' in o.owner && o.owner.sourceId ? [o.owner.sourceId] : []));
    return { name, label: definition?.label ?? name, definitionStatus: definition ? 'supported' : 'raw-only',
      placement: definition?.placement ?? (found.some((o) => o.owner.kind === 'query') ? 'query-summary' : found.some((o) => o.owner.kind === 'operator' || o.owner.kind === 'instance') ? 'operator' : 'unresolved'),
      present: found.length > 0, reportedCount: found.length, comparableCount: cohorts.reduce((sum, c) => sum + c.observationIds.length, 0),
      invalidCount: found.filter((o) => o.status === 'invalid' || o.status === 'conflicting').length,
      notReportedNodeCount: index.nodes.filter((n) => !presentSources.has(n.id)).length,
      availableDisplays: found.length ? cohorts.length ? ['labels', 'heatmap'] : ['labels'] : [],
      reasons: found.length ? [...new Set(found.flatMap((o) => o.reasons))] : ['Not reported in the selected plan variant.'], cohorts };
  });
}
