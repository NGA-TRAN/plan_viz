ProjectionExec: expr=[k@0 as k]
  InterleaveExec
    DataSourceExec: file_groups={1 group: [[single.parquet]]}, projection=[k], output_ordering=[k@0 ASC], file_type=parquet
