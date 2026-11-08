┌───── DistributedExec
│ SortPreservingMergeExec: [pickup_date@0 ASC NULLS LAST]
│   [Stage 2] => NetworkCoalesceExec: output_partitions=12, input_tasks=3
└──────────────────────────────────────────────────
  ┌───── Stage 2 ── tasks=3, partitions=4
  │ ProjectionExec: expr=[pickup_date@0 as pickup_date, count(Int64(1))@1 as count(*)]
  │   SortExec: expr=[pickup_date@0 ASC NULLS LAST], preserve_partitioning=[true]
  │     AggregateExec: mode=FinalPartitioned, gby=[pickup_date@0 as pickup_date], aggr=[count(Int64(1))]
  │       [Stage 1] => NetworkShuffleExec: output_partitions=4, input_tasks=3
  └──────────────────────────────────────────────────
    ┌───── Stage 1 ── tasks=3, partitions=12
    │ RepartitionExec: partitioning=Hash([pickup_date@0], 12), input_partitions=4
    │   AggregateExec: mode=Partial, gby=[pickup_date@0 as pickup_date], aggr=[count(Int64(1))]
    │     DistributedLeafExec:
    │       t0: DataSourceExec: format=iceberg, planned_files=3
    │       t1: DataSourceExec: format=iceberg, planned_files=2
    │       t2: DataSourceExec: format=iceberg, planned_files=2
    └──────────────────────────────────────────────────
