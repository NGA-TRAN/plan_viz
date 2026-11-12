import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { PlanAnalysisOptions, ReadyPlanInspection, StructuralFinding, StructureReport } from '../../types/plan-view.types';
import { IndexedPlan } from '../../inspection/source-index';
import { OPERATOR_PROFILE } from '../metrics/catalog';
import { listContent, splitTopLevel } from '../../parsers/plan-text';

/** Only exact printed order is used; no expression equivalence or guessed null ordering. */
function knownOrder(node: ExecutionPlanNode): string | null {
  if (node.wrappers?.length) return null;
  if (node.operator === 'DataSourceExec') return node.properties?.output_ordering ?? null;
  if (node.operator === 'FilterExec' && node.children.length === 1) return knownOrder(node.children[0]);
  if (node.operator === 'ProjectionExec' && node.children.length === 1) {
    const input = knownOrder(node.children[0]);
    if (!input) return null;
    const expressions = splitTopLevel(listContent(node.properties?.expr ?? '')).map((e) => e.match(/^([\w.]+@\d+) as ([\w.]+)$/));
    if (expressions.some((e) => !e)) return null;
    const mapped: string[] = [];
    for (const term of splitTopLevel(listContent(input))) {
      const match = term.match(/^([\w.]+@\d+) (ASC|DESC) NULLS (FIRST|LAST)$/);
      const index = expressions.findIndex((e) => e?.[1] === match?.[1]);
      if (!match || index < 0) return null;
      mapped.push(expressions[index]![2] + '@' + index + ' ' + match[2] + ' NULLS ' + match[3]);
    }
    return '[' + mapped.join(', ') + ']';
  }
  return null;
}

