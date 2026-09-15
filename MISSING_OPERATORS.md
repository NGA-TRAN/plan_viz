# Missing DataFusion physical plan operators

This file is a short pointer. The living catalog and per-operator specs are
in [`docs/operators/`](./docs/operators/README.md).

Compared against **datafusion-physical-plan 55.1.0**.

## Implemented (34)

DataSourceExec, FilterExec, CoalesceBatchesExec, CoalescePartitionsExec,
RepartitionExec, AggregateExec, ProjectionExec, SortExec,
SortPreservingMergeExec, HashJoinExec, SortMergeJoin / SortMergeJoinExec,
UnionExec, LocalLimitExec, GlobalLimitExec, CrossJoinExec, WindowAggExec,
BoundedWindowAggExec, NestedLoopJoinExec, UnnestExec, SymmetricHashJoinExec,
PiecewiseMergeJoinExec, InterleaveExec, AnalyzeExec, EmptyExec,
PlaceholderRowExec, LazyMemoryExec / ValuesExec, ExplainExec,
StreamingTableExec, WorkTableExec, BufferExec, CooperativeExec,
DataSinkExec / FileSinkExec, RecursiveQueryExec, ScalarSubqueryExec.

## Missing (specs ready for review)

**Wave A (implemented):** [WindowAggExec](docs/operators/window-agg-exec.md),
[BoundedWindowAggExec](docs/operators/bounded-window-agg-exec.md),
[NestedLoopJoinExec](docs/operators/nested-loop-join-exec.md),
[UnnestExec](docs/operators/unnest-exec.md)

**Wave B (implemented):** [SymmetricHashJoinExec](docs/operators/symmetric-hash-join-exec.md),
[PiecewiseMergeJoinExec](docs/operators/piecewise-merge-join-exec.md),
[InterleaveExec](docs/operators/interleave-exec.md)

**Wave C (implemented):** [AnalyzeExec](docs/operators/analyze-exec.md),
[EmptyExec](docs/operators/empty-exec.md),
[PlaceholderRowExec](docs/operators/placeholder-row-exec.md),
[LazyMemoryExec](docs/operators/lazy-memory-exec.md)

**Wave D (implemented):** [ExplainExec](docs/operators/explain-exec.md),
[StreamingTableExec](docs/operators/streaming-table-exec.md),
[WorkTableExec](docs/operators/work-table-exec.md),
[BufferExec](docs/operators/buffer-exec.md),
[CooperativeExec](docs/operators/cooperative-exec.md),
[DataSinkExec](docs/operators/data-sink-exec.md),
[RecursiveQueryExec](docs/operators/recursive-query-exec.md),
[ScalarSubqueryExec](docs/operators/scalar-subquery-exec.md)

## Not real physical operators

`IntersectExec` / `ExceptExec` are rewritten to `HashJoinExec` (LeftSemi /
LeftAnti). `TopKExec` is `SortExec` + `fetch`. `ParquetExec` / `CsvExec` /
`JsonExec` folded into `DataSourceExec`. `DistinctExec` is `AggregateExec`.
`ValuesExec` is registered to the `LazyMemoryExec` renderer. Custom ops use
`customGenerators` (v0.1.15).

## Workflow

See [docs/operators/WORKFLOW.md](docs/operators/WORKFLOW.md). Do not use
generic Spec Kit for one-operator additions.
