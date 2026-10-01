# DataFusion operator catalog

Comparison of Apache DataFusion physical operators (`datafusion-physical-plan`
**55.1.0**, September 2026). This catalog describes the current repository;
see [the changelog](../../CHANGELOG.md) for released versus Unreleased support.

Unknown operators render neutral boxes and can reuse known renderers through structural inference.

The [Distributed DataFusion audit](distributed-datafusion.md) covers current distributed operators, public examples/test helpers, network formulas, legacy compatibility, and explicit metadata limits.

## Already implemented (34)

| Operator | Generator |
|---|---|
| `DataSourceExec` | `data-source-node.generator.ts` |
| `FilterExec` | `filter-node.generator.ts` |
| `CoalesceBatchesExec` | `coalesce-batches-node.generator.ts` |
| `CoalescePartitionsExec` | `coalesce-partitions-node.generator.ts` |
| `RepartitionExec` | `repartition-node.generator.ts` |
| `AggregateExec` | `aggregate-node.generator.ts` |
| `ProjectionExec` | `projection-node.generator.ts` |
| `SortExec` | `sort-node.generator.ts` |
| `SortPreservingMergeExec` | `sort-preserving-merge-node.generator.ts` |
| `HashJoinExec` | `hash-join-node.generator.ts` |
| `SortMergeJoin` / `SortMergeJoinExec` | `sort-merge-join-node.generator.ts` |
| `CrossJoinExec` | `cross-join-node.generator.ts` |
| `UnionExec` | `union-node.generator.ts` |
| `LocalLimitExec` | `local-limit-node.generator.ts` |
| `GlobalLimitExec` | `global-limit-node.generator.ts` |
| `WindowAggExec` | `window-agg-node.generator.ts` |
| `BoundedWindowAggExec` | `window-agg-node.generator.ts` |
| `UnnestExec` | `unnest-node.generator.ts` |
| `NestedLoopJoinExec` | `nested-loop-join-node.generator.ts` |
| `SymmetricHashJoinExec` | `symmetric-hash-join-node.generator.ts` |
| `PiecewiseMergeJoinExec` | `piecewise-merge-join-node.generator.ts` |
| `InterleaveExec` | `interleave-node.generator.ts` |
| `AnalyzeExec` | `analyze-node.generator.ts` |
| `EmptyExec` | `leaf-node.generator.ts` |
| `PlaceholderRowExec` | `leaf-node.generator.ts` |
| `LazyMemoryExec` / `ValuesExec` | `leaf-node.generator.ts` |
| `ExplainExec` | `leaf-node.generator.ts` |
| `StreamingTableExec` | `leaf-node.generator.ts` |
| `WorkTableExec` | `leaf-node.generator.ts` |
| `BufferExec` | `wrapper-node.generator.ts` |
| `CooperativeExec` | `wrapper-node.generator.ts` |
| `DataSinkExec` / `FileSinkExec` | `wrapper-node.generator.ts` |
| `RecursiveQueryExec` | `recursive-query-node.generator.ts` |
| `ScalarSubqueryExec` | `scalar-subquery-node.generator.ts` |

## Implemented operator specifications

Waves A–D are complete. These files record the local renderer contracts and
focused verification commands. Distributed count analysis is a separate contract;
consult the [distributed audit](distributed-datafusion.md) for its scope.

### Wave A — windows and unary/join additions (implemented)

| Operator | Spec | Children | Why |
|---|---|---|---|
| `WindowAggExec` | [window-agg-exec.md](window-agg-exec.md) | 1 | Window expressions |
| `BoundedWindowAggExec` | [bounded-window-agg-exec.md](bounded-window-agg-exec.md) | 1 | Streaming window expressions |
| `NestedLoopJoinExec` | [nested-loop-join-exec.md](nested-loop-join-exec.md) | 2 | Non-equijoin predicates |
| `UnnestExec` | [unnest-exec.md](unnest-exec.md) | 1 | Expand list/struct values |

### Wave B — joins and set-like fan-in (implemented)

| Operator | Spec | Children | Why |
|---|---|---|---|
| `SymmetricHashJoinExec` | [symmetric-hash-join-exec.md](./symmetric-hash-join-exec.md) | 2 | Streaming / range joins |
| `PiecewiseMergeJoinExec` | [piecewise-merge-join-exec.md](./piecewise-merge-join-exec.md) | 2 | Single range predicate |
| `InterleaveExec` | [interleave-exec.md](./interleave-exec.md) | N | Hash-partition union sibling |

### Wave C — leaves and wrappers (implemented)

| Operator | Spec | Children | Why |
|---|---|---|---|
| `AnalyzeExec` | [analyze-exec.md](./analyze-exec.md) | 1 | `EXPLAIN ANALYZE` wrapper |
| `EmptyExec` | [empty-exec.md](./empty-exec.md) | 0 | Empty relation |
| `PlaceholderRowExec` | [placeholder-row-exec.md](./placeholder-row-exec.md) | 0 | `SELECT` without `FROM` |
| `LazyMemoryExec` | [lazy-memory-exec.md](./lazy-memory-exec.md) | 0 | In-memory / VALUES-like |

### Wave D — rare / experimental (implemented)

| Operator | Spec | Children | Why |
|---|---|---|---|
| `ExplainExec` | [explain-exec.md](./explain-exec.md) | 0 | `EXPLAIN` result leaf |
| `StreamingTableExec` | [streaming-table-exec.md](./streaming-table-exec.md) | 0 | Streaming source |
| `WorkTableExec` | [work-table-exec.md](./work-table-exec.md) | 0 | Recursive CTE work table |
| `BufferExec` | [buffer-exec.md](./buffer-exec.md) | 1 | Prefetch buffer |
| `CooperativeExec` | [cooperative-exec.md](./cooperative-exec.md) | 1 | Scheduler wrapper |
| `DataSinkExec` / `FileSinkExec` | [data-sink-exec.md](./data-sink-exec.md) | 1 | Write path |
| `RecursiveQueryExec` | [recursive-query-exec.md](./recursive-query-exec.md) | 2 | Recursive CTE |
| `ScalarSubqueryExec` | [scalar-subquery-exec.md](./scalar-subquery-exec.md) | N | Uncorrelated scalar subqueries |

## Not operators (do not implement)

These appeared on the old `MISSING_OPERATORS.md` list. They are **not**
standalone physical `*Exec` nodes in DataFusion 55:

| Name | What actually happens |
|---|---|
| `IntersectExec` | `INTERSECT` → `HashJoinExec` `join_type=LeftSemi` |
| `ExceptExec` | `EXCEPT` → `HashJoinExec` `join_type=LeftAnti` |
| `TopKExec` | `SortExec` with `fetch=N` (internal `TopK` helper, not an EXPLAIN name) |
| `DeduplicateExec` / `DistinctExec` | `AggregateExec` |
| `ParquetExec` / `CsvExec` / `JsonExec` | Folded into `DataSourceExec` |
| `ValuesExec` | Legacy name; registered to the same generator as `LazyMemoryExec` |
| `ExtensionExec` | User-defined; use `customGenerators` (already shipped in 0.1.15) |

## Remaining scope and review

Unknown operators can reuse a structurally compatible renderer or retain a
neutral box. This is not a claim that all dependency operators have audited
distributed partition semantics. Missing task/source metadata remains visible.

For new operators or contract changes, use [WORKFLOW.md](WORKFLOW.md), confirm
the execution behavior from source, and review both semantic tests and the
expected drawing. Public upstream names can have explicit support; private
extensions should use structural inference and sanitized fixtures.

Template for a new spec: [_TEMPLATE.md](./_TEMPLATE.md).
