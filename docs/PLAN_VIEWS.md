# Optional metrics and structural explanations

These APIs are available in the working tree for the next release. Existing
synchronous conversion and the default CLI drawing stay unchanged. Both new
display modes default off; existing raw metric text remains part of the ordinary
drawing.

For a step-by-step application integration and acceptance checklist, start with
[the plan_visualizer integration guide](PLAN_VISUALIZER_INTEGRATION.md). Both
guides ship in the npm package alongside the public TypeScript declarations.

## Library and app integration

```ts
import {
  getPlanViewCapabilities, inspectPlan, analyzePlan, convertPlanView,
} from 'plan-viz';

const capabilities = getPlanViewCapabilities();
const inspection = await inspectPlan(planText);
if (inspection.status === 'selection-required') {
  // Populate section/variant choices from inspection.input.sections.
}

const result = await convertPlanView(planText, {
  metrics: { display: 'heatmap', metric: 'elapsed_compute', palette: 'orange' },
  structure: 'off',
});
// Load result.scene into Excalidraw. Use result.renderIndex to locate drawn bodies.
// result.metrics and result.structure contain the same analysis as analyzePlan.
```

`getPlanViewCapabilities()` returns the display modes, palettes, metric definitions
and audited profile IDs. `inspectPlan()` reports availability for the selected
input, including raw custom fields, comparison cohorts and reasons a heatmap is
unavailable. `analyzePlan()` returns analysis without generating a scene.
`convertPlanView()` adds the editable scene and render references.

All input-consuming APIs return Promises and require WebCrypto (Node 20+ or a
secure browser context). They do not create a background worker. Legacy APIs stay
synchronous and do not require WebCrypto. The package's browser import contains
no filesystem or CLI dependencies.

The separate viewer app can implement these controls using the API:

| Control | API option / source |
| --- | --- |
| Current plan / Labels only / Labels + heatmap | `metrics.display`: `off`, `labels`, `heatmap` |
| Metric dropdown | `inspection.metrics`; use `present`, `availableDisplays`, `reasons` |
| Orange / Blue / Purple | `metrics.palette`; heatmap only, default `orange` |
| Comparison group | `metrics.cohort`, when the report is `cohort-required` |
| Structural explanations | `structure`: `off` or `explain`, independently of metrics |
| Input section / physical variant | `input.section` (1-based), `input.variant` (catalog ID) |
| Producer assumptions | `interpretation` IDs from capabilities |

Omit metric/palette/cohort when display is off. Labels mode requires a metric and
rejects palette. A viewer may retain the user's palette in its own UI state.
Both modes off produces the exact ordinary scene for the same selection and
generator settings. Changing a palette does not change ranking or the scale.
There is no interactive viewer bundled in this package.

## Values, ownership and missing metrics

The operator dictionary contains `elapsed_compute`, `output_rows`,
`output_batches`, `output_bytes`, `build_mem_used`, `peak_mem_used`, `max_mem_used`,
`spill_count`, `spilled_bytes` and `spilled_rows`.

Selecting a supported field absent from the plan succeeds with `not-reported`,
empty rankings and no numeric legend or color. Zero is a reported value. Empty,
non-numeric and conflicting fields retain their raw evidence without a fabricated
number. Unknown present names support raw labels; their heatmap is `incomparable`.
A name neither supported nor present is `UNKNOWN_METRIC`.

Without a producer profile, only scalar `elapsed_compute` with explicit duration
units has the narrow reported-duration comparison. It does not establish CPU,
exclusive work or additivity. Other numeric interpretations require an explicit
applicable profile. In particular, a `K` count or `KB` size has no implicit dialect.

Profiles are **caller assumptions**, recorded in the report and exposed in the
drawings. No front matter or caller provenance is silently promoted to a verified
producer. Current profile IDs:

- `datafusion-7865139`: recorded DataFusion fork metric definitions; decimal
  count suffixes and binary `KB`/`MB`/`GB`/`TB`. Memory fields are qualified to
  their supported operator. Includes the separately recorded fairness query-CPU
  definitions.
- `datafusion-physical-7865139`: structural rules for the recorded DataFusion
  implementation, plus the audited Distributed `b32ee66` exchanges.
- `distributed-b32ee66`: per-task export interpretation. Map keys identify stage
  tasks under this explicit assumption, not arbitrary worker/host IDs.

Exact repositories, revisions, paths and limitations are returned in capabilities.
The definitions and references live in
[`catalog.ts`](../src/analysis/metrics/catalog.ts).

```ts
const result = await convertPlanView(planText, {
  interpretation: {
    metricProfile: 'datafusion-7865139',
    exportProfile: 'distributed-b32ee66',
  },
  metrics: { display: 'heatmap', metric: 'output_rows', palette: 'blue' },
});
```

Normalized values are decimal **strings** in `ns`, `byte` or `count`. Ranking
uses exact arithmetic; only color interpolation uses an approximate ratio.
Rounded producer tokens remain identified as rounded. The linear domain includes
all comparable observations before hiding tasks or limiting the displayed ranking.
Orange uses **white (`#ffffff`) for exact zero**, including zero rows. Positive
values retain the light-to-dark orange gradient, even when a very small positive
ratio rounds to zero. Blue and Purple use their existing lightest fills for zero.
An all-zero cohort uses its zero fill for every legend stop. Missing values keep
their original fill and are labeled `Not reported`, rather than `0`.
Different comparison cohorts require a choice before coloring.

Each palette in capabilities exposes `zero`, `low` and `high`: use `zero` for
exact zero and interpolate positive values between `low` and `high`. The report's
ranking colors and legend stops already apply this rule for the viewer app.

