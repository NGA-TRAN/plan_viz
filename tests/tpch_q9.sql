-- Source: Apache DataFusion datafusion/sqllogictest/test_files/tpch/plans/q9.slt.part
EXPLAIN
select
    nation,
    o_year,
    sum(amount) as sum_profit
from
    (
        select
            n_name as nation,
            extract(year from o_orderdate) as o_year,
            l_extendedprice * (1 - l_discount) - ps_supplycost * l_quantity as amount
        from
            part,
            supplier,
            lineitem,
            partsupp,
            orders,
            nation
        where
                s_suppkey = l_suppkey
          and ps_suppkey = l_suppkey
          and ps_partkey = l_partkey
          and p_partkey = l_partkey
          and o_orderkey = l_orderkey
          and s_nationkey = n_nationkey
          and p_name like '%green%'
    ) as profit
group by
    nation,
    o_year
order by
    nation,
    o_year desc
limit 10
;
+---------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| plan_type     | plan                                                                                                                                                                                                                                                                                                                                      |
+---------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| physical_plan | SortPreservingMergeExec: [nation@0 ASC NULLS LAST, o_year@1 DESC], fetch=10                                                                                                                                                                                                                                                               |
|               |    SortExec: TopK(fetch=10), expr=[nation@0 ASC NULLS LAST, o_year@1 DESC], preserve_partitioning=[true]                                                                                                                                                                                                                                  |
|               |      ProjectionExec: expr=[nation@0 as nation, o_year@1 as o_year, sum(profit.amount)@2 as sum_profit]                                                                                                                                                                                                                                    |
|               |        AggregateExec: mode=FinalPartitioned, gby=[nation@0 as nation, o_year@1 as o_year], aggr=[sum(profit.amount)]                                                                                                                                                                                                                      |
|               |          RepartitionExec: partitioning=Hash([nation@0, o_year@1], 4), input_partitions=4                                                                                                                                                                                                                                                  |
|               |            AggregateExec: mode=Partial, gby=[nation@0 as nation, o_year@1 as o_year], aggr=[sum(profit.amount)]                                                                                                                                                                                                                           |
|               |              ProjectionExec: expr=[n_name@0 as nation, date_part(YEAR, o_orderdate@1) as o_year, l_extendedprice@2 * (Some(1),20,0 - l_discount@3) - ps_supplycost@4 * l_quantity@5 as amount]                                                                                                                                            |
|               |                HashJoinExec: mode=Partitioned, join_type=Inner, on=[(s_nationkey@3, n_nationkey@0)], projection=[n_name@7, o_orderdate@5, l_extendedprice@1, l_discount@2, ps_supplycost@4, l_quantity@0]                                                                                                                                 |
|               |                  RepartitionExec: partitioning=Hash([s_nationkey@3], 4), input_partitions=4                                                                                                                                                                                                                                               |
|               |                    HashJoinExec: mode=Partitioned, join_type=Inner, on=[(l_orderkey@0, o_orderkey@0)], projection=[l_quantity@1, l_extendedprice@2, l_discount@3, s_nationkey@4, ps_supplycost@5, o_orderdate@7]                                                                                                                          |
|               |                      RepartitionExec: partitioning=Hash([l_orderkey@0], 4), input_partitions=4                                                                                                                                                                                                                                            |
|               |                        HashJoinExec: mode=Partitioned, join_type=Inner, on=[(l_suppkey@2, ps_suppkey@1), (l_partkey@1, ps_partkey@0)], projection=[l_orderkey@0, l_quantity@3, l_extendedprice@4, l_discount@5, s_nationkey@6, ps_supplycost@9]                                                                                           |
|               |                          RepartitionExec: partitioning=Hash([l_suppkey@2, l_partkey@1], 4), input_partitions=4                                                                                                                                                                                                                            |
|               |                            HashJoinExec: mode=Partitioned, join_type=Inner, on=[(l_suppkey@2, s_suppkey@0)], projection=[l_orderkey@0, l_partkey@1, l_suppkey@2, l_quantity@3, l_extendedprice@4, l_discount@5, s_nationkey@7]                                                                                                            |
|               |                              RepartitionExec: partitioning=Hash([l_suppkey@2], 4), input_partitions=4                                                                                                                                                                                                                                     |
|               |                                HashJoinExec: mode=Partitioned, join_type=Inner, on=[(p_partkey@0, l_partkey@1)], projection=[l_orderkey@1, l_partkey@2, l_suppkey@3, l_quantity@4, l_extendedprice@5, l_discount@6]                                                                                                                       |
|               |                                  RepartitionExec: partitioning=Hash([p_partkey@0], 4), input_partitions=4                                                                                                                                                                                                                                 |
|               |                                    FilterExec: p_name@1 LIKE %green%, projection=[p_partkey@0]                                                                                                                                                                                                                                            |
|               |                                      RepartitionExec: partitioning=RoundRobinBatch(4), input_partitions=1                                                                                                                                                                                                                                 |
|               |                                        DataSourceExec: file_groups={1 group: [[part.tbl]]}, projection=[p_partkey, p_name], file_type=csv, has_header=false                                                                                                                                                                               |
|               |                                  RepartitionExec: partitioning=Hash([l_partkey@1], 4), input_partitions=4                                                                                                                                                                                                                                 |
|               |                                    DataSourceExec: file_groups={4 groups: [[lineitem.tbl:0..18561749], [lineitem.tbl:18561749..37123498], [lineitem.tbl:37123498..55685247], [lineitem.tbl:55685247..74246996]]}, projection=[l_orderkey, l_partkey, l_suppkey, l_quantity, l_extendedprice, l_discount], file_type=csv, has_header=false |
|               |                              RepartitionExec: partitioning=Hash([s_suppkey@0], 4), input_partitions=1                                                                                                                                                                                                                                     |
|               |                                DataSourceExec: file_groups={1 group: [[supplier.tbl]]}, projection=[s_suppkey, s_nationkey], file_type=csv, has_header=false                                                                                                                                                                              |
|               |                          RepartitionExec: partitioning=Hash([ps_suppkey@1, ps_partkey@0], 4), input_partitions=4                                                                                                                                                                                                                          |
|               |                            DataSourceExec: file_groups={4 groups: [[partsupp.tbl:0..2932049], [partsupp.tbl:2932049..5864098], [partsupp.tbl:5864098..8796147], [partsupp.tbl:8796147..11728193]]}, projection=[ps_partkey, ps_suppkey, ps_supplycost], file_type=csv, has_header=false                                                   |
|               |                      RepartitionExec: partitioning=Hash([o_orderkey@0], 4), input_partitions=4                                                                                                                                                                                                                                            |
|               |                        DataSourceExec: file_groups={4 groups: [[orders.tbl:0..4223281], [orders.tbl:4223281..8446562], [orders.tbl:8446562..12669843], [orders.tbl:12669843..16893122]]}, projection=[o_orderkey, o_orderdate], file_type=csv, has_header=false                                                                           |
|               |                  RepartitionExec: partitioning=Hash([n_nationkey@0], 4), input_partitions=1                                                                                                                                                                                                                                               |
|               |                    DataSourceExec: file_groups={1 group: [[nation.tbl]]}, projection=[n_nationkey, n_name], file_type=csv, has_header=false                                                                                                                                                                                               |
+---------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
