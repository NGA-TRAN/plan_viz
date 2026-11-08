┌───── DistributedExec
│ SortPreservingMergeExec: [value@0 ASC NULLS LAST]
│   [Stage 1] => NetworkCoalesceExec: output_partitions=4, input_tasks=2
└──────────────────────────────────────────────────
  ┌───── Stage 1 ── tasks=2, partitions=4
  │ SortExec: expr=[value@0 ASC NULLS LAST], preserve_partitioning=[true]
  │   DistributedLeafExec:
  │     t0: DataSourceExec: file_groups={2 groups: [[public_fixture/0.csv:<int>..<int>], [public_fixture/1.csv:<int>..<int>, public_fixture/2.csv:<int>..<int>]]}, projection=[value], file_type=csv, has_header=true
  │     t1: DataSourceExec: file_groups={2 groups: [[public_fixture/0.csv:<int>..<int>, public_fixture/1.csv:<int>..<int>], [public_fixture/2.csv:<int>..<int>]]}, projection=[value], file_type=csv, has_header=true
  └──────────────────────────────────────────────────
