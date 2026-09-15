# StreamingTableExec

| Field | Value |
|---|---|
| Status | Implemented |
| Priority | P2 |
| Wave | D |
| Children | 0 |
| Copy from | `src/generators/generators/leaf-node.generator.ts` |
| DataFusion | `streaming::StreamingTableExec` |

## What it does

Leaf source backed by one or more `PartitionStream`s (streaming / deferred
tables). Similar to DataSource, without file-group ellipses.

## EXPLAIN contract

```
StreamingTableExec: partition_sizes=4, projection=[id], infinite_source=true, fetch=10
```

`partition_sizes` is the partition count (DataFusion prints `partitions.len()`).

## Visualization

- Leaf like LazyMemory. Output arrows = `partition_sizes` (else 1).
- Details: `partition_sizes`, `projection`, `infinite_source`, `fetch` when present.
- No file-group ellipses.

## Tests

- Unit: 4 partitions → 4 arrows; not unimplemented
- Integration: `tests/streaming_basic.sql` + expected
- Real plan: `tests/window_streaming_unbounded.sql` (`window.slt` unbounded source)

## Verify

```bash
./scripts/verify-operator.sh streaming
```

## Files this operator may touch

Owned tests/fixtures + `register('StreamingTableExec', ...)` and leaf options.
