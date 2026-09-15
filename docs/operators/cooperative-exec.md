# CooperativeExec

| Field | Value |
|---|---|
| Status | Implemented |
| Priority | P2 |
| Wave | D |
| Children | 1 |
| Copy from | `src/generators/generators/analyze-node.generator.ts` |
| DataFusion | `coop::CooperativeExec` |

## What it does

Scheduler wrapper that makes the input cooperative. Pass-through.

## EXPLAIN contract

```
CooperativeExec
  DataSourceExec: ...
```

## Visualization

- Unary wrapper. 1:1 arrows. Preserve child columns/sort.
- No details (DataFusion prints only the name).

## Tests

- Unit: label, not unimplemented
- Integration: `tests/cooperative_basic.sql` + expected

## Verify

```bash
./scripts/verify-operator.sh cooperative
```

## Files this operator may touch

`wrapper-node.generator.ts` + register + tests/fixtures.
