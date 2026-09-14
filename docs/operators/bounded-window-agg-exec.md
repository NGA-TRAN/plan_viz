# BoundedWindowAggExec

| Field | Value |
|---|---|
| Status | Implemented |
| Priority | P0 |
| Wave | A |
| Children | 1 |
| Copy from | Same visual language as `WindowAggExec` |
| DataFusion | `windows::BoundedWindowAggExec` |

## What it does

Window operator used when every window expression `uses_bounded_memory()`.
Same user-facing meaning as `WindowAggExec`, different engine implementation
(can stream). EXPLAIN name is distinct, so it needs its own registry key.

## EXPLAIN contract

```
BoundedWindowAggExec: wdw=[sum(val): Field { ... }, frame: WindowFrame { units: Rows, ... }], mode=[Sorted]
  DataSourceExec: file_groups={2 groups: [[t1.parquet], [t2.parquet]]}
```

Properties: `wdw`, sometimes `mode` (`Sorted` / `Linear` / `PartiallySorted`
from `InputOrderMode`).

## Visualization

Identical layout to `WindowAggExec`:

- Unary, vertical child, 1:1 arrows, preserve sort
- Operator label **`BoundedWindowAggExec`**
- Details: `wdw=[...]` plus `mode=...` in `COLORS.PURPLE_MODE` (same as
  `AggregateExec` mode)

If both window specs are approved together, one `WindowAggNodeGenerator`
constructed with the operator label is fine. Register both names.

## Tests

Unit — `src/generators/__tests__/operators/bounded-window-agg-exec.test.ts`:

- Label is `BoundedWindowAggExec`, not `WindowAggExec`
- `mode` is rendered when present
- Not red `unimplemented`

Integration:

- `tests/window_bounded_basic.sql` + matching expected file

## Verify

```bash
./scripts/verify-operator.sh window_bounded
```

## Files this operator may touch

Owned test/sql/expected files plus register line
`register('BoundedWindowAggExec', ...)`.

May share the generator class with `WindowAggExec` if both are in the same PR.

## Out of scope

Drawing the sliding window itself. Mode-specific layout changes.
