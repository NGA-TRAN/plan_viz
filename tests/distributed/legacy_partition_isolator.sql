┌───── DistributedExec
│ CoalescePartitionsExec
│   [Stage 1] => NetworkCoalesceExec: output_partitions=9, input_tasks=3
└──────────────────────────────────────────────────
  ┌───── Stage 1 ── tasks=3, partitions=9
  │ PartitionIsolatorExec: tasks=3 partitions=7
  │   DataSourceExec: file_groups={7 groups: [[fixtures/events/a.parquet], [fixtures/events/b.parquet], [fixtures/events/c.parquet], [fixtures/events/d.parquet], [fixtures/events/e.parquet], [fixtures/events/f.parquet], [fixtures/events/g.parquet]]}, projection=[key], file_type=parquet
  └──────────────────────────────────────────────────
