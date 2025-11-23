EXPLAIN SELECT env, count(*) FROM dimension_parquet GROUP BY env;
+---------------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| plan_type     | plan                                                                                                                                                                       |
+---------------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| logical_plan  | Projection: dimension_parquet.env, count(Int64(1)) AS count(*)                                                                                                             |
|               |   Aggregate: groupBy=[[dimension_parquet.env]], aggr=[[count(Int64(1))]]                                                                                                   |
|               |     TableScan: dimension_parquet projection=[env]                                                                                                                          |
| physical_plan | ProjectionExec: expr=[env@0 as env, count(Int64(1))@1 as count(*)]                                                                                                         |
|               |   AggregateExec: mode=Single, gby=[env@0 as env], aggr=[count(Int64(1))], ordering_mode=Sorted                                                                                                   |
|               |     DataSourceExec: file_groups={1 group: [[d1.parquet]]}, projection=[env], output_ordering=[env@0 ASC NULLS LAST],  file_type=parquet |
|               |                                                                                                                                                                            |
+---------------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
