# DataSinkExec / FileSinkExec

| Field | Value |
|---|---|
| Status | Implemented |
| Priority | P2 |
| Wave | D |
| Children | 1 |
| Copy from | `src/generators/generators/analyze-node.generator.ts` |
| DataFusion | `datasource::sink::DataSinkExec` |

## What it does

Write path. Consumes the input plan and returns a single count row.
Current DataFusion name is `DataSinkExec`. Older dumps may say `FileSinkExec`.

## EXPLAIN contract

```
DataSinkExec: sink=FileSink(path=out.parquet)
  DataSourceExec: ...
```

## Visualization

- Unary. Output arrows = 1 (count).
- Details: `sink=...` when present.
- Register both `DataSinkExec` and `FileSinkExec`.

## Tests

- Unit: both names render; one output arrow under a parent
- Integration: `tests/sink_basic.sql` + expected

## Verify

```bash
./scripts/verify-operator.sh sink
```

## Files this operator may touch

`wrapper-node.generator.ts` + both register lines + tests/fixtures.
