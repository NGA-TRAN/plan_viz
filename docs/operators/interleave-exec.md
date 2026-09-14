# InterleaveExec

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | P1 |
| Wave | B |
| Children | N (≥2) |
| Copy from | `src/generators/generators/union-node.generator.ts` |
| DataFusion | `union::InterleaveExec` |

## What it does

Combines inputs that share the same `Hash` or `Range` partitioning by
interleaving partition `k` from every child. Unlike `UnionExec` (concat /
repartition), this keeps the hash buckets aligned.

## EXPLAIN contract

```
InterleaveExec
  AggregateExec: mode=Partial, gby=[k@0], aggr=[count(*)]
    DataSourceExec: file_groups={4 groups: [[a1], [a2], [a3], [a4]]}
  AggregateExec: mode=Partial, gby=[k@0], aggr=[count(*)]
    DataSourceExec: file_groups={4 groups: [[b1], [b2], [b3], [b4]]}
```

Often no properties. Parser still works.

## Visualization

- N children, **horizontal** like Union.
- Output arrows: same count as **one** child (they must match). Use the first
  child's arrow count. Do not sum them (that is Union's "concat streams"
  story). This is the visual difference reviewers should see.
- Sort-order: preserve if every child reports the same `outputSortOrder`.
- Details: none required; optional one-line `interleave` hint is fine.

## Tests

Unit — `src/generators/__tests__/operators/interleave-exec.test.ts`:

- Label `InterleaveExec`
- Two children with 4 arrows each → **4** output arrows (not 8)
- Contrast documented in a comment so we do not regress to Union math

Integration:

- `tests/interleave_2_inputs.sql` + expected

## Verify

```bash
./scripts/verify-operator.sh interleave
```

Compare mentally with `tests/union.sql`: Union fans in; Interleave keeps
partition count.

## Files this operator may touch

Owned files + `register('InterleaveExec', ...)`.

Do not change `union-node.generator.ts`.

## Out of scope

Detecting mismatched child partition counts (render using first child).
