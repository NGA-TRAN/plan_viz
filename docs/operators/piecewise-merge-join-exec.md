# PiecewiseMergeJoinExec

| Field | Value |
|---|---|
| Status | Implemented |
| Priority | P1 |
| Wave | B |
| Children | 2 |
| Copy from | `src/generators/generators/sort-merge-join-node.generator.ts` |
| DataFusion | `joins::PiecewiseMergeJoinExec` |

## What it does

Join specialized for a **single range comparison** (`<`, `<=`, `>`, `>=`).
Faster than nested loop for that pattern. Both inputs are typically sorted.

## EXPLAIN contract

```
PiecewiseMergeJoinExec: join_type=Inner, on=[(ts@0, ts@0)], op=GtEq
  SortExec: expr=[ts@0 ASC]
    DataSourceExec: file_groups={2 groups: [[l1.parquet], [l2.parquet]]}
  SortExec: expr=[ts@0 ASC]
    DataSourceExec: file_groups={2 groups: [[r1.parquet], [r2.parquet]]}
```

Properties: `join_type`, `on`, `op` (comparison).

## Visualization

- Two children, horizontal, throw if not 2.
- No hash-table ellipse.
- Output arrows: match **left** child (merge-style, like SortMergeJoin).
- Sort-order: **preserve** if both children expose the join key as sorted
  (blue column labels). This is the point of the operator.
- Details: `join_type`, `on`, `op`.

## Tests

Unit — `src/generators/__tests__/operators/piecewise-merge-join-exec.test.ts`:

- Label, properties, arity throw
- Blue sort color on join key when children are sorted

Integration:

- `tests/join_piecewise_merge.sql` + expected

## Verify

```bash
./scripts/verify-operator.sh join_piecewise
```

## Files this operator may touch

Owned files + `register('PiecewiseMergeJoinExec', ...)`.

## Out of scope

Operator-specific `op` icons.
