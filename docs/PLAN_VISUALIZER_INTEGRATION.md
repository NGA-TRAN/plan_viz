# Integrating optional plan views into plan_visualizer

This guide covers the metric and structural APIs added in plan-viz 0.1.29.
See [CHANGELOG.md](../CHANGELOG.md) for release details; version 0.1.28 does not
contain these APIs.
The package includes this guide, [PLAN_VIEWS.md](PLAN_VIEWS.md), the changelog,
[single-node and distributed samples](../samples/README.md), and public TypeScript
declarations. Import runtime functions and types from `plan-viz`.

## Upgrade and preserve the current view

1. Install this release explicitly with
   `npm install --save-exact plan-viz@0.1.29` and update the app lockfile.
2. Read the installed package's `docs/PLAN_VIEWS.md` and `dist/index.d.ts`, following
   its re-exported declarations. Check `getPlanViewCapabilities().schemaVersion`
   and the exported functions. This API uses schema version `1`.
3. Keep **Current plan** as the app's initial display. Existing callers of
   `convertPlanToExcalidraw` can keep that synchronous API. Callers using the new
   API must `await convertPlanView`; its scene is `result.scene`.
4. Preserve the app's existing parser, generator and distributed-worker settings.
   Both optional features off must produce the same ordinary drawing for the
   same selected input and configuration.

Node requires version 20 or later. Browsers need WebCrypto in a secure context
(HTTPS or a supported localhost context). The package contains no interactive
viewer or dropdown component; the app supplies those controls and its Excalidraw
integration. These async APIs perform parsing/layout on the calling thread; an
app can put that work in its own worker if needed.

For the app's sample picker, copy `samples/single-node-metrics.sql` and
`samples/distributed-metrics.sql` from the installed package into the app's static
assets. Load their complete text as physical EXPLAIN input. The sample guide
describes their synthetic values, explicit profile assumptions, and suggested
metric/structure checks. These `.sql` files are not executable queries.

## Discover, select, convert

```ts
import {
  getPlanViewCapabilities, inspectPlan, convertPlanView,
  type PlanViewOptions,
} from 'plan-viz';

export const capabilities = getPlanViewCapabilities();

export async function loadPlan(text: string, options: PlanViewOptions = {}) {
  const inspection = await inspectPlan(text, {
    input: options.input,
    interpretation: options.interpretation,
    provenance: options.provenance,
    parser: options.parser,
  });
  if (inspection.status === 'selection-required') {
    return { kind: 'selection-required' as const, inspection };
  }
  const result = await convertPlanView(text, options);
  return { kind: 'ready' as const, result };
}

export const currentView: PlanViewOptions = {
  metrics: { display: 'off' }, structure: 'off',
};
export const labelsView: PlanViewOptions = {
  metrics: { display: 'labels', metric: 'elapsed_compute' },
};
export const heatmapView: PlanViewOptions = {
  metrics: { display: 'heatmap', metric: 'elapsed_compute', palette: 'orange' },
};
```

When selection is needed, use `inspection.input.sections` and each section's
`variants`. Submit `input.section` (1-based) and `input.variant` (returned ID).
Only physical variants are supported. Inspection defaults to the first physical
variant in a single section. Metric summary/full variants are separate choices;
do not merge their measurements.

For `kind: 'ready'`, load `result.scene` through the app's existing Excalidraw
scene-loading path. Show the report status and diagnostics alongside it. Use
`result.renderIndex` for final element/group IDs; source IDs identify analysis
nodes, not Excalidraw elements. References can describe omitted tasks or nodes
without exposed shapes.

## Controls and request rules

| App control | Source and request |
| --- | --- |
| Display: Current plan / Labels only / Labels + heatmap | `capabilities.displays`; submit `metrics.display: 'off'`, `'labels'` or `'heatmap'` |
| Metric | Filter `inspection.metrics` by `placement === 'operator'` and `present`; consult `availableDisplays` and `reasons` |
| Palette: Orange / Blue / Purple / Spectrum | `capabilities.palettes`; submit `metrics.palette` only for heatmap; default Orange |
| Comparison group | Selected metric's `cohorts`; submit `metrics.cohort` when more than one group exists |
| Structural explanations | `structure: 'off'` or `'explain'`, independently of metrics |
| Producer assumptions | `capabilities.profiles`; explicit `interpretation.metricProfile`, `operatorProfile`, `exportProfile` |

Off must omit `metric`, `palette` and `cohort`. Labels requires a metric and must
omit palette. Store remembered control preferences separately from the request.
Query-summary fields belong in a query-details panel, never the operator-metric
dropdown, even when their availability includes numeric data.

