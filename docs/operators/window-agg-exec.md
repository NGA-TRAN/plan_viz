# WindowAggExec

| Field | Value |
|---|---|
| Status | Implemented |
| Priority | P0 |
| Wave | A |
| Children | 1 |
| Copy from | `src/generators/generators/aggregate-node.generator.ts` |
| DataFusion | `windows::WindowAggExec` in datafusion-physical-plan 55.1.0 |

## What it does

Evaluates window functions (`OVER (PARTITION BY … ORDER BY …)`). It keeps the
input row count and appends window columns. DataFusion picks this variant when
the window cannot run in bounded memory.

## EXPLAIN contract

```
WindowAggExec: wdw=[row_number(): Field { name: "row_number", ... }, frame: WindowFrame { ... }]
  SortExec: expr=[user_id@0 ASC, ts@1 ASC], preserve_partitioning=[true]
    DataSourceExec: file_groups={4 groups: [[a.parquet], [b.parquet], [c.parquet], [d.parquet]]}
```

Parser already stores `wdw` as `node.properties.wdw`. No parser change.

Typical properties:

- `wdw` — list of window expressions, field metadata, frame

## Visualization

- Unary, **vertical** child (same as `AggregateExec` / `FilterExec`).
- Arrows: **1:1** with the child. Windows do not coalesce partitions.
- Sort-order: **preserve** child `outputSortOrder` and also treat PARTITION BY /
  ORDER BY column names as ordered when they can be parsed from `wdw`.
- No special glyph.
- Details:
  - first line: truncated `wdw=[...]` (full string if short)
  - if parseable, show `partition_by` / `order_by` on following lines
  - color PARTITION BY / ORDER BY names with `COLORS.ORDERED_COLUMN` when they
    match child output columns

## Tests

Unit — `src/generators/__tests__/operators/window-agg-exec.test.ts`:

- Renders text `WindowAggExec` (not `unimplemented`)
- Shows `wdw` detail text
- One child, arrow count equals child `inputArrowCount`
- Propagates child columns and sort order
- Zero or two children still render (do not throw; DataFusion is always unary,
  but the parser must not crash on bad input — treat extra children as vertical)

Integration:

- `tests/window_agg_basic.sql` — window over `SortExec` then a 4-group scan
- `tests/window_agg_sorted.sql` — window directly on a 4-group scan that already
  has `output_ordering` (no `SortExec`)
- matching `tests/expected/*.excalidraw` files

## Verify

```bash
./scripts/verify-operator.sh window
```

Open `tests/expected/window_agg_basic.excalidraw` and
`tests/expected/window_agg_sorted.excalidraw` in the Excalidraw extension.

## Files this operator may touch

- `src/generators/generators/window-agg-node.generator.ts` (new)
- `src/generators/__tests__/operators/window-agg-exec.test.ts` (new)
- `tests/window_agg_basic.sql` + `tests/expected/window_agg_basic.excalidraw`
- one `register('WindowAggExec', ...)` line
- this spec → `Implemented`

Optional shared base with `BoundedWindowAggExec` is allowed **only if both
Wave A window specs are approved together**. Otherwise keep a dedicated class.

## Out of scope

Parser changes, frame-diagram artwork, tree-format EXPLAIN (`select_list=`).
