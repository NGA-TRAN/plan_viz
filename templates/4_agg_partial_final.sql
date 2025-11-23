EXPLAIN SELECT env, count(*) FROM dimension_parquet GROUP BY env;
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| plan_type     | plan                                                                                                                                                                               |
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| logical_plan  | Projection: dimension_parquet.env, count(Int64(1)) AS count(*)                                                                                                                     |
|               |   Aggregate: groupBy=[[dimension_parquet.env]], aggr=[[count(Int64(1))]]                                                                                                           |
|               |     TableScan: dimension_parquet projection=[env]                                                                                                                                  |
| physical_plan | ProjectionExec: expr=[env@0 as env, count(Int64(1))@1 as count(*)]                                                                                                                 |
|               |   AggregateExec: mode=FinalPartitioned, gby=[env@0 as env], aggr=[count(Int64(1))]                                                                                                 |
|               |     CoalesceBatchesExec: target_batch_size=8192                                                                                                                                    |
|               |       RepartitionExec: partitioning=Hash([env@0], 16), input_partitions=1                                                                        |
|               |           AggregateExec: mode=Partial, gby=[env@0 as env], aggr=[count(Int64(1))]                                                                                                  |
|               |             DataSourceExec: file_groups={1 group: [[Users/hoabinhnga.tran/datafusion-optimal-plans/testdata/dimension1/dimension_1.parquet]]}, projection=[env], file_type=parquet |
|               |                                                                                                                                                                                    |
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