export function structuralAnalysis(inspection: ReadyPlanInspection, indexed: IndexedPlan, options: PlanAnalysisOptions): StructureReport {
  if (options.structure !== 'explain') return { display: 'off', findings: [], unknownSourceIds: [] };
  const findings: StructuralFinding[] = [];
  const profile = options.interpretation?.operatorProfile === OPERATOR_PROFILE;
  // Only source nodes: specialization must not multiply explanatory claims.
  const seen = new Set<string>();
  const entries = [...indexed.sourceByNode].filter(([, source]) => {
    if (seen.has(source.id)) return false;
    seen.add(source.id);
    return true;
  });
  for (const [node, source] of entries) {
    const p = node.properties ?? {};
    const deps = node.children.map((child, inputIndex) => ({ sourceId: indexed.sourceByNode.get(child)!.id, inputIndex }));
    const add = (ruleId: string, property: StructuralFinding['property'], summary: string, explanation: string,
      assessment: StructuralFinding['assessment'] = 'conditional', dependencies = deps, missingEvidence: string[] = []): void => {
      findings.push({ id: 'finding-' + (findings.length + 1), ruleId, subject: { kind: 'operator', sourceId: source.id, scopeId: inspection.input.id }, property,
        assessment, summary, explanation, evidenceIds: ['source:' + source.id, ...(profile && assessment === 'conditional' ? ['profile:' + OPERATOR_PROFILE] : [])], dependencies,
        assumptions: profile && assessment === 'conditional' ? ['Assumes operator profile ' + OPERATOR_PROFILE + '; producer identity is unverified.'] : [], missingEvidence });
    };
    if (!profile || node.wrappers?.length) {
      add('unknown', 'waiting', 'Execution contract unknown', 'Printed operator identity alone does not establish waiting, retained state or decomposition.', 'unknown', deps,
        [node.wrappers?.length ? 'Applicable inline-wrapper execution contract.' : 'Applicable operator implementation profile.']);
      continue;
    }
    if (['ProjectionExec', 'FilterExec'].includes(node.operator) && node.children.length === 1) {
      add('P1', 'waiting', 'No own full-input barrier', 'The built-in operator processes input batches; inherited child completion dependencies still apply.');
      add('P1', 'retained-state', 'Expression state unknown', 'Opaque expressions and UDFs need separate state and evaluation-cost contracts.', 'unknown', deps, ['Expression/UDF contracts.']);
    } else if (node.operator === 'AggregateExec') {
      const aggregates = splitTopLevel(listContent(p.aggr ?? ''));
      const modes = ['Single', 'SinglePartitioned', 'Partial', 'Final', 'FinalPartitioned', 'PartialReduce'];
      const countOnly = aggregates.length > 0 && aggregates.every((a) => /^count\(/i.test(a) && !/distinct|order by/i.test(a));
      if (!modes.includes(p.mode) || p.gby === undefined || !aggregates.length) {
        add('P3', 'retained-state', 'Aggregate contract incomplete', 'Mode, grouping and aggregate definitions are required.', 'unknown', deps, ['Mode, grouping or aggregate definitions.']);
      } else if (!listContent(p.gby).trim() && countOnly) {
        add('P2', 'waiting', 'Exact count waits for completion', 'An exact scalar result requires completion of its relevant input; partial state does not prove early final output.');
        add('P2', 'retained-state', 'Compact count state', 'COUNT keeps a fixed number of counters per aggregate instance, independent of row count; this is not a query memory bound.');
        add('P2', 'decomposition', 'Partial counts can combine', 'COUNT partial states can be combined under the aggregate mode and integer count contract. No arbitrary floating-point SUM reassociation is inferred.');
      } else {
        const sorted = p.ordering_mode === 'Sorted';
        add('P3', 'retained-state', sorted ? 'State for live ordered groups' : 'State per live group',
          sorted ? 'The declared sorted-group strategy may release completed groups; it does not mean the entire pipeline emits immediately. Aggregate-specific state still applies.' :
            'Retained state depends on live group cardinality and each aggregate. DISTINCT, collections and ordered aggregates need separate state models.');
        add('P3', 'waiting', 'Emission depends on mode and order', 'Partial/adaptive and final modes have different emission rules. Printed ordering_mode alone does not establish a streaming upstream pipeline.', 'unknown', deps, ['Complete ordering and aggregate emission contract.']);
        if (countOnly) add('P3', 'decomposition', 'Counts combine per key', 'Per-key partial counts can combine; the number of live groups is not bounded by COUNT state size.');
      }
    } else if (node.operator === 'SortExec' && node.children.length === 1) {
      const order = knownOrder(node.children[0]);
      const compatible = !!p.expr && !!order && p.expr === order;
      add('P4', 'waiting', compatible ? 'Compatible declared input order' : 'Completion dependency unresolved', compatible ?
        'Under the exact printed source ordering and selected profile, compatible ordering permits incremental output; fetch can stop selection early.' :
        'Without compatible input ordering, sorting or TopK generally waits for relevant input completion. Existing order and wrapper behavior have not been proven.', 'conditional', deps,
      compatible ? [] : ['Compatible input ordering, including expressions, direction and null ordering.']);
      add('P4', 'retained-state', p.fetch ? 'Row TopK candidates' : 'Sort state depends on input', p.fetch ?
        'fetch=' + p.fetch + ' selects row TopK candidates, not a byte bound or a bound on upstream state. Exact frequency TopN still needs counts for competing keys.' :
        'Sorting retains data or external spill state according to the execution contract; text alone gives no query-wide memory bound.');
    } else if (node.operator === 'HashJoinExec' && node.children.length === 2 && ['CollectLeft', 'Partitioned'].includes(p.mode)) {
      add('P5', 'waiting', 'Waits for left build input', 'The conventional hash join builds input 0 (left) before probing input 1. This is a build-completion dependency, not a whole-query verdict.', 'conditional', deps.slice(0, 1));
      add('P5', 'retained-state', 'Build-side retained state', 'Hash-table and retained build data grow with the build input under this contract; observed build_mem_used is separate evidence.');
      add('P5', 'layout', 'Storage locality not established', 'Partitioned mode or equal partition counts do not prove independently local storage layouts, compatible keys or compatible hash functions.', 'unknown', deps, ['Storage partition keys and compatible hash/layout contracts.']);
    } else if (['RepartitionExec', 'CoalescePartitionsExec', 'CoalesceBatchesExec', 'SortPreservingMergeExec',
      'NetworkCoalesceExec', 'NetworkShuffleExec', 'NetworkBroadcastExec'].includes(node.operator)) {
      add('P6', 'layout', 'Printed redistribution / merge', 'The plan contains ' + node.operator + '. ' + (p.partitioning ? 'Partitioning: ' + p.partitioning + '. ' : '') +
        'Ordering propagation requires its exact preservation contract; fetch does not bound upstream work or memory.');
    } else if (node.operator === 'BufferExec' && /^\d+$/.test(p.capacity ?? '')) {
      add('P7', 'retained-state', 'Per-partition buffer target', 'Configured capacity=' + p.capacity + ' bytes is a target per partition; one oversized batch may exceed it. It is not a strict query-wide memory bound.');
    } else if (node.operator === 'DataSourceExec') {
      add('P7', 'layout', 'Printed source layout', 'Printed layout: ' + ['file_groups', 'output_ordering', 'partitioning'].filter((k) => p[k]).map((k) => k + '=' + p[k]).join('; ') +
        '. This is reported layout evidence, not verified storage locality or a future resource bound.', 'established');
    } else {
      add('unknown', 'waiting', 'Execution contract unknown', 'No applicable structural rule for ' + node.operator + '. Custom, symmetric and approximate algorithms need their own contracts.', 'unknown', deps, ['Applicable algorithm and implementation contract.']);
    }
  }
  return { display: 'explain', findings, unknownSourceIds: [...new Set(findings.filter((f) => f.assessment === 'unknown').flatMap((f) => 'sourceId' in f.subject && f.subject.sourceId ? [f.subject.sourceId] : []))] };
}
