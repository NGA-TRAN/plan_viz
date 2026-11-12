┌───── DistributedExec
│ CoalescePartitionsExec
│   [Stage 1] => NetworkCoalesceExec: output_partitions=3, input_tasks=3
└─────────────────────
  ┌───── Stage 1 ── tasks=3, partitions=1
  │ DataSourceExec: file_groups={1 group: [[sample.parquet]]}, projection=[item], file_type=parquet, metrics=[elapsed_compute={0:10ms, 1:500ms, 2:20ms}, output_rows=42]
  └─────────────────────
