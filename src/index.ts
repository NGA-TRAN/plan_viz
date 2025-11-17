/**
 * Main entry point for the datafusion-plan-viz library
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
 *   ProjectionExec: expr=[a, b]
 *     FilterExec: predicate=a > 10
 *       TableScan: table=my_table
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
