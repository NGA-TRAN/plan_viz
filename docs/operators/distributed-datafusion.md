# Distributed DataFusion operator audit

Status: implemented and tested against upstream revision [`b32ee66e5f12227a5fe8e8444a022991da0758ea`](https://github.com/datafusion-contrib/datafusion-distributed/tree/b32ee66e5f12227a5fe8e8444a022991da0758ea).

This audit covers all **20 concrete ExecutionPlan implementations** declared in that checkout's `src`, `examples`, `tests`, and `iceberg` trees, plus one historical operator still present in its snapshots. It does not assert that every Apache DataFusion dependency operator or every future extension has a complete count contract. Public upstream names may have dedicated support; private vendor extensions continue to use structural inference.

[Machine-readable inventory](distributed-datafusion-audit.json) records each source path, contract, support status, and test file. Constructors, printed fields, properties, task specialization, and execution paths were inspected. Counts represent logical partition capacity, including empty partitions, rather than rows or physical TCP connections.

## Current library operators

All source links below are pinned to the audited revision.

| Operator | Execution and drawing contract | Tests / saved drawing |
|---|---|---|
| [DistributedExec](https://github.com/datafusion-contrib/datafusion-distributed/blob/b32ee66e5f12227a5fe8e8444a022991da0758ea/src/coordinator/distributed.rs) | Runs the coordinator head at partition zero and prepares remote tasks. Boxed EXPLAIN becomes the head-stage container; a recorded tree retains its wrapper. | `gather_four_tasks`, parser tests |
| [DistributedAnalyzeExec](https://github.com/datafusion-contrib/datafusion-distributed/blob/b32ee66e5f12227a5fe8e8444a022991da0758ea/src/explain_analyze.rs) | Drains execution, gathers metrics and emits one EXPLAIN result stream. Accepts the actual colonless `verbose=true` display. | Public-operator parser/count tests |
| [DistributedLeafExec](https://github.com/datafusion-contrib/datafusion-distributed/blob/b32ee66e5f12227a5fe8e8444a022991da0758ea/src/execution_plans/distributed_leaf.rs) | Uses original leaf for one task or selects a prebuilt task variant. Expanded variants are selected by effective task context; inline wrappers retain their labels. No fabricated extra network stage. | Task-variant parser tests, `colocated_join_four_tasks` |
| [ChildrenIsolatorUnionExec](https://github.com/datafusion-contrib/datafusion-distributed/blob/b32ee66e5f12227a5fe8e8444a022991da0758ea/src/execution_plans/children_isolator_union.rs) | Display name is **DistributedUnionExec**. Draw active branches under child-local contexts. Capacity is the largest assigned partition sum; shorter assignments have empty slots. | `union_distinct_branches`, `union_five_branches_metrics`, `count_distinct_union_time_ranges` |
| [NetworkCoalesceExec](https://github.com/datafusion-contrib/datafusion-distributed/blob/b32ee66e5f12227a5fe8e8444a022991da0758ea/src/execution_plans/network_coalesce.rs) | Each receiver gathers a contiguous group of producer tasks. Purple bundles terminate on the operator. Uneven groups retain advertised capacity and show assigned streams/empty padding. | `gather_four_tasks`, `grouped_gather_partial_reduction`; grouped-gather matrix |
| [NetworkShuffleExec](https://github.com/datafusion-contrib/datafusion-distributed/blob/b32ee66e5f12227a5fe8e8444a022991da0758ea/src/execution_plans/network_shuffle.rs) | Direct and two-phase modes differ in streams per producer-consumer pair. Preserve printed sort-merge details; see formulas below. | `hash_aggregate_four_to_three`, `shuffle_partial_reduce`, `shuffle_two_phase` |
| [BroadcastExec](https://github.com/datafusion-contrib/datafusion-distributed/blob/b32ee66e5f12227a5fe8e8444a022991da0758ea/src/execution_plans/broadcast.rs) | Reads each input partition once into a shared queue and exposes one copy per consumer task. Input P → output P×C; stream-aware neutral box with original fields. | `broadcast_three_to_two`, public-operator matrix |
| [NetworkBroadcastExec](https://github.com/datafusion-contrib/datafusion-distributed/blob/b32ee66e5f12227a5fe8e8444a022991da0758ea/src/execution_plans/network_broadcast.rs) | Every receiver reads Q streams from every producer; `partitions_per_consumer=Q` determines output capacity. `stage_partitions=0` in a remote recording does not mean zero output. | `broadcast_three_to_two`, UNION-context and worker-recording tests |
| [SamplerExec](https://github.com/datafusion-contrib/datafusion-distributed/blob/b32ee66e5f12227a5fe8e8444a022991da0758ea/src/execution_plans/sampler.rs) | Samples for adaptive planning, then hands buffered data and the remaining stream to execution. It preserves partitioning, ordering and rows; it is not a row-dropping sample filter. `partitions` counts sampler streams. | `broadcast_three_to_two`, preserving-count tests |
| [MetricsWrapperExec](https://github.com/datafusion-contrib/datafusion-distributed/blob/b32ee66e5f12227a5fe8e8444a022991da0758ea/src/execution_plans/metrics.rs) | Hidden during EXPLAIN: delegates formatting/children and combines metrics. Its `execute` is unimplemented. Keep inner operator/metrics; do not invent a separate execution box. | Metrics-bearing parser fixtures |

## Network formulas

Let N be producer tasks, C the **effective** consumer task count (including UNION child contexts), P producer output capacity, and Q receiver output capacity.

- **Gather:** Q = P × max(ceil(N/C), 1). Producer groups are contiguous and balanced; earliest receivers get the remainder. One purple bundle per assigned pair carries P logical streams. Empty padding does not create a producer connection.
- **Direct shuffle:** P = C × Q. Every consumer reads Q partitions from each producer, so there are N×C bundles carrying Q streams each. A PartialReduce above the producer Repartition preserves this contract; the repartition need not be the stage root. Ordered inputs are sort-merged across producers.
- **Two-phase shuffle:** P = C and Q = N. Consumer task t, output partition p, reads producer p's partition t. Every pair carries **one** stream; a downstream local repartition restores hash partitioning. The upstream display omits the mode, so we distinguish it using these counts. With N=1 both modes have the same pair/stream mapping. Missing evidence remains unresolved; no salt literal is hard-coded.
- **Broadcast:** P = C × Q. Each receiver requests Q partitions from every producer, but these contain replicated data. BroadcastExec selects original input partition `requested_partition % Q`; cached data is shared rather than reread for each consumer. UNION uses the child task index/count, not the enclosing stage task count.

Arrow multiplicity follows audited counts, including custom sources whose counts can be established from consumer metadata. Large stream counts use representative arrows and an omission marker. Unknown contracts retain neutral topology and visible unknown counts. Network arrows describe logical stream bundles, not gRPC/TCP socket counts.

## Public examples and test helpers

These are public source definitions, but not all are exported library APIs. Their source paths and tests are listed in the inventory.

| Operator | Learned behavior / representation |
|---|---|
| `NumbersExec` | One output partition per task. `t0:[start-end)` values select numeric ranges, not extra streams. Shared upstream source renderer. |
| `RemoteScanExec` | Global `partition_chunks` lists are divided using Rust integer division by the effective task count after scaling. Inner values are chunk row counts. Standalone source retains the global count; worker-only recordings without task context need consumer evidence. |
| `RowGeneratorExec` | Same scaling rule for `partition_ops`; `rows(n)` describes work/rows, not a partition count. Empty outer groups still occupy partition slots. Requested `tasks` metadata can differ from the effective UNION child context. |
| `CacheExec` | Returns cached batches or forwards the corresponding child partition; preserves columns, ordering and capacity. |
| `URLEmitterExec` | `partitions` is advertised capacity, including possible empty padding. Emits worker identity for routing tests; URL is not a new stage or host-layout contract. |
| `MockExec` | Constructor accepts arbitrary partition count but EXPLAIN prints only the name. A neutral box and unknown count are correct unless consumer evidence supplies the missing capacity. |
| `StatefulPassThroughExec`, `CustomPassThroughExec` | Copy child partitioning and forward streams; neutral boxes preserve logical capacity. |
| `CustomConfigExtensionRequiredExec` | Copies partitioning; execution may fail if an extension is absent or requests an error. Capacity is not a promise of successful execution. |
| `ErrorThrowingExec` | Advertises child partition capacity but returns an error stream. Do not interpret diagram capacity as successfully emitted rows. |

## Historical PartitionIsolatorExec

Audited against [the last compact-format implementation](https://github.com/datafusion-contrib/datafusion-distributed/blob/ee15e30c07fb8b2d8dff6911361783569af6a61e/src/execution_plans/partition_isolator.rs). Later upstream replaced it with DistributedLeafExec; two saved TPC-DS snapshots still contain it.

`tasks=T partitions=P` prints **global child partitions**, not local output partitions. Output capacity is ceil(P/T). Execution selects a contiguous balanced slice using task index, returning empty streams for unused slots. The drawing retains the global child plan below the selection operator and shows local output capacity, assigned streams and padding. It does not pretend that every global file group is read by every task. The legacy verbose-only mapping format without printed counts remains metadata-limited.

Saved drawing: `tests/distributed/expected/legacy_partition_isolator.excalidraw` (7 global partitions across 3 tasks → capacity 3 each, assigned 3/2/2, padding 0/1/1).

## Limits and verification

A complete printed plan and an abbreviated planner/debug sketch carry different evidence. A documentation sketch with omitted Repartition/file metadata, a worker-only recording, or a pre-assignment `ChildrenIsolatorUnionExec` cannot establish a full runtime topology. These retain diagnostics. No warnings are suppressed to make a gallery look complete.

A supporting DataFusion 55 nested-loop join count contract was verified in `NestedLoopJoinExec::compute_properties` / `asymmetric_join_output_partitioning`: all join types retain the probe-side partition count. This resolves the nested-loop counts in the upstream distributed integration plans.

```sh
node scripts/audit-upstream-operators.cjs /path/to/datafusion-distributed
npm test -- --runInBand --coverage=false upstream-operators grouped-gather distributed-plan.parser
npm test -- --runInBand --coverage=false tests/integration.test.ts
npm run build
npm run lint
```

The inventory command fails for a different upstream revision or an added, removed, or undocumented ExecutionPlan implementation. This is an audit at a pinned revision, not a guarantee about future upstream changes. Saved Excalidraw drawings and semantic tests are checked in; external corpus exports remain local review artifacts.

## Review drawings

Every fixture in [tests/distributed](../../tests/distributed/) has a matching
[expected Excalidraw scene](../../tests/distributed/expected/), checked by
`tests/integration.test.ts`. Useful starting points:

| Behavior | Fixture / expected drawing basename |
|---|---|
| Basic gather and representative tasks | `gather_four_tasks` |
| Uneven producer groups and empty padding | `grouped_gather_partial_reduction` |
| Broadcast copies and receiver bundles | `broadcast_three_to_two` |
| Direct shuffle beneath partial reduction | `shuffle_partial_reduce` |
| One stream per producer/consumer pair | `shuffle_two_phase` |
| UNION task assignments and distinct branches | `union_distinct_branches`, `count_distinct_union_time_ranges` |
| Two shuffles around a full outer join | `full_outer_join_two_shuffles` |
| Historical global-to-local isolation | `legacy_partition_isolator` |

The inventory includes public example/test helpers as well as library operators.
A metadata-limited helper such as `MockExec` is documented and tested as unknown
when its EXPLAIN text omits the count; an audit entry is not a promise that every
recorded plan can be reconstructed completely. Standalone sampler tests also
check inferred child stream counts and retention of topology when source
metadata is absent.
