┌───── DistributedExec
│ CoalescePartitionsExec
│   [Stage 1] => NetworkCoalesceExec: output_partitions=8, input_tasks=4
└──────────────────────────────────────────────────
  ┌───── Stage 1 ── tasks=4, partitions=8
  │ MeadowScanExec: file_groups={2 groups: [...]}, projection=[record_id, region, value], file_type=parquet
  └──────────────────────────────────────────────────
