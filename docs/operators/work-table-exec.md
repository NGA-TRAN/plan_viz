# WorkTableExec

| Field | Value |
|---|---|
| Status | Implemented |
| Priority | P2 |
| Wave | D |
| Children | 0 |
| Copy from | `src/generators/generators/leaf-node.generator.ts` |
| DataFusion | `work_table::WorkTableExec` |

## What it does

Work-table leaf used by recursive CTEs. Streams batches written by
`RecursiveQueryExec`. Always partition 0.

## EXPLAIN contract

```
WorkTableExec: name=cte
```

## Visualization

- Leaf. One output arrow.
- Details: `name=...`.

## Tests

- Unit: label, `name`, not unimplemented
- Integration: `tests/work_table_basic.sql` + expected

## Verify

```bash
./scripts/verify-operator.sh work_table
```

## Files this operator may touch

Owned tests/fixtures + `register('WorkTableExec', ...)` and leaf options.
