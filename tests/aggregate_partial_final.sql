EXPLAIN SELECT env, count(*) FROM dimension_csv GROUP BY env;
+---------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| plan_type     | plan                                                                                                                                                                                        |
+---------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| logical_plan  | Projection: dimension_csv.env, count(Int64(1)) AS count(*)                                                                                                                                  |
|               |   Aggregate: groupBy=[[dimension_csv.env]], aggr=[[count(Int64(1))]]                                                                                                                        |
|               |     TableScan: dimension_csv projection=[env]                                                                                                                                               |
| physical_plan | ProjectionExec: expr=[env@0 as env, count(Int64(1))@1 as count(*)]                                                                                                                          |
|               |   AggregateExec: mode=FinalPartitioned, gby=[env@0 as env], aggr=[count(Int64(1))]                                                                                                          |
|               |     CoalesceBatchesExec: target_batch_size=8192                                                                                                                                             |
|               |       RepartitionExec: partitioning=Hash([env@0], 16), input_partitions=16                                                                                                                  |
|               |         AggregateExec: mode=Partial, gby=[env@0 as env], aggr=[count(Int64(1))]                                                                                                             |
|               |           RepartitionExec: partitioning=RoundRobinBatch(16), input_partitions=1                                                                                                             |
|               |             DataSourceExec: file_groups={1 group: [[d1.csv]]}, projection=[env], file_type=csv, has_header=true |
|               |                                                                                                                                                                                             |
+---------------+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
