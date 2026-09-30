┌───── DistributedExec
│ CoalescePartitionsExec
│   [Stage 1] => NetworkCoalesceExec: output_partitions=12, input_tasks=4
└──────────────────────────────────────────────────
  ┌───── Stage 1 ── tasks=4, partitions=12
  │ BudgetGuardExec(build<=8GiB): HashJoinExec: mode=Partitioned, join_type=Inner, on=[(record_id@0, record_id@0)]
  │   MeadowScanExec: file_groups={3 groups: [...]}, projection=[record_id, region, value], file_type=parquet
  │   BufferExec: capacity=_
  │     MeadowScanExec: file_groups={3 groups: [...]}, projection=[record_id, region, value], file_type=parquet
  └──────────────────────────────────────────────────
