ProjectionExec: expr=[item@0 as item], metrics=[elapsed_compute=1ms, output_rows=12, output_batches=1, output_bytes=2.0 KB]
  FilterExec: item@0 > 0, metrics=[elapsed_compute=0ns, output_rows=12, output_batches=1]
    DataSourceExec: file_groups={1 group: [[sample.parquet]]}, projection=[item], file_type=parquet, metrics=[elapsed_compute=2ms, output_rows=24, output_batches=2]
