EXPLAIN
SELECT l.id, r.id
FROM left_t l, right_t r
WHERE l.id = r.id;
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| plan_type     | plan                                                                                                                                                                                                             |
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| logical_plan  | Inner Join                                                                                                                                                                                                       |
| physical_plan | HashJoinExec: mode=Partitioned, join_type=Inner, on=[(id@0, id@0)]                                                                                                                                                |
|               |   RepartitionExec: partitioning=Hash([id@0], 4), input_partitions=2                                                                                                                                              |
|               |     DataSourceExec: file_groups={2 groups: [[l1.parquet], [l2.parquet]]}, projection=[id], file_type=parquet                                                                                                      |
|               |   RepartitionExec: partitioning=Hash([id@0], 4), input_partitions=2                                                                                                                                              |
|               |     DataSourceExec: file_groups={2 groups: [[r1.parquet], [r2.parquet]]}, projection=[id], file_type=parquet                                                                                                      |
|               |                                                                                                                                                                                                                  |
+---------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
