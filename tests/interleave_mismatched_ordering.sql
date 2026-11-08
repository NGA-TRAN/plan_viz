ProjectionExec: expr=[a@0 as a, b@1 as b]
  InterleaveExec
    DataSourceExec: file_groups={2 groups: [[left_a.parquet], [left_b.parquet]]}, projection=[a, b], output_ordering=[a@0 ASC, b@1 ASC], file_type=parquet
    DataSourceExec: file_groups={2 groups: [[right_a.parquet], [right_b.parquet]]}, projection=[a, b], output_ordering=[b@1 ASC, a@0 ASC], file_type=parquet
