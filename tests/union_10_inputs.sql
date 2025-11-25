AggregateExec: mode=Final, gby=[id@0 as id], aggr=[], ordering_mode=Sorted
      SortPreservingMergeExec: [id@0 ASC NULLS LAST]
        AggregateExec: mode=Partial, gby=[id@0 as id], aggr=[], ordering_mode=Sorted
          UnionExec
            DataSourceExec: file_groups={1 group: [[f1.parquet]]}, projection=[id], output_ordering=[id@0 ASC NULLS LAST], file_type=parquet
            SortExec: expr=[id@0 ASC NULLS LAST], preserve_partitioning=[false]
              DataSourceExec: file_groups={1 group: [[f2.parquet]]}, projection=[id], file_type=parquet
            DataSourceExec: file_groups={1 group: [[f3.parquet]]}, projection=[id], output_ordering=[id@0 ASC NULLS LAST], file_type=parquet
            DataSourceExec: file_groups={1 group: [[f4.parquet]]}, projection=[id], output_ordering=[id@0 ASC NULLS LAST], file_type=parquet
            SortExec: expr=[id@0 ASC NULLS LAST], preserve_partitioning=[false]
              DataSourceExec: file_groups={1 group: [[f5.parquet]]}, projection=[id], file_type=parquet
            DataSourceExec: file_groups={1 group: [[f6.parquet]]}, projection=[id], output_ordering=[id@0 ASC NULLS LAST], file_type=parquet
            DataSourceExec: file_groups={1 group: [[f7.parquet, f8.parquet]]}, projection=[id], output_ordering=[id@0 ASC NULLS LAST], file_type=parquet
            SortExec: expr=[id@0 ASC NULLS LAST], preserve_partitioning=[false]
              DataSourceExec: file_groups={1 group: [[f9.parquet]]}, projection=[id], file_type=parquet
            DataSourceExec: file_groups={1 group: [[f10.parquet]]}, projection=[id], output_ordering=[id@0 ASC NULLS LAST], file_type=parquet
            SortExec: expr=[id@0 ASC NULLS LAST], preserve_partitioning=[false]
              DataSourceExec: file_groups={1 group: [[f11.parquet]]}, projection=[id], file_type=parquet
