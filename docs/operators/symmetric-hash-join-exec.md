# SymmetricHashJoinExec

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | P1 |
| Wave | B |
| Children | 2 |
| Copy from | `src/generators/generators/hash-join-node.generator.ts` |
| DataFusion | `joins::SymmetricHashJoinExec` |

## What it does

Streaming join: both sides keep a hash table and probe each other, often with
a time/range window. Used for unbounded / streaming plans.

## EXPLAIN contract

```
SymmetricHashJoinExec: mode=Partitioned, join_type=Inner, on=[(l@0, r@0)], filter=l.ts@1 > r.ts@1 - Interval
  DataSourceExec: file_groups={2 groups: [[l.parquet], [l2.parquet]]}
  DataSourceExec: file_groups={2 groups: [[r.parquet], [r2.parquet]]}
```

Properties: `mode` (`Partitioned` / `SinglePartition`), `join_type`, `on`,
optional `filter`.

## Visualization

- Two children, horizontal, throw if not 2.
- **Two** small orange hash-table ellipses (left and right of the node text)
  to distinguish from `HashJoinExec` (one ellipse). Reuse
  `COLORS.ORANGE_BORDER` / `HASH_TABLE_DIMENSIONS`.
- Output arrows: same partition count as **either** side when partitioned
  (they should match). Use `max(leftArrows, rightArrows)` if they differ.
- Sort-order: do not claim preserved order.
- Details: `mode`, `join_type`, `on`, `filter` — same property lines as HashJoin.

## Tests

Unit — `src/generators/__tests__/operators/symmetric-hash-join-exec.test.ts`:

- Label `SymmetricHashJoinExec`
- Two ellipses (hash tables)
- Throws if child count ≠ 2
- Properties rendered

Integration:

- `tests/join_symmetric_hash.sql` + expected

## Verify

```bash
./scripts/verify-operator.sh join_symmetric
```

Confirm two orange ellipses, not the single HashJoin glyph.

## Files this operator may touch

Owned generator/tests/fixtures + `register('SymmetricHashJoinExec', ...)`.

Do not change `hash-join-node.generator.ts`.

## Out of scope

Animating the sliding window, watermark glyphs.
