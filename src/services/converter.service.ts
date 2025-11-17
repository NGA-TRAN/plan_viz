import { ExecutionPlanParser } from '../parsers/execution-plan.parser';
import { ExcalidrawGenerator } from '../generators/excalidraw.generator';
import { ExcalidrawData, ExcalidrawConfig } from '../types/excalidraw.types';
import { ParserConfig } from '../types/execution-plan.types';

/**
 * Configuration for the converter service
 */
export interface ConverterConfig {
  parser?: ParserConfig;
  generator?: ExcalidrawConfig;
}

/**
 * Service that orchestrates the conversion process
 * Follows Facade pattern and Dependency Inversion Principle
 */
export class ConverterService {
  private readonly parser: ExecutionPlanParser;
  private readonly generator: ExcalidrawGenerator;

  constructor(config: ConverterConfig = {}) {
    this.parser = new ExecutionPlanParser(config.parser);
    this.generator = new ExcalidrawGenerator(config.generator);
  }

  /**
   * Converts an execution plan text to Excalidraw JSON
   * @param planText - The physical execution plan text
   * @returns Excalidraw-compatible JSON data
   * @throws Error if the plan text is invalid
   */
  public convert(planText: string): ExcalidrawData {
    if (!planText || planText.trim().length === 0) {
      throw new Error('Execution plan text cannot be empty');
    }

    // Parse the execution plan
    const parsedPlan = this.parser.parse(planText);

    if (!parsedPlan.root) {
      throw new Error('Failed to parse execution plan: no valid operators found');
    }

    // Generate Excalidraw JSON
    const excalidrawData = this.generator.generate(parsedPlan.root);

    return excalidrawData;
  }
}
