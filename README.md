# plan-viz

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Code Style](https://img.shields.io/badge/code%20style-google-blueviolet)](https://google.github.io/styleguide/tsguide.html)
[![CI/CD](https://github.com/NGA-TRAN/plan_viz/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/NGA-TRAN/plan_viz/actions/workflows/ci-cd.yml)

Convert Apache DataFusion physical EXPLAIN plans into editable **Excalidraw diagrams**.
See operators, parallel streams, sort order, and distributed data flow at a glance.

[Install](#installation) · [Usage](#usage) · [Documentation](#documentation) · [Issues](https://github.com/NGA-TRAN/plan_viz/issues)

## Single-node plans

Read diagrams from bottom to top. Arrows represent partition streams; blue column
labels mark known sort order. This example combines a join, aggregation, and sorting.

<details open>
<summary>Text plan</summary>

```text
SortExec: expr=[env@0 ASC NULLS LAST, time_bin@1 ASC NULLS LAST], preserve_partitioning=[false]
  AggregateExec: mode=Single, gby=[env@1 as env, time_bin@0 as time_bin], aggr=[avg(a.max_bin_val)]
    ProjectionExec: expr=[date_bin(IntervalMonthDayNano("IntervalMonthDayNano { months: 0, days: 0, nanoseconds: 30000000000 }"),j.timestamp)@1 as time_bin, max(j.env)@2 as env, max(j.value)@3 as max_bin_val]
      AggregateExec: mode=Final, gby=[f_dkey@0 as f_dkey, date_bin(IntervalMonthDayNano("IntervalMonthDayNano { months: 0, days: 0, nanoseconds: 30000000000 }"),j.timestamp)@1 as date_bin(IntervalMonthDayNano("IntervalMonthDayNano { months: 0, days: 0, nanoseconds: 30000000000 }"),j.timestamp)], aggr=[max(j.env), max(j.value)], ordering_mode=Sorted
        SortPreservingMergeExec: [f_dkey@0 ASC NULLS LAST, date_bin(IntervalMonthDayNano("IntervalMonthDayNano { months: 0, days: 0, nanoseconds: 30000000000 }"),j.timestamp)@1 ASC NULLS LAST]
          AggregateExec: mode=Partial, gby=[f_dkey@0 as f_dkey, date_bin(IntervalMonthDayNano { months: 0, days: 0, nanoseconds: 30000000000 }, timestamp@1) as date_bin(IntervalMonthDayNano("IntervalMonthDayNano { months: 0, days: 0, nanoseconds: 30000000000 }"),j.timestamp)], aggr=[max(j.env), max(j.value)], ordering_mode=Sorted
            ProjectionExec: expr=[f_dkey@1 as f_dkey, timestamp@2 as timestamp, env@0 as env, value@3 as value]
              CoalesceBatchesExec: target_batch_size=8192
                HashJoinExec: mode=CollectLeft, join_type=Inner, on=[(d_dkey@0, f_dkey@0)], projection=[env@1, f_dkey@2, timestamp@3, value@4]
                  AggregateExec: mode=Final, gby=[d_dkey@0 as d_dkey, env@1 as env], aggr=[]
                    CoalescePartitionsExec
                      AggregateExec: mode=Partial, gby=[d_dkey@0 as d_dkey, env@1 as env], aggr=[]
                        CoalesceBatchesExec: target_batch_size=8192
                          FilterExec: service@2 = log, projection=[d_dkey@0, env@1]
                            DataSourceExec: file_groups={2 groups: [[d1.parquet], [d2.parquet]]}, projection=[d_dkey, env, service], file_type=parquet, predicate=service@2 = log, pruning_predicate=service_null_count@2 != row_count@3 AND service_min@0 <= log AND log <= service_max@1, required_guarantees=[service in (log)]
                  DataSourceExec: file_groups={3 groups: [[f1.parquet, f4.parquet, f5.parquet, f6.parquet, f7.parquet, f8.parquet], [f2.parquet], [f3.parquet, f9.parquet, f10.parquet]]}, projection=[f_dkey, timestamp, value], output_ordering=[f_dkey@0 ASC NULLS LAST, timestamp@1 ASC NULLS LAST], file_type=parquet, predicate=DynamicFilter [ empty ]
```

</details>

![Single-node join, aggregation, and sorting](docs/assets/join_aggregates.png)

[Plan text](docs/assets/join-aggregates.txt) · [SQL and EXPLAIN](tests/join_aggregates.sql) · [Editable Excalidraw](tests/expected/join_aggregates.excalidraw) · [Annotated diagram](docs/assets/join_aggregates_with_analyses.png)

<details>
<summary>How to read the plan</summary>

The pink annotations explain the arrows, file groups, hash tables, and sort-order
highlights. Follow the streams from the sources at the bottom toward the result
at the top to see where operators preserve or reduce parallelism.

![Annotated execution plan explaining streams, file groups, hash tables, and sort order](docs/assets/join_aggregates_with_analyses.png)

</details>

## Distributed physical plans

Stages appear as rows, with consumers above producers. Blue badges show output
partitions per task. Purple arrows bundle streams between tasks and connect to the
receiving network operator. Ellipses mark omitted tasks or connections; task slots
do not represent physical machines.

The examples show the first and last equivalent tasks. Use `--all-workers` to draw
every task. See [distributed conventions and limits](docs/DISTRIBUTED_PLANS.md) for
gathers, shuffle, broadcast, UNION, and incomplete recordings.

### Shuffle aggregation and gather

Four producer tasks scan and partially aggregate events by region. A hash shuffle sends the partial results to three aggregation tasks, each with two output partitions. The coordinator gathers those six streams and coalesces them into one.

<details open>
<summary>Text plan</summary>

```text
┌───── DistributedExec
│ CoalescePartitionsExec
│   [Stage 2] => NetworkCoalesceExec: output_partitions=6, input_tasks=3
└──────────────────────────────────────────────────
  ┌───── Stage 2 ── tasks=3, partitions=6
  │ AggregateExec: mode=FinalPartitioned, gby=[region@0 as region], aggr=[count(*)]
  │   [Stage 1] => NetworkShuffleExec: output_partitions=2, input_tasks=4
  └──────────────────────────────────────────────────
    ┌───── Stage 1 ── tasks=4, partitions=6
    │ RepartitionExec: partitioning=Hash([region@0], 6), input_partitions=2
    │   AggregateExec: mode=Partial, gby=[region@0 as region], aggr=[count(*)]
    │     DataSourceExec: file_groups={2 groups: [[events-1.parquet], [events-2.parquet]]}, projection=[region, value], file_type=parquet
    └──────────────────────────────────────────────────
```

</details>

![Distributed aggregation with four producer tasks, three aggregation tasks, and a coordinator connected by purple shuffle and gather arrows](docs/assets/distributed-shuffle-aggregate.png)

[Plan text](docs/assets/distributed-shuffle-aggregate.txt) · [Full-size diagram](docs/assets/distributed-shuffle-aggregate.png) · [Editable Excalidraw](docs/assets/distributed-shuffle-aggregate.excalidraw)

### Worker-local partitioned join and gather

Four tasks each join two local inputs on record_id, using two partitions per input and two hash tables. The coordinator gathers the eight resulting streams and coalesces them into one. The inputs must already be partitioned compatibly; this example has no network shuffle before the join.

<details open>
<summary>Text plan</summary>

```text
┌───── DistributedExec
│ CoalescePartitionsExec
│   [Stage 1] => NetworkCoalesceExec: output_partitions=8, input_tasks=4
└──────────────────────────────────────────────────
  ┌───── Stage 1 ── tasks=4, partitions=8
  │ HashJoinExec: mode=Partitioned, join_type=Inner, on=[(record_id@0, record_id@0)]
  │   DataSourceExec: file_groups={2 groups: [[catalog-1.parquet], [catalog-2.parquet]]}, projection=[record_id, region], file_type=parquet
  │   BufferExec: capacity=_
  │     DataSourceExec: file_groups={2 groups: [[readings-1.parquet], [readings-2.parquet]]}, projection=[record_id, value], file_type=parquet
  └──────────────────────────────────────────────────
```

</details>

![Distributed join with four tasks, each containing two data sources and a partitioned hash join, gathered by a coordinator](docs/assets/distributed-colocated-join.png)

[Plan text](docs/assets/distributed-colocated-join.txt) · [Full-size diagram](docs/assets/distributed-colocated-join.png) · [Editable Excalidraw](docs/assets/distributed-colocated-join.excalidraw)

## Custom and unfamiliar operators

Operators with unfamiliar names can reuse source, aggregate, repartition, or join
renderers when their properties and child counts match. Their original names remain
visible; unmatched operators get neutral boxes with their inputs connected.

```text
FilterExec: value@1 > 100
  MeadowScanExec: file_groups={2 groups: [[a.parquet], [b.parquet]]}, projection=[id, value], file_type=parquet
```

Here `MeadowScanExec` uses the file-source renderer automatically. No registration
or extra installation is needed. Inline wrappers are also supported. For a custom
appearance, register a `NodeGeneratorStrategy` through the library's
`customGenerators` option; see the [custom-operator guide](docs/CUSTOM_OPERATORS.md).

## Prerequisites

Node.js **20+** and npm. Distributed support requires **plan-viz 0.1.25+**.

## Installation

One package supports single-node plans, distributed plans, and custom operators:

```sh
npm install plan-viz
```

For building from source or contributing, see [development setup](CONTRIBUTING.md#setup).

## Usage

### CLI

Save your physical EXPLAIN output as `plan.txt`, then run:

```sh
npx plan-viz -i plan.txt -o output.excalidraw
```

The plan format is detected automatically. For snapshot files with multiple sections,
add `--section 2` (1-based). See [all CLI options](docs/CLI.md).

### Library

```javascript
const { readFileSync, writeFileSync } = require('node:fs');
const { convertPlanToExcalidraw } = require('plan-viz');

const plan = readFileSync('plan.txt', 'utf8');
const scene = convertPlanToExcalidraw(plan);
writeFileSync('output.excalidraw', JSON.stringify(scene, null, 2));
```

The same function accepts single-node and distributed plans. Use
`ConverterService.convertDetailed()` for diagnostics; see the [API reference](docs/API.md).

### View and edit

Open `output.excalidraw` in [Excalidraw](https://excalidraw.com/) or an IDE Excalidraw
extension. Edit the diagram, annotate it, or export PNG/SVG for sharing.

You can also paste plan text into the [plan-visualizer web app](https://nga-tran.github.io/plan-visualizer).
Its supported features depend on the library version deployed there.

## Documentation

| Guide | Contents |
|---|---|
| [Quick start](QUICKSTART.md) | Install or build, convert, and open a drawing |
| [API](docs/API.md) / [CLI](docs/CLI.md) | Configuration, input formats, diagnostics, and options |
| [Distributed plans](docs/DISTRIBUTED_PLANS.md) | Task/stream conventions, routing, and limitations |
| [Custom operators](docs/CUSTOM_OPERATORS.md) | Automatic inference, wrappers, and custom renderers |
| [Operator catalog](docs/operators/README.md) | Supported operators and execution contracts |
| [Corpus review](docs/CORPUS_REVIEW.md) | Inventory and render collections of saved plans |
| [Architecture](docs/ARCHITECTURE.md) / [Project structure](docs/PROJECT_STRUCTURE.md) | Internals and source layout |

More examples: [single-node fixtures](tests/) and [distributed fixtures](tests/distributed/),
with editable drawings in [tests/expected](tests/expected/) and
[tests/distributed/expected](tests/distributed/expected/).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, tests, visual review, commits, and releases.

[MIT license](LICENSE) · [Changelog](CHANGELOG.md) · [GitHub](https://github.com/NGA-TRAN/plan_viz)
