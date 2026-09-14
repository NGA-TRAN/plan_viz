# LazyMemoryExec

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | P2 |
| Wave | C |
| Children | 0 |
| Copy from | `src/generators/generators/data-source-node.generator.ts` |
| DataFusion | `memory::LazyMemoryExec` |

## What it does

Leaf that yields in-memory batches (VALUES, `MemTable`, test tables). Older
plans sometimes printed `ValuesExec`; current crate name is `LazyMemoryExec`.

## EXPLAIN contract

```
LazyMemoryExec: partitions=4, partition_sizes=[1, 1, 1, 1]
```

or a `Values` / schema-only line. Display whatever properties exist.

Also register **`ValuesExec`** to the same generator so legacy fixtures work.

## Visualization

- Leaf like DataSource, **without** parquet file-group parsing.
- Output arrows: parse `partitions=N` if present; else 1.
- No DynamicFilter ellipse.
- Details: `partitions=...` / `partition_sizes=...`.

## Tests

- Unit: `LazyMemoryExec` and `ValuesExec` both render (not unimplemented);
  4 partitions → 4 arrows
- Integration: `tests/memory_lazy_4.sql` + expected

## Verify

```bash
./scripts/verify-operator.sh memory
```

## Files this operator may touch

Owned files + `register('LazyMemoryExec', ...)` and `register('ValuesExec', ...)`.
