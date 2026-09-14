# EmptyExec

| Field | Value |
|---|---|
| Status | Implemented |
| Priority | P2 |
| Wave | C |
| Children | 0 |
| Copy from | `src/generators/generators/data-source-node.generator.ts` (leaf box only; no file groups) |
| DataFusion | `empty::EmptyExec` |

## What it does

Empty relation (`produce_one_row=false`). A leaf. Shows up in `WHERE false`,
uncorrelated empty sides, and some optimizer outputs.

## EXPLAIN contract

```
EmptyExec
```

or

```
EmptyExec: produce_one_row=false
```

## Visualization

- Leaf. Draw **one** arrow to the parent so the tree is readable (not a
  floating box). Root still has no outgoing arrows.
- Details: `empty` or `produce_one_row=false` — that is what means “no rows,”
  not a missing edge.
- No file-group ellipses.

## Tests

- Unit: label, no children, not unimplemented
- Integration: `tests/empty_basic.sql` — `ProjectionExec` over `EmptyExec`

## Verify

```bash
./scripts/verify-operator.sh empty
```

## Files this operator may touch

Owned files + `register('EmptyExec', ...)`.
