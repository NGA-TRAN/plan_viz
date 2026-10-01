┌───── DistributedExec
│ ProjectionExec: expr=[AlertToday@0 as AlertToday, count(Int64(1))@1 as count(*)]
│   AggregateExec: mode=Final, gby=[AlertToday@0 as AlertToday], aggr=[count(Int64(1))]
│     CoalescePartitionsExec
│       [Stage 2] => NetworkCoalesceExec: output_partitions=2, input_tasks=2
└──────────────────────────────────────────────────
  ┌───── Stage 2 ── tasks=2, partitions=2
  │ AggregateExec: mode=PartialReduce, gby=[AlertToday@0 as AlertToday], aggr=[count(Int64(1))]
  │   CoalescePartitionsExec
  │     [Stage 1] => NetworkCoalesceExec: output_partitions=6, input_tasks=3
  └──────────────────────────────────────────────────
    ┌───── Stage 1 ── tasks=3, partitions=9
    │ AggregateExec: mode=Partial, gby=[AlertToday@0 as AlertToday], aggr=[count(Int64(1))]
    │   DistributedLeafExec: DataSourceExec: file_groups={3 groups: [[fixtures/readings/batch-000000.parquet], [fixtures/readings/batch-000001.parquet], [fixtures/readings/batch-000002.parquet]]}, projection=[AlertToday], file_type=parquet
    └──────────────────────────────────────────────────
