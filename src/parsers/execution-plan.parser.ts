import {
  ExecutionPlanNode,
  ParsedExecutionPlan,
  ParserConfig,
} from '../types/execution-plan.types';

/**
 * Parser for Apache Data Fusion Physical Execution Plans
 * Follows Single Responsibility Principle - only responsible for parsing
 */
export class ExecutionPlanParser {
  private readonly config: Required<ParserConfig>;

  constructor(config: ParserConfig = {}) {
    this.config = {
      indentationSize: config.indentationSize ?? 2,
      extractProperties: config.extractProperties ?? true,
    };
  }

  /**
   * Parses a physical execution plan text into a tree structure
   * @param planText - The raw execution plan text
   * @returns Parsed execution plan with root node
   */
  public parse(planText: string): ParsedExecutionPlan {
    if (!planText || planText.trim().length === 0) {
      return {
        root: null,
        originalText: planText,
      };
    }

    const lines = this.preprocessLines(planText);
    const root = this.buildTree(lines);

    return {
      root,
      originalText: planText,
    };
  }

  /**
   * Preprocesses lines by trimming and filtering empty lines
   */
  private preprocessLines(planText: string): string[] {
    return planText
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0);
  }

  /**
   * Builds the execution plan tree from lines
   */
  private buildTree(lines: string[]): ExecutionPlanNode | null {
    if (lines.length === 0) {
      return null;
    }

    const nodes: Array<{ node: ExecutionPlanNode; level: number }> = [];

    for (const line of lines) {
      const level = this.getIndentationLevel(line);
      const { operator, properties } = this.parseOperatorLine(line.trim());

      const node: ExecutionPlanNode = {
        operator,
        properties,
        children: [],
        level,
      };

      nodes.push({ node, level });
    }

    return this.organizeHierarchy(nodes);
  }

  /**
   * Calculates the indentation level of a line
   */
  private getIndentationLevel(line: string): number {
    let spaces = 0;
    for (const char of line) {
      if (char === ' ') {
        spaces++;
      } else if (char === '\t') {
        spaces += this.config.indentationSize;
      } else {
        break;
      }
    }
    return Math.floor(spaces / this.config.indentationSize);
  }

  /**
   * Parses an operator line to extract operator name and properties
   */
  private parseOperatorLine(line: string): {
    operator: string;
    properties?: Record<string, string>;
  } {
    if (!this.config.extractProperties) {
      return { operator: line };
    }

    // Extract operator name and properties from formats like:
    // "ProjectionExec: expr=[a, b, c]"
    // "FilterExec: predicate=a > 10"
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return { operator: line };
    }

    const operator = line.substring(0, colonIndex).trim();
    const propertiesText = line.substring(colonIndex + 1).trim();

    const properties: Record<string, string> = {};
    if (propertiesText) {
      // Simple key=value parsing
      const pairs = this.extractKeyValuePairs(propertiesText);
      for (const [key, value] of pairs) {
        properties[key] = value;
      }
    }

    return { operator, properties: Object.keys(properties).length > 0 ? properties : undefined };
  }

  /**
   * Extracts key-value pairs from a properties string
   */
  private extractKeyValuePairs(text: string): Array<[string, string]> {
    const pairs: Array<[string, string]> = [];
    let pos = 0;

    while (pos < text.length) {
      // Skip whitespace
      while (pos < text.length && /\s/.test(text[pos])) {
        pos++;
      }

      if (pos >= text.length) break;

      // Extract key
      const keyMatch = text.substring(pos).match(/^(\w+)\s*=/);
      if (!keyMatch) break;

      const key = keyMatch[1];
      pos += keyMatch[0].length;

      // Skip whitespace after =
      while (pos < text.length && /\s/.test(text[pos])) {
        pos++;
      }

      // Extract value (handle square brackets and other delimiters)
      let value = '';
      let bracketDepth = 0;

      while (pos < text.length) {
        const char = text[pos];

        if (char === '[') {
          bracketDepth++;
          value += char;
          pos++;
        } else if (char === ']') {
          bracketDepth--;
          value += char;
          pos++;
        } else if (char === ',' && bracketDepth === 0) {
          // Comma outside brackets means end of this property
          pos++; // Skip the comma
          break;
        } else {
          value += char;
          pos++;
        }
      }

      pairs.push([key.trim(), value.trim()]);
    }

    return pairs;
  }

  /**
   * Organizes flat nodes into a hierarchical tree structure
   */
  private organizeHierarchy(
    nodes: Array<{ node: ExecutionPlanNode; level: number }>
  ): ExecutionPlanNode | null {
    if (nodes.length === 0) {
      return null;
    }

    const root = nodes[0].node;
    const stack: Array<{ node: ExecutionPlanNode; level: number }> = [nodes[0]];

    for (let i = 1; i < nodes.length; i++) {
      const current = nodes[i];

      // Pop stack until we find the parent (level < current level)
      while (stack.length > 0 && stack[stack.length - 1].level >= current.level) {
        stack.pop();
      }

      if (stack.length > 0) {
        // Add as child to the top of stack
        stack[stack.length - 1].node.children.push(current.node);
      }

      stack.push(current);
    }

    return root;
  }
}
