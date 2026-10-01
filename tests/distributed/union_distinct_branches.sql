┌───── DistributedExec
│ CoalescePartitionsExec
│   [Stage 2] => NetworkCoalesceExec: output_partitions=12, input_tasks=3
└──────────────────────────────────────────────────
  ┌───── Stage 2 ── tasks=3, partitions=12
  │ ProjectionExec: expr=[region@0 as region]
  │   DistributedUnionExec: t0:[c0] t1:[c1(0/2)] t2:[c1(1/2)]
  │     AggregateExec: mode=FinalPartitioned, gby=[region@0 as region], aggr=[count(*)]
  │       RepartitionExec: partitioning=Hash([region@0], 4), input_partitions=4
  │         AggregateExec: mode=Partial, gby=[region@0 as region], aggr=[count(*)]
  │           BudgetGuardExec(build<=8GiB): HashJoinExec: mode=Partitioned, join_type=Inner, on=[(record_id@0, record_id@0)]
  │             MeadowScanExec: file_groups={4 groups: [...]}, projection=[record_id, region, value], file_type=parquet
  │             BufferExec: capacity=_
  │               MeadowScanExec: file_groups={4 groups: [...]}, projection=[record_id, region, value], file_type=parquet
  │     AggregateExec: mode=FinalPartitioned, gby=[region@0 as region], aggr=[count(*)]
  │       [Stage 1] => NetworkShuffleExec: output_partitions=4, input_tasks=3
  └──────────────────────────────────────────────────
    ┌───── Stage 1 ── tasks=3, partitions=8
    │ RepartitionExec: partitioning=Hash([region@0], 8), input_partitions=4
    │   AggregateExec: mode=Partial, gby=[region@0 as region], aggr=[count(*)]
    │     BudgetGuardExec(build<=8GiB): HashJoinExec: mode=Partitioned, join_type=Inner, on=[(record_id@0, record_id@0)]
    │       MeadowScanExec: file_groups={4 groups: [...]}, projection=[record_id, region, value], file_type=parquet
    │       BufferExec: capacity=_
    │         MeadowScanExec: file_groups={4 groups: [...]}, projection=[record_id, region, value], file_type=parquet
    └──────────────────────────────────────────────────
