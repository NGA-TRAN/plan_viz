EXPLAIN
SELECT l.ts, r.ts
FROM left_sorted l, right_sorted r
WHERE l.ts >= r.ts;
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| plan_type     | plan                                                                                                                                                                                                             |
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| logical_plan  | Inner Join                                                                                                                                                                                                       |
| physical_plan | PiecewiseMergeJoinExec: join_type=Inner, on=[(ts@0, ts@0)], op=GtEq                                                                                                                                               |
|               |   SortExec: expr=[ts@0 ASC], preserve_partitioning=[true]                                                                                                                                                         |
|               |     DataSourceExec: file_groups={2 groups: [[l1.parquet], [l2.parquet]]}, projection=[ts, val], file_type=parquet                                                                                                 |
|               |   SortExec: expr=[ts@0 ASC], preserve_partitioning=[true]                                                                                                                                                         |
|               |     DataSourceExec: file_groups={2 groups: [[r1.parquet], [r2.parquet]]}, projection=[ts, val], file_type=parquet                                                                                                 |
|               |                                                                                                                                                                                                                  |
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