Scalars copied by task specialization remain one source observation. They never
color every task box. Task-map entries without an applicable exporter remain raw.
`query_cpu_time`, `query_cpu_sample_count` and EXPLAIN `Duration` stay in separate
query details. Query-only fields cannot be selected for an operator heatmap.
Unknown custom names are not assigned query ownership merely by their prefix.
The two named query-CPU metrics use the explicitly selected metric profile for
units and interpretation, independently of the wrapper's operator name. Renaming
a custom wrapper does not verify its runtime semantics or its metric ownership;
the selected profile remains a caller assumption. Query task maps remain raw.

Reports currently retain unknown collection completeness and execution attempt
identity. Caller-declared running/failed/cancelled runs mark observations partial;
declaring a completed run does not prove complete metric collection. No totals
are inferred across operators, no shared handles are guessed to be independent,
and no synchronized query peak or self time is calculated. `subtotal` remains
null when disjoint compatible contributors cannot be established.

## Structural explanations

Enable `structure: 'explain'` with the operator profile to get conditional
explanations. Without the applicable profile, execution claims remain unknown.
Findings separate waiting, retained state, decomposition and printed layout.

- Projection/filter: own versus inherited full-input waits; opaque expression
  state and UDF cost remain unknown.
- Scalar COUNT: compact state and combinable partial counts, with an exact final
  result that still needs input completion.
- Grouped aggregation: live-group state and conditional ordered-group completion;
  aggregate-specific state/emission is not guessed.
- Sort/row TopK: ordering-dependent completion and candidate count, without
  claiming bounded bytes or bounded frequency-counting state upstream.
- Conventional HashJoin: left build-input dependency and build state for
  CollectLeft/Partitioned modes; no inferred storage locality.
- Exchange/merge: printed redistribution and qualified ordering behavior;
  fetch does not bound all upstream work.
- Buffer: per-partition configured target, including the oversized-batch exception.
  Source layout is printed evidence, not an admission or resource guarantee.

Order checks retain expression identity, direction and null placement. Supported
propagation is deliberately narrow: direct source order, ordinary filter and
direct-column projection. Unknown wrappers and expressions stop the proof.
Logical-plan analysis, approximate algorithm guarantees, arbitrary SUM
reassociation and whole-query admission decisions are outside this delivery.

## Input capture, reports and errors

Inspection retains the original string, sections, logical/physical/raw variants,
duplicate fields and source spans. Offsets are zero-based UTF-16, end-exclusive.
Input identity is SHA-256 of exact UTF-16LE code units, including line endings and
lone surrogates; it identifies text, not an execution. Source IDs include parser
schema, selection, stage and original child path. Task instance records keep
stage task and effective UNION context separate. Recorded task identity is unknown.

Multiple sections without selection return `selection-required` from inspection;
analysis/conversion reject with `SELECTION_REQUIRED`. A single section selects its
first physical variant. Summary/full metric variants are alternatives, never
combined automatically. Explicit logical selection is `UNSUPPORTED_VARIANT`.
Selected invalid plans return `INVALID_PLAN`, including existing routing conflicts.

`PlanViewError.code` also includes `INVALID_OPTIONS`, `INVALID_SECTION`,
`INVALID_VARIANT`, `UNKNOWN_METRIC`, `METRIC_SCOPE_MISMATCH`, `INVALID_COHORT`,
`UNKNOWN_PROFILE` and `HASH_UNAVAILABLE`. Missing metrics are successful report
states, not errors. Reports are JSON-safe, with arrays and decimal strings rather
than Maps, functions or bigints.

`renderIndex` references final scene IDs and groups and distinguishes visible
bodies, omitted tasks and sources with no exposed shape. Annotations use existing
operator/worker groups; original geometry and semantic text colors remain intact.
Custom generators keep their existing precedence. A custom renderer that exposes
no body cannot receive a guessed heatmap fill.

## CLI

```sh
plan-viz --capabilities
plan-viz -i plan.sql --inspect > inspection.json
plan-viz -i plan.sql --analyze --metric-display labels --metric elapsed_compute
plan-viz -i plan.sql --metric-display heatmap --metric elapsed_compute \
  --palette orange -o plan.excalidraw --report plan.report.json
plan-viz -i plan.sql --structure explain \
  --operator-profile datafusion-physical-7865139 -o structure.excalidraw
```

`--variant`, `--metric-cohort`, `--metric-profile` and `--export-profile` map to
the corresponding API options. Existing `--section`, layout and `--all-workers`
options remain available for scene generation. Capabilities/inspection/analysis
modes are mutually exclusive. Capabilities reads no stdin; inspection rejects view
and rendering flags; analysis rejects rendering flags. `--report` is scene-mode
only, requires a distinct file path, and omits the scene from its JSON.

Stdout contains one JSON payload when `-o` is absent; scene diagnostics go to
stderr. File output retains the existing success message. Errors exit 1;
incomplete/missing measurements succeed. Scene and sidecar serialization finishes
before file writes; the pair is not an atomic multi-file transaction.

## Regression and local example checks

```sh
npm run build
npx jest --runInBand --coverage=false plan-view
node scripts/check-plan-views.cjs path/to/private/plans report.json
node scripts/verify-plan-views.cjs
```

The local check discovers every `*.sql` recursively on each invocation, compares
ordinary output exactly, exercises all ten operator metric selections and reports
pre-existing parse failures separately. It never imports private inputs into
repository fixtures. Existing SQL fixtures also run through the optional API.
[`tests/plan-views`](../tests/plan-views) contains synthetic inputs, view manifests
and paired expected Excalidraw scenes. Browser checks exercise actual editor
dragging and browser/Node API parity. Full gates remain in
[CONTRIBUTING.md](../CONTRIBUTING.md).
