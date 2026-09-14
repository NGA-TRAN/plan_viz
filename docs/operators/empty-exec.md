# EmptyExec

| Field | Value |
|---|---|
| Status | Proposed |
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

- Leaf. **Zero** output arrows if it is the root; if it is a child of a join
  or union, it contributes **0** input arrows to the parent (parent must
  tolerate that — HashJoin already has children).
- Details: `empty` or `produce_one_row=false`.
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