Use the returned ranking colors and legend metadata. Every palette uses white
for exact zero; Orange, Blue and Purple retain their existing positive-value
gradients. Spectrum progresses from blue through cyan, green, yellow and orange
to red, with a separate zero swatch. Palette metadata retains `zero`, `low` and
`high` and adds optional `positiveStops` anchors for Spectrum. Its positive colors
interpolate between adjacent anchors, not just its endpoints. A rounded intensity
of `0` does not prove a zero value. Ranking and normalized values use exact decimal
strings; avoid converting them to JavaScript numbers for comparisons or sorting.
All palettes keep the same linear numeric scale; Spectrum does not introduce
logarithmic scaling.

For Spectrum, render `legend.zeroColor` as a separate zero swatch, then render
the six positive anchors in `legend.stops`. With `zeroColor` present, the stop at
position 0 represents the lowest positive color. An all-zero Spectrum cohort
has no positive stops; show only its white zero swatch. Other palettes keep their
existing five-stop legends. Build the palette dropdown from capabilities rather
than a hard-coded list.

Without a producer profile, only reported scalar `elapsed_compute` durations
receive numeric comparison. Count/byte fields and distributed task-map ownership
need applicable profiles selected explicitly by the caller. Discover IDs from
capabilities and show their assumptions and limits. Do not silently choose a
profile from an operator name. Structural execution claims likewise need the
applicable operator profile; otherwise they remain unknown.

Re-inspect when the input, variant or interpretation changes; discard obsolete
cohort selections. Guard asynchronous UI updates so an older conversion cannot
replace a newer request. Decide explicitly how regeneration interacts with
manual diagram edits, using the app's existing scene replacement behavior.

## Report states and failures

| `result.metrics.status` | App behavior |
| --- | --- |
| `off` | Show the ordinary drawing; structural explanations may still be on |
| `ready` | Show available values, selected cohort, ranking and legend |
| `not-reported` | Keep the successful drawing and show “Not reported”; no fabricated numbers or heatmap |
| `incomparable` | Keep raw labels/details and show why numeric comparison is unavailable |
| `cohort-required` | Offer comparison-group selection; do not color or compare across groups |

Missing metrics do not automatically switch the requested display off. A known
zero remains a measured value; raw/non-numeric/conflicting values never become
zero. Query CPU fields and query task maps stay in query details. No totals,
query-wide peaks, self time or CPU percentages are inferred from operator values.

Catch exported `PlanViewError` and use its `code`. `SELECTION_REQUIRED` needs
input selection; `UNSUPPORTED_VARIANT` needs a physical variant. `INVALID_PLAN`
includes parser/routing diagnostics. `HASH_UNAVAILABLE` needs WebCrypto.
`UNKNOWN_PROFILE`, `INVALID_COHORT`, `UNKNOWN_METRIC`, `METRIC_SCOPE_MISMATCH`,
`INVALID_OPTIONS`, `INVALID_SECTION` and `INVALID_VARIANT` indicate an unsupported
selection or invalid request. Preserve the user's input and show the message;
do not disguise conversion failures as missing metrics.

## App acceptance checks

- Opening an existing plan starts in Current plan with the same settings and
  drawing. Existing custom renderers and representative-worker choices survive.
- Off, labels and heatmap requests obey the field rules; all four palettes work.
- Switching metrics/palettes/cohorts updates the drawing and legend together;
  changing palette does not change ranking or source identities.
- Missing, zero, all-zero, raw and conflicting metrics produce the documented
  states. Very small positive values remain tinted in every palette; only exact
  zero receives white. Spectrum's legend distinguishes zero from its low positive
  anchor and shows only the zero swatch for an all-zero cohort.
- Counts/bytes require an explicit profile; distributed task maps also require
  the exporter contract. Hidden tasks remain in comparisons; source scalars are
  not duplicated as per-task measurements.
- Query metrics stay outside the operator dropdown. Structural explanations work
  independently and show their conditional/unknown evidence.
- Multiple sections/variants require the appropriate choices; invalid physical
  plans display actionable errors. Rapid changes cannot display stale results.
- Saved/exported scenes keep labels, bindings and groups. Dragging an operator or
  worker moves its annotations with it. Exercise the actual app's editor path.

The package has unit, fixture, CLI, browser/editor and packed-consumer validation.
The checks above still need to run in `plan_visualizer` after its integration.
Logical-plan analysis, automatic producer detection, query-wide resource verdicts
and the app's dropdown implementation are outside this package delivery.

## Suggested instruction for the app's coding agent

> Upgrade plan-viz to the release containing optional plan views. Read the
> installed docs/PLAN_VISUALIZER_INTEGRATION.md, docs/PLAN_VIEWS.md, CHANGELOG.md
> and public TypeScript declarations. Preserve Current plan as the default.
> Implement Display, Metric, Palette and comparison-group dropdowns, plus
> independent structural explanations, using capability/inspection metadata.
> Keep producer assumptions explicit and handle missing/raw metrics safely.
> Run the integration guide's acceptance checks in this app.
