┌───── DistributedExec
│ CoalescePartitionsExec
│   [Stage 1] => NetworkCoalesceExec: output_partitions=32, input_tasks=2
└──────────────────────────────────────────────────
  ┌───── Stage 1 ── tasks=2, partitions=32
  │ RepartitionExec: partitioning=RoundRobinBatch(16), input_partitions=1
  │   CooperativeExec
  │     SequenceSourceExec: t0:[0-6), t1:[6-11)
  └──────────────────────────────────────────────────
