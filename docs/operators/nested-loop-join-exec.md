# NestedLoopJoinExec

| Field | Value |
|---|---|
| Status | Implemented |
| Priority | P0 |
| Wave | A |
| Children | 2 |
| Copy from | `src/generators/generators/cross-join-node.generator.ts` (layout) and `hash-join-node.generator.ts` (join properties) |
| DataFusion | `joins::NestedLoopJoinExec` |

## What it does

Build-probe join for predicates that are **not** equijoins (no `on=[(l, r)]`
keys). DataFusion uses it when the ON clause is a filter only. Left side is
buffered (and may spill). Common for `JOIN ... ON a.x > b.y` or
`OR` predicates.

## EXPLAIN contract

```
NestedLoopJoinExec: join_type=Inner, filter=left.x@0 > right.y@0
  DataSourceExec: file_groups={2 groups: [[l1.parquet], [l2.parquet]]}
  DataSourceExec: file_groups={3 groups: [[r1.parquet], [r2.parquet], [r3.parquet]]}
```

Properties: `join_type`, `filter`, optional `projection`.

No `on=` keys. No `mode=CollectLeft|Partitioned` like HashJoin.

## Visualization

- Exactly **2** children, **horizontal** (left / right), same as CrossJoin.
- Throw if `children.length !== 2` (match CrossJoin).
- **One teal `Buffer` ellipse** (not orange `HashTable`). All left partitions
  feed that single shared build store. Probe arrows still hit the join box.
- Arrows out: follow **HashJoin CollectLeft-style** for a build-probe join —
  output partition count equals the **probe (right)** child's arrow count,
  not the Cartesian product. Nested loop probes right partitions against the
  built left side.
- Sort-order: **do not claim order is preserved** unless both inputs share a
  compatible order we can see. Default: no blue output sort.
- Details, centered:
  - `join_type=Inner` (or Left / Right / Full / Semi / Anti)
  - `filter=...` truncated
  - `projection=[...]` when present, with column labels on output arrows

## Tests

Unit — `src/generators/__tests__/operators/nested-loop-join-exec.test.ts`:

- Renders `NestedLoopJoinExec`
- Shows `join_type` and `filter`
- Throws on 0, 1, or 3 children
- Two `DataSourceExec` children with 2 and 3 groups → **3** output arrows
  (probe side)
- Not red `unimplemented`
- Bindings exist on child arrows (same assertion style as CrossJoin)

Integration:

- `tests/join_nested_loop.sql` — filter join of two scans
- `tests/expected/join_nested_loop.excalidraw`

## Verify

```bash
./scripts/verify-operator.sh join_nested_loop
npx jest --coverage=false src/generators/__tests__/operators/nested-loop-join-exec.test.ts
```

Open the expected Excalidraw file and confirm: two children side by side, one
teal `Buffer` (not orange `HashTable`), operator name is not red.

## Files this operator may touch

- `src/generators/generators/nested-loop-join-node.generator.ts`
- `src/generators/__tests__/operators/nested-loop-join-exec.test.ts`
- `tests/join_nested_loop.sql` + expected
- `register('NestedLoopJoinExec', ...)`

Do not modify HashJoin or CrossJoin generators.

## Out of scope

Spill visualization, null-equality flags, tree-format EXPLAIN.
