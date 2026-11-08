┌───── DistributedExec
│ [Stage 1] => NetworkCoalesceExec: output_partitions=4, input_tasks=2
└──────────────────────────────────────────────────
  ┌───── Stage 1 ── tasks=2, partitions=4
  │ DistributedUnionExec: t0:[c0] t1:[]
  │   DataSourceExec: file_groups={2 groups: [[part_a.parquet], [part_b.parquet]]}, projection=[k], file_type=parquet
  └──────────────────────────────────────────────────
