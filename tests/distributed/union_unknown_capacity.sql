┌───── DistributedExec
│ [Stage 1] => NetworkCoalesceExec: input_tasks=3
└──────────────────────────────────────────────────
  ┌───── Stage 1 ── tasks=3, partitions=6
  │ DistributedUnionExec: t0:[c0] t1:[c1] t2:[]
  │   DataSourceExec: file_groups={2 groups: [[known_a.parquet], [known_b.parquet]]}, projection=[k], file_type=parquet
  │   CustomSourceExec: projection=[k]
  └──────────────────────────────────────────────────
