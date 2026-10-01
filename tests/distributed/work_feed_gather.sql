┌───── DistributedExec
│ SortPreservingMergeExec: [task@0 ASC NULLS LAST, partition@1 ASC NULLS LAST]
│   [Stage 1] => NetworkCoalesceExec: output_partitions=4, input_tasks=2
└──────────────────────────────────────────────────
  ┌───── Stage 1 ── tasks=2, partitions=4
  │ SortExec: expr=[task@0 ASC NULLS LAST, partition@1 ASC NULLS LAST], preserve_partitioning=[true]
  │   WorkFeedSourceExec: tasks=2, partition_chunks=[[3, 1], [2], [4], [1, 1]]
  └──────────────────────────────────────────────────
