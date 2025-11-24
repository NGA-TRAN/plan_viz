/**
 * Main entry point for the plan-viz library
 */

import { ConverterService, ConverterConfig } from './services/converter.service';
import { ExcalidrawData } from './types/excalidraw.types';

// Export types
export * from './types';
export * from './parsers';
export * from './generators';
export * from './services';

/**
 * Converts an Apache Data Fusion Physical Execution Plan to Excalidraw JSON
 * @param planText - The physical execution plan text
 * @param config - Optional configuration for parsing and generation
 * @returns Excalidraw-compatible JSON data
 * @throws Error if the plan text is invalid
 *
 * @example
 * ```typescript
 * const plan = `
 *   ProjectionExec: expr=[env@0 as env, count(Int64(1))@1 as count(*)]
 *     AggregateExec: mode=Single, gby=[env@0 as env], aggr=[count(Int64(1))]
 *       DataSourceExec: file_groups={1 group: [[d1.parquet]]}, projection=[env], file_type=parquet
 * `;
 * const excalidrawData = convertPlanToExcalidraw(plan);
 * ```
 */
export function convertPlanToExcalidraw(
  planText: string,
  config?: ConverterConfig
): ExcalidrawData {
  const converter = new ConverterService(config);
  return converter.convert(planText);
}
