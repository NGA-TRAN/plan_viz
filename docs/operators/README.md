# DataFusion operator catalog

Comparison of Apache DataFusion physical operators (`datafusion-physical-plan`
**55.1.0**, September 2026) against plan-viz **0.1.22**.

Unknown operators already render via `DefaultNodeGenerator` (red
`unimplemented`). This catalog is the work queue to replace that fallback with
real diagrams.

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

## Missing — implement these

Reviewed against DataFusion 55.1.0 source and docs.rs. Waves A–D are done.

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

## How to review

1. Read [WORKFLOW.md](./WORKFLOW.md).
2. Waves A–D are implemented. Review only if new DataFusion operators appear.
3. Reply with which specs are approved (or request visual changes).
4. Implementation starts only after that approval.

Template for a new spec: [_TEMPLATE.md](./_TEMPLATE.md).
