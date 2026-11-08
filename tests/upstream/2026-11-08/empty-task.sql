┌───── DistributedExec
│ ProjectionExec: expr=[count(Int64(1))@0 as n]
│   AggregateExec: mode=Final, gby=[], aggr=[count(Int64(1))]
│     CoalescePartitionsExec
│       [Stage 1] => NetworkCoalesceExec: output_partitions=4, input_tasks=2
└──────────────────────────────────────────────────
  ┌───── Stage 1 ── tasks=2, partitions=4
  │ AggregateExec: mode=Partial, gby=[], aggr=[count(Int64(1))]
  │   RepartitionExec: partitioning=RoundRobinBatch(2), input_partitions=1
  │     DistributedLeafExec:
  │       t0: DataSourceExec: file_groups={1 group: [[public_fixture/0.csv]]}, file_type=csv, has_header=true
  │       t1: DataSourceExec: file_groups={1 group: [[]]}, file_type=csv, has_header=true
  └──────────────────────────────────────────────────
