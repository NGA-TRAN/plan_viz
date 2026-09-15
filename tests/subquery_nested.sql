-- Source: Apache DataFusion datafusion/sqllogictest/test_files/subquery.slt
EXPLAIN
SELECT (SELECT max(v) + (SELECT min(v) FROM sq_values) FROM sq_values)
;
+---------------+--------------------------------------------------------------------------------------------------------------------+
| plan_type     | plan                                                                                                               |
+---------------+--------------------------------------------------------------------------------------------------------------------+
| physical_plan | ScalarSubqueryExec: subqueries=1                                                                                   |
|               |    ProjectionExec: expr=[scalar_subquery(<pending>) as max(sq_values.v) + min(sq_values.v)]                        |
|               |      PlaceholderRowExec                                                                                            |
|               |    ScalarSubqueryExec: subqueries=1                                                                                |
|               |      ProjectionExec: expr=[max(sq_values.v)@0 + scalar_subquery(<pending>) as max(sq_values.v) + min(sq_values.v)] |
|               |        AggregateExec: mode=Single, gby=[], aggr=[max(sq_values.v)]                                                 |
|               |          DataSourceExec: partitions=1, partition_sizes=[1]                                                         |
|               |      AggregateExec: mode=Single, gby=[], aggr=[min(sq_values.v)]                                                   |
|               |        DataSourceExec: partitions=1, partition_sizes=[1]                                                           |
+---------------+--------------------------------------------------------------------------------------------------------------------+
