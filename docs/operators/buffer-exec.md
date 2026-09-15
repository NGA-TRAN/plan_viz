# BufferExec

| Field | Value |
|---|---|
| Status | Implemented |
| Priority | P2 |
| Wave | D |
| Children | 1 |
| Copy from | `src/generators/generators/analyze-node.generator.ts` |
| DataFusion | `buffer::BufferExec` |

## What it does

Experimental prefetch buffer. Decouples production and consumption up to a
byte capacity. Pass-through for partitions, columns, and sort.

## EXPLAIN contract

```
BufferExec: capacity=8192
  DataSourceExec: ...
```

## Visualization

- Unary wrapper. 1:1 arrows. Preserve child columns/sort.
- Details: `capacity=...`.

## Tests

- Unit: label, capacity, not unimplemented; 2 child partitions stay 2
- Integration: `tests/buffer_basic.sql` + expected

## Verify

```bash
./scripts/verify-operator.sh buffer
```

## Files this operator may touch

`wrapper-node.generator.ts` + register + tests/fixtures.
