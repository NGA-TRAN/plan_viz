# RecursiveQueryExec

| Field | Value |
|---|---|
| Status | Implemented |
| Priority | P2 |
| Wave | D |
| Children | 2 |
| Copy from | `src/generators/generators/piecewise-merge-join-node.generator.ts` |
| DataFusion | `recursive_query::RecursiveQueryExec` |

## What it does

Recursive CTE. Left child is the static term; right child is the recursive
term. Both inputs are required to be a single partition.

## EXPLAIN contract

```
RecursiveQueryExec: name=cte, is_distinct=false
  PlaceholderRowExec
  ProjectionExec: ...
    WorkTableExec: name=cte
```

## Visualization

- Two-input, children left/right (same display as other two-input joins).
- Incoming column labels left-of-left / right-of-right.
- Output arrows = 1.
- Details: `name=`, `is_distinct=`.

## Tests

- Unit: label, details, two children required, not unimplemented
- Integration: `tests/recursive_basic.sql` + expected
- Real plan: `tests/recursive_cte_trans.sql` (DataFusion `cte.slt` transitive closure)

## Verify

```bash
./scripts/verify-operator.sh recursive
```

## Files this operator may touch

`recursive-query-node.generator.ts` + register + tests/fixtures.
