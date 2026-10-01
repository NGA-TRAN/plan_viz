┌───── DistributedExec
│ CoalescePartitionsExec
│   [Stage 2] => NetworkCoalesceExec: output_partitions=4, input_tasks=2
└──────────────────────────────────────────────────
  ┌───── Stage 2 ── tasks=2, partitions=4
  │ SortExec: expr=[key@0 ASC], preserve_partitioning=[true]
  │   [Stage 1] => NetworkBroadcastExec: partitions_per_consumer=2, stage_partitions=4, input_tasks=3
  └──────────────────────────────────────────────────
    ┌───── Stage 1 ── tasks=3, partitions=12
    │ BroadcastExec: input_partitions=2, consumer_tasks=2, output_partitions=4
    │   SamplerExec: partitions=2
    │     CacheExec
    │       DataSourceExec: file_groups={2 groups: [[fixtures/readings/first.parquet], [fixtures/readings/second.parquet]]}, projection=[key], file_type=parquet
    └──────────────────────────────────────────────────
