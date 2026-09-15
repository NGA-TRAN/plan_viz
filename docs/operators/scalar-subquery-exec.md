# ScalarSubqueryExec

| Field | Value |
|---|---|
| Status | Implemented |
| Priority | P2 |
| Wave | D |
| Children | N (first = main input, rest = subquery plans) |
| Copy from | `src/generators/generators/union-node.generator.ts` |
| DataFusion | `scalar_subquery::ScalarSubqueryExec` |

## What it does

Hosts uncorrelated scalar subqueries. Passes through the main input’s batches
after evaluating each subquery once (0 or 1 row).

## EXPLAIN contract

```
ScalarSubqueryExec: subqueries=1
  DataSourceExec: ...
  PlaceholderRowExec
```

## Visualization

- Multi-child horizontal, centered under the parent. First child is the main stream.
- Horizontal gap is the children's full subtree widths (not the root box), so
  wide inputs such as Partitioned HashJoin do not overlap.
- Output arrows / columns / sort = first child (pass-through).
- Details: `subqueries=N`.

## Tests

- Unit: label, pass-through arrows from main child, not unimplemented
- Integration: `tests/scalar_subquery_basic.sql` + expected
- Real plan: `tests/tpch_q11.sql` (TPC-H Q11 from DataFusion)
- Real plan: `tests/subquery_two_scalars.sql` (`subquery.slt`, `subqueries=2`)
- Real plan: `tests/subquery_nested.sql` (`subquery.slt`, nested `ScalarSubqueryExec`)

## Verify

```bash
./scripts/verify-operator.sh scalar_subquery
```

## Files this operator may touch

`scalar-subquery-node.generator.ts` + register + tests/fixtures.
