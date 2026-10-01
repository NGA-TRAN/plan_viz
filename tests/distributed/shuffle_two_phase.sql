┌───── DistributedExec
│ CoalescePartitionsExec
│   [Stage 2] => NetworkCoalesceExec: output_partitions=6, input_tasks=2
└──────────────────────────────────────────────────
  ┌───── Stage 2 ── tasks=2, partitions=6
  │ AggregateExec: mode=FinalPartitioned, gby=[key@0 as key], aggr=[count(*)]
  │   RepartitionExec: partitioning=Hash([key@0], 3), input_partitions=4
  │     [Stage 1] => NetworkShuffleExec: output_partitions=4, input_tasks=4
  └──────────────────────────────────────────────────
    ┌───── Stage 1 ── tasks=4, partitions=8
    │ RepartitionExec: partitioning=Hash([key@0, 5871781006564002453], 2), input_partitions=3
    │   AggregateExec: mode=Partial, gby=[key@0 as key], aggr=[count(*)]
    │     DataSourceExec: file_groups={3 groups: [[fixtures/events/a.parquet], [fixtures/events/b.parquet], [fixtures/events/c.parquet]]}, projection=[key], file_type=parquet
    └──────────────────────────────────────────────────
