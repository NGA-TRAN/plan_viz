┌───── DistributedExec
│ SortPreservingMergeExec: [value@0 ASC NULLS LAST]
│   [Stage 2] => NetworkCoalesceExec: output_partitions=4, input_tasks=2
└──────────────────────────────────────────────────
  ┌───── Stage 2 ── tasks=2, partitions=2
  │ ProjectionExec: expr=[value@0 as value, count(Int64(1))@1 as n]
  │   AggregateExec: mode=FinalPartitioned, gby=[value@0 as value], aggr=[count(Int64(1))], ordering_mode=Sorted
  │     RepartitionExec: partitioning=Hash([value@0], 2), input_partitions=2, preserve_order=true, sort_exprs=value@0 ASC NULLS LAST
  │       [Stage 1] => NetworkShuffleExec: output_partitions=2, input_tasks=2, sort_exprs=[value@0 ASC NULLS LAST]
  └──────────────────────────────────────────────────
    ┌───── Stage 1 ── tasks=2, partitions=2
    │ RepartitionExec: partitioning=Hash([value@0, 5871781006564002453], 2), input_partitions=2, preserve_order=true, sort_exprs=value@0 ASC NULLS LAST
    │   AggregateExec: mode=Partial, gby=[value@0 as value], aggr=[count(Int64(1))], ordering_mode=Sorted
    │     DistributedLeafExec:
    │       t0: DataSourceExec: file_groups={2 groups: [[public_fixture/0.csv:<int>..<int>], [public_fixture/1.csv:<int>..<int>]]}, projection=[value], output_ordering=[value@0 ASC NULLS LAST], file_type=csv, has_header=true
    │       t1: DataSourceExec: file_groups={2 groups: [[public_fixture/0.csv:<int>..<int>], [public_fixture/1.csv:<int>..<int>]]}, projection=[value], output_ordering=[value@0 ASC NULLS LAST], file_type=csv, has_header=true
    └──────────────────────────────────────────────────
