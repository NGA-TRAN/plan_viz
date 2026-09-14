# Missing DataFusion physical plan operators

This file is a short pointer. The living catalog and per-operator specs are
in [`docs/operators/`](./docs/operators/README.md).

Compared against **datafusion-physical-plan 55.1.0**.

## Implemented (19)

DataSourceExec, FilterExec, CoalesceBatchesExec, CoalescePartitionsExec,
RepartitionExec, AggregateExec, ProjectionExec, SortExec,
SortPreservingMergeExec, HashJoinExec, SortMergeJoin / SortMergeJoinExec,
UnionExec, LocalLimitExec, GlobalLimitExec, CrossJoinExec, WindowAggExec,
BoundedWindowAggExec, NestedLoopJoinExec, UnnestExec.

## Missing (specs ready for review)

**Wave A (implemented):** [WindowAggExec](docs/operators/window-agg-exec.md),
[BoundedWindowAggExec](docs/operators/bounded-window-agg-exec.md),
[NestedLoopJoinExec](docs/operators/nested-loop-join-exec.md),
[UnnestExec](docs/operators/unnest-exec.md)

**Wave B:** [SymmetricHashJoinExec](docs/operators/symmetric-hash-join-exec.md),
[PiecewiseMergeJoinExec](docs/operators/piecewise-merge-join-exec.md),
[InterleaveExec](docs/operators/interleave-exec.md)

**Wave C:** [AnalyzeExec](docs/operators/analyze-exec.md),
[EmptyExec](docs/operators/empty-exec.md),
[PlaceholderRowExec](docs/operators/placeholder-row-exec.md),
[LazyMemoryExec](docs/operators/lazy-memory-exec.md)

**Wave D (later):** ExplainExec, StreamingTableExec, RecursiveQueryExec,
WorkTableExec, BufferExec, CooperativeExec, ScalarSubqueryExec, FileSinkExec.

## Not real physical operators

`IntersectExec` / `ExceptExec` are rewritten to `HashJoinExec` (LeftSemi /
LeftAnti). `TopKExec` is `SortExec` + `fetch`. `ParquetExec` / `CsvExec` /
`JsonExec` folded into `DataSourceExec`. `DistinctExec` is `AggregateExec`.
Custom ops use `customGenerators` (v0.1.15).

## Workflow

See [docs/operators/WORKFLOW.md](docs/operators/WORKFLOW.md). Do not use
generic Spec Kit for one-operator additions.
