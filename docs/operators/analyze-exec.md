# AnalyzeExec

| Field | Value |
|---|---|
| Status | Implemented |
| Priority | P2 |
| Wave | C |
| Children | 1 |
| Copy from | `src/generators/generators/filter-node.generator.ts` (simple unary box) |
| DataFusion | `analyze::AnalyzeExec` |

## What it does

Physical operator for `EXPLAIN ANALYZE`. Wraps the plan being measured.
Users rarely paste this as the thing they want drawn, but it appears when
someone dumps the analyze plan itself.

## EXPLAIN contract

```
AnalyzeExec: verbose=true
  ProjectionExec: expr=[id@0]
    DataSourceExec: file_groups={1 groups: [[t.parquet]]}
```

Property: `verbose`.

## Visualization

- Unary, vertical, 1:1 arrows, preserve child columns/sort.
- Details: `verbose=true|false`.
- No special color.

## Tests

- Unit: label, `verbose` text, not unimplemented
- Integration: `tests/analyze_basic.sql` + expected

## Verify

```bash
./scripts/verify-operator.sh analyze
```

## Files this operator may touch

Owned files + `register('AnalyzeExec', ...)`.

## Out of scope

Rendering runtime metrics on every child (already shown in EXPLAIN ANALYZE
source text if the user pasted `Plan with Metrics`).
