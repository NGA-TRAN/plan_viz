ProjectionExec: expr=[a@0 as a, b@1 as b, c@2 as c, d@3 as d]
  InterleaveExec
    DataSourceExec: file_groups={2 groups: [[left_a.parquet], [left_b.parquet]]}, projection=[a, b, c, d], output_ordering=[a@0 ASC, d@3 DESC], file_type=parquet
    DataSourceExec: file_groups={2 groups: [[right_a.parquet], [right_b.parquet]]}, projection=[a, b, c, d], output_ordering=[a@0 ASC, d@3 DESC], file_type=parquet
