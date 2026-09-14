EXPLAIN
SELECT k, count(*) FROM (
  SELECT k FROM a
  UNION ALL
  SELECT k FROM b
) GROUP BY k;
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| plan_type     | plan                                                                                                                                                                                                             |
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| logical_plan  | Aggregate                                                                                                                                                                                                        |
|               |   Union                                                                                                                                                                                                          |
| physical_plan | ProjectionExec: expr=[k@0 as k, count(*)@1 as count]                                                                                                                                                              |
|               |   InterleaveExec                                                                                                                                                                                                 |
|               |     AggregateExec: mode=Partial, gby=[k@0], aggr=[count(*)]                                                                                                                                                      |
|               |       DataSourceExec: file_groups={4 groups: [[a1.parquet], [a2.parquet], [a3.parquet], [a4.parquet]]}, projection=[k], file_type=parquet                                                                        |
|               |     AggregateExec: mode=Partial, gby=[k@0], aggr=[count(*)]                                                                                                                                                      |
|               |       DataSourceExec: file_groups={4 groups: [[b1.parquet], [b2.parquet], [b3.parquet], [b4.parquet]]}, projection=[k], file_type=parquet                                                                        |
|               |                                                                                                                                                                                                                  |
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
