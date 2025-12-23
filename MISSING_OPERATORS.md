# Missing DataFusion Physical Plan Operators

## Currently Implemented Operators

1. **DataSourceExec** - Data source reading
2. **FilterExec** - Row filtering
3. **CoalesceBatchesExec** - Batch coalescing
4. **CoalescePartitionsExec** - Partition coalescing
5. **RepartitionExec** - Data repartitioning
6. **AggregateExec** - Aggregation operations
7. **ProjectionExec** - Column projection
8. **SortExec** - Sorting operations
9. **SortPreservingMergeExec** - Sort-preserving merge
10. **HashJoinExec** - Hash join operations
11. **SortMergeJoinExec** / **SortMergeJoin** - Sort-merge join operations
12. **UnionExec** - Union operations
13. **LocalLimitExec** - Local limit per partition
14. **GlobalLimitExec** - Global limit across partitions
15. **CrossJoinExec** - Cross join (Cartesian product)

## Missing Operators (Confirmed from DataFusion Documentation)

Based on research from DataFusion's physical plan documentation at https://docs.rs/datafusion/latest/datafusion/physical_plan/, the following operators are **NOT yet** implemented in this project:


### Window Functions
- **WindowAggExec** - Window aggregation functions
- **BoundedWindowAggExec** - Bounded window aggregation functions

### Join Operations
- **NestedLoopJoinExec** - Nested loop join
- **SymmetricHashJoinExec** - Symmetric hash join
- **PiecewiseMergeJoinExec** - Piecewise merge join

### Set Operations
- **IntersectExec** - Intersection operation (if exists)
- **ExceptExec** - Set difference operation (if exists)

### Other Operations
- **AnalyzeExec** - ANALYZE execution plan operator
- **EmptyExec** - Empty relation with produce_one_row=false
- **ExplainExec** - EXPLAIN execution plan operator
- **UnnestExec** - Unnest columns (struct or list types)
- **StreamingTableExec** - Streaming table operations
- **LazyMemoryExec** - Lazy in-memory batches of data
- **RecursiveQueryExec** - Recursive query execution plan
- **WorkTableExec** - Work table for recursive queries
- **PlaceholderRowExec** - Empty relation with produce_one_row=true

## Operators That May Exist (Need Verification)

These operators are common in query engines but need verification in DataFusion:

- **TopKExec** - Top-K operations
- **DeduplicateExec** - Remove duplicates
- **DistinctExec** - Distinct operations
- **ValuesExec** - Values/constant table
- **ParquetExec** - Parquet file reading (may be part of DataSourceExec)
- **CsvExec** - CSV file reading (may be part of DataSourceExec)
- **JsonExec** - JSON file reading (may be part of DataSourceExec)
- **FileSinkExec** - File writing operations
- **CopyToExec** - Copy operations
- **ExtensionExec** - Extension/custom operators

## Summary

**Total Implemented:** 15 operators  
**Total Missing (Confirmed):** 13+ operators  
**Total Missing (Unverified):** ~10 operators

## Next Steps

1. ✅ Checked DataFusion documentation at https://docs.rs/datafusion/latest/datafusion/physical_plan/
2. Test with various SQL queries to discover additional operators in practice
3. Prioritize implementation based on common usage:
   - **High Priority**: WindowAggExec, NestedLoopJoinExec
   - **Medium Priority**: AnalyzeExec, ExplainExec, UnnestExec
   - **Low Priority**: RecursiveQueryExec, WorkTableExec, PlaceholderRowExec

## References

- DataFusion Physical Plan Documentation: https://docs.rs/datafusion/latest/datafusion/physical_plan/
- DataFusion GitHub Repository: https://github.com/apache/arrow-datafusion
