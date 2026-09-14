EXPLAIN
SELECT user_id, ts, val, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY ts) AS rn
FROM events;
+---------------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| plan_type     | plan                                                                                                                                                                                                                             |
+---------------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| logical_plan  | WindowAggr: [row_number()]                                                                                                                                                                                                       |
|               |   TableScan: events                                                                                                                                                                                                              |
| physical_plan | WindowAggExec: wdw=[row_number(): Field { name: "row_number", data_type: UInt64 }, frame: WindowFrame { units: Rows }], partition_by=[user_id@0], order_by=[ts@1 ASC]                                                             |
|               |   SortExec: expr=[user_id@0 ASC, ts@1 ASC], preserve_partitioning=[true]                                                                                                                                                          |
|               |     DataSourceExec: file_groups={4 groups: [[a.parquet], [b.parquet], [c.parquet], [d.parquet]]}, projection=[user_id, ts, val], output_ordering=[user_id@0 ASC, ts@1 ASC], file_type=parquet                                     |
|               |                                                                                                                                                                                                                                  |
+---------------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
