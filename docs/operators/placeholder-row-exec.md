# PlaceholderRowExec

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | P2 |
| Wave | C |
| Children | 0 |
| Copy from | Same leaf treatment as `EmptyExec` |
| DataFusion | `placeholder_row::PlaceholderRowExec` |

## What it does

Empty relation with `produce_one_row=true`. Used for `SELECT 1` / expressions
with no table.

## EXPLAIN contract

```
PlaceholderRowExec
```

## Visualization

- Leaf. **One** output arrow (one dummy row stream).
- Details: `produce_one_row=true` so it is visually distinct from `EmptyExec`.

## Tests

- Unit: label, one output arrow when used under a projection
- Integration: `tests/placeholder_row_basic.sql` + expected

## Verify

```bash
./scripts/verify-operator.sh placeholder
```

## Files this operator may touch

Owned files + `register('PlaceholderRowExec', ...)`.

May share a tiny leaf helper with `EmptyExec` if both Wave C leaf specs are
approved together. Different output arrow counts must stay correct.
