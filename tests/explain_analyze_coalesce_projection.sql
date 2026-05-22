EXPLAIN ANALYZE SELECT count(*) FROM dim2_parquet;
+-------------------+----------------------------------------------------------------------------------------------------+
| plan_type         | plan                                                                                               |
+-------------------+----------------------------------------------------------------------------------------------------+
| Plan with Metrics | CoalescePartitionsExec, metrics=[output_rows=1, elapsed_compute=2375ns]                             |
|                   |   ProjectionExec: expr=[count(Int64(1))@0 as count(*)], metrics=[output_rows=1, elapsed_compute=1ns] |
+-------------------+----------------------------------------------------------------------------------------------------+
