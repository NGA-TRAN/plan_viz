SortExec: TopK(fetch=5), expr=[c@0 ASC], preserve_partitioning=[false]
  CoalescePartitionsExec
    DataSourceExec: file_groups={2 groups: [[a.parquet], [b.parquet]]}, projection=[c], output_ordering=[c@0 ASC], file_type=parquet
