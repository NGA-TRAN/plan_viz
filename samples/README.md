# Plan visualizer samples

These two app samples contain physical EXPLAIN text despite their `.sql`
extension. Load each file's complete text into plan-viz; do not execute it as SQL.
The plans, paths and measurements are synthetic teaching examples, not captured
executions or performance benchmarks. The named Parquet files are placeholders;
no datasets are required to draw the plans.

| Sample | Suggested app label | What it demonstrates |
| --- | --- | --- |
| [single-node-metrics.sql](single-node-metrics.sql) | Single node: join and top regions | Filtering, a hash join, partial/final COUNT, local partitions, TopK, compute/row/byte metrics, join build memory and aggregate memory |
| [distributed-metrics.sql](distributed-metrics.sql) | Distributed: uneven tasks and aggregation | Three source tasks, a hash shuffle to two final aggregation tasks, coordinator gather/TopK, per-task metrics and an empty source task |

## Single-node story

Count completed orders from active customers by region, then return the ten
regions with the most orders. The customer side builds the join's hash table;
two local order-file partitions feed its probe side. Partial counts are gathered
and combined into final counts before sorting. Single-node does not mean
single-partition.

Suggested things to inspect:

- `elapsed_compute`: the join reports 45 ms, the order scan 18 ms, and the
  projection exactly 0 ns. In every heatmap palette, that projection is white.
- `output_rows`: 24,000 scanned orders become 18,000 after filtering and 15,000
  after joining; 30 partial aggregate rows become 20 final groups and ten results.
- `build_mem_used`: 128 KB on the join. `peak_mem_used`: reported values on the
  aggregates. These are different metrics, not a combined query memory total.
- The coalesce operator has no metrics. Its missing values must remain
  **Not reported**. Aggregate spill fields explicitly report zero;
  `max_mem_used` is absent from the entire sample.

## Distributed story

Count accepted events by region, then return the ten regions with the most
events. Stage 1 has three tasks, each with two source partition slots and four
hash output partitions. Stage 2 has two tasks, each receiving two shuffled
partitions. The coordinator gathers their four output streams, coalesces them,
and sorts the final counts.

- Source task 0 reports 12,000 rows / 20 ms; task 1 reports 48,000 rows / 200 ms.
  This illustrates uneven reported work, without diagnosing its cause.
- Source task 2 has two empty file groups and reports zero rows, bytes, batches
  and compute time. Empty input does not remove its declared partition capacity
  or shuffle routes.
- Metrics use stage-local task keys. Task 0 in Stage 1 and task 0 in Stage 2 are
  separate instances; neither key identifies a physical machine.
- Coordinator metrics are deliberately absent; keep them unreported rather than
  filling them from worker measurements. `build_mem_used` and `max_mem_used` are
  absent; this sample contains no join or buffer operator.

## Use in plan_visualizer

Use these files as the input text for two entries in the app's sample picker.
Start in **Current plan**, then allow **Labels only**, **Labels + heatmap**,
metric/palette selection and independent structural explanations. Discover
available metrics and comparison groups with `inspectPlan()` as described in the
[integration guide](../docs/PLAN_VISUALIZER_INTEGRATION.md).

For these constructed samples, explicitly select these assumptions when trying
numeric metrics or structural explanations:

| Purpose | Profile |
| --- | --- |
| Count/byte/memory/spill interpretation, both samples | `metricProfile: 'datafusion-7865139'` |
| Per-task map ownership, distributed sample | `exportProfile: 'distributed-b32ee66'` |
| Structural explanations, both samples | `operatorProfile: 'datafusion-physical-7865139'` |

These IDs refer to the recorded source revisions returned by
`getPlanViewCapabilities().profiles`; see the
[metric interpretation guide](../docs/PLAN_VIEWS.md#values-ownership-and-missing-metrics).
Selecting them is an assumption, not proof of a sample's producer. Scalar compute
durations in the single-node sample can be compared without a profile. Distributed maps need the
exporter contract. Do not sum operator timers into query duration or add memory
measurements into a query-wide peak.

From this repository:

```sh
npm run build
mkdir -p tmp/sample-previews

node dist/cli.js -i samples/single-node-metrics.sql \
  --metric-display heatmap --metric elapsed_compute --palette orange \
  -o tmp/sample-previews/single-node.excalidraw

node dist/cli.js -i samples/distributed-metrics.sql \
  --metric-display heatmap --metric output_rows --palette orange \
  --metric-profile datafusion-7865139 --export-profile distributed-b32ee66 \
  --all-workers -o tmp/sample-previews/distributed.excalidraw
```

Omit the metric flags for Current plan. To try structural explanations, add
`--structure explain --operator-profile datafusion-physical-7865139`.
Use `--palette spectrum` to compare the same values with the blue-to-red palette;
zero remains white and the numeric scale remains linear.
See [PLAN_VIEWS.md](../docs/PLAN_VIEWS.md) for the full API/CLI contract.

The npm package includes this guide and both `.sql` files under `samples/`.
For an installed package, replace `node dist/cli.js` with `npx plan-viz` and
`samples/` with `node_modules/plan-viz/samples/` in the commands above; no build
step is needed. Copy the files into the app's static assets to serve them as sample
input text. The separate app still supplies its sample picker and scene loading.
