NgaExec: mode=Final, gby=[id@0 as id], aggr=[], ordering_mode=Sorted
      SortPreservingMergeExec: [id@0 ASC NULLS LAST]
        UnimplementedExec: mode=Partial, gby=[id@0 as id], aggr=[], ordering_mode=Sorted
          UnionExec
            DataSourceExec: file_groups={1 group: [[f1.parquet]]}, projection=[id], output_ordering=[id@0 ASC NULLS LAST], file_type=parquet
            SortExec: expr=[id@0 ASC NULLS LAST], preserve_partitioning=[false]
              DataSourceExec: file_groups={1 group: [[f2.parquet]]}, projection=[id], file_type=parquet
