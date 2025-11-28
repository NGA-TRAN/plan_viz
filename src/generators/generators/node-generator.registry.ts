import { NodeGeneratorStrategy } from './node-generator.strategy';

/**
 * Registry for node generators
 * Maps operator names to their respective generator strategies
 */
export class NodeGeneratorRegistry {
  private generators: Map<string, NodeGeneratorStrategy> = new Map();

  /**
   * Registers a generator for an operator
   */
  register(operator: string, generator: NodeGeneratorStrategy): void {
    this.generators.set(operator, generator);
  }

  /**
   * Gets the generator for an operator
   * @throws Error if no generator is registered for the operator
   */
  getGenerator(operator: string): NodeGeneratorStrategy {
    const generator = this.generators.get(operator);
    if (!generator) {
      throw new Error(`No generator registered for operator: ${operator}`);
    }
    return generator;
  }

  /**
   * Checks if a generator is registered for an operator
   */
  hasGenerator(operator: string): boolean {
    return this.generators.has(operator);
  }

  /**
   * Gets all registered operators
   */
  getRegisteredOperators(): string[] {
    return Array.from(this.generators.keys());
  }
}

