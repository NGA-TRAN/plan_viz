ProjectionExec: expr=[id@0 as id, total@1 as total]
  RelayEnvelopeExec
    AggregateExec: mode=FinalPartitioned, gby=[id@0 as id], aggr=[sum(total) as total]
      RepartitionExec: partitioning=Hash([id@0], 4), input_partitions=4
        RelayEnvelopeExec
          AggregateExec: mode=Partial, gby=[id@0 as id], aggr=[sum(value) as total]
            ProjectionExec: expr=[id@0 as id, value@2 as value]
              QuotaFenceExec(limit=1000): HashJoinExec: mode=Partitioned, join_type=Inner, on=[(id@0, id@0)]
                RelayEnvelopeExec
                  OrchardScanExec: file_groups={4 groups: [[keys_1.dat], [keys_2.dat], [keys_3.dat], [keys_4.dat]]}, projection=[id], output_partitioning=Hash([id@0], 4)
                RelayEnvelopeExec
                  AggregateExec: mode=SinglePartitioned, gby=[id@0 as id], aggr=[sum(value) as value], ordering_mode=Sorted
                    BufferExec: capacity=1000
                      RelayEnvelopeExec
                        ProjectionExec: expr=[id@0 as id, value@1 as value]
                          BrookScanExec: file_groups={4 groups: [[values_1.dat], [values_2.dat], [values_3.dat], [values_4.dat]]}, projection=[id, value], output_ordering=[id@0 ASC], output_partitioning=Hash([id@0], 4)
