# ExplainExec

| Field | Value |
|---|---|
| Status | Implemented |
| Priority | P2 |
| Wave | D |
| Children | 0 |
| Copy from | `src/generators/generators/leaf-node.generator.ts` |
| DataFusion | `explain::ExplainExec` |

## What it does

Physical operator for `EXPLAIN` itself. It holds stringified plans and emits
them as a single-partition result. It is a leaf — the plan being explained is
not a child.

## EXPLAIN contract

```
ExplainExec
```

## Visualization

- Leaf. One tree edge to the parent (root still has no outgoing arrows).
- No details (DataFusion prints only the name).

## Tests

- Unit: label, not unimplemented
- Integration: `tests/explain_basic.sql` + expected

## Verify

```bash
./scripts/verify-operator.sh explain
```

## Files this operator may touch

Owned tests/fixtures + `register('ExplainExec', ...)` and leaf options.

## Out of scope

Rendering the nested stringified plans inside the box.
