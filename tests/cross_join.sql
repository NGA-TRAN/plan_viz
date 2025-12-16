ProjectionExec: expr=[l_key@0 as l_key, r_key@1 as r_key]
  CrossJoinExec
    CoalescePartitionsExec
      DataSourceExec: file_groups={5 groups: [[l1.parquet], [l2.parquet], [l3.parquet], [l4.parquet], [l5.parquet]]}, projection=[l_key], file_type=parquet
    CoalescePartitionsExec
      DataSourceExec: file_groups={10 groups: [[r1.parquet], [r2.parquet], [r3.parquet], [r4.parquet], [r5.parquet], [r6.parquet], [r7.parquet], [r8.parquet], [r9.parquet], [r10.parquet]]}, projection=[r_key], file_type=parquet
