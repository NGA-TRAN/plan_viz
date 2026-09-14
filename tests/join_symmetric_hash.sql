EXPLAIN
SELECT l.id, r.id
FROM left_stream l, right_stream r
WHERE l.id = r.id AND l.ts > r.ts - INTERVAL '1' MINUTE;
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| plan_type     | plan                                                                                                                                                                                                             |
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| logical_plan  | Inner Join                                                                                                                                                                                                       |
| physical_plan | SymmetricHashJoinExec: mode=Partitioned, join_type=Inner, on=[(l@0, r@0)], filter=l.ts@1 > r.ts@1 - Interval                                                                                                      |
|               |   DataSourceExec: file_groups={2 groups: [[l.parquet], [l2.parquet]]}, projection=[l, ts], file_type=parquet                                                                                                      |
|               |   DataSourceExec: file_groups={2 groups: [[r.parquet], [r2.parquet]]}, projection=[r, ts], file_type=parquet                                                                                                      |
|               |                                                                                                                                                                                                                  |
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
