# UnnestExec

| Field | Value |
|---|---|
| Status | Implemented |
| Priority | P0 |
| Wave | A |
| Children | 1 |
| Copy from | `src/generators/generators/projection-node.generator.ts` |
| DataFusion | `unnest::UnnestExec` |

## What it does

Expands list columns into rows and/or struct columns into columns (`UNNEST`).
Partition count is unchanged; cardinality of rows can grow.

## EXPLAIN contract

Typical indent output looks like:

```
UnnestExec: list_type=[arr@1], struct_type=[]
  ProjectionExec: expr=[id@0, arr@1]
    DataSourceExec: file_groups={3 groups: [[a.parquet], [b.parquet], [c.parquet]]}
```

Exact key names vary (`list_type`, `struct_type`, or column lists). Treat
whatever `key=value` pairs the parser extracts as detail text. No parser change
unless a fixture shows a positional-only line (unlikely).

## Visualization

- Unary, vertical child.
- Arrows: **1:1** with the child (unnest is per-partition).
- Sort-order: **drop** output sort by default. Unnesting lists breaks row
  order guarantees. Do not color child sort columns on the output arrows.
- Details: show list/struct column lists. No special glyph.
- Output columns: if a projection-like list is present, use it; else pass
  through child columns plus a note is not required.

## Tests

Unit — `src/generators/__tests__/operators/unnest-exec.test.ts`:

- Label `UnnestExec`, not unimplemented
- Detail text includes the list/struct property
- Arrow count equals child
- `outputSortOrder` is empty even when the child is sorted

Integration:

- `tests/unnest_basic.sql` + `tests/expected/unnest_basic.excalidraw`

## Verify

```bash
./scripts/verify-operator.sh unnest
```

## Files this operator may touch

Owned generator, unit test, sql/expected pair, one register line.

## Out of scope

Recursive unnest depth diagrams, struct-field explosion artwork.
