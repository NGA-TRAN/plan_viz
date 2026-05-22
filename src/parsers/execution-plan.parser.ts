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
  /**
   * EXPLAIN table row labels that contain a physical plan.
   * - `physical_plan`: standard EXPLAIN output
   * - `Plan with Metrics`: EXPLAIN ANALYZE output (includes runtime metrics)
   */
  private static readonly PHYSICAL_PLAN_ROW_LABELS = ['physical_plan', 'Plan with Metrics'] as const;

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

    // Check if this is a SQL EXPLAIN table format
    const extractedPlan = this.extractPhysicalPlanFromExplain(planText);
    const planToParse = extractedPlan || planText;

    const lines = this.preprocessLines(planToParse);
    const root = this.buildTree(lines);

    return {
      root,
      originalText: planText,
    };
  }

  /**
   * Extracts physical plan from SQL EXPLAIN table format.
   *
   * Recognizes rows whose `plan_type` column is one of
   * {@link ExecutionPlanParser.PHYSICAL_PLAN_ROW_LABELS}. Continuation lines
   * (indented operators under an empty `plan_type` cell) are included.
   *
   * @param planText - The raw plan text (may be SQL EXPLAIN output)
   * @returns Extracted physical plan line or null if not SQL EXPLAIN format
   */
  private extractPhysicalPlanFromExplain(planText: string): string | null {
    const lines = planText.split('\n');

    // Check if this looks like SQL EXPLAIN table format
    // It should have lines with | separators and a physical_plan row
    let foundPhysicalPlan = false;
    let physicalPlanLine = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const parts = line.split('|');
      const planType = parts.length >= 3 ? parts[1].trim() : '';
      if (
        line.trim().startsWith('|') &&
        ExecutionPlanParser.PHYSICAL_PLAN_ROW_LABELS.includes(
          planType as (typeof ExecutionPlanParser.PHYSICAL_PLAN_ROW_LABELS)[number]
        )
      ) {
        foundPhysicalPlan = true;
        const planLines: string[] = [];
        if (parts.length >= 3) {
          planLines.push(parts[2].trim());
        }
        // Check if the plan continues on subsequent lines (if it's wrapped)
        // Preserve indentation structure by keeping each line separate
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          const nextLineTrimmed = nextLine.trim();
          // If next line starts with | but doesn't contain another column header or separator, it's continuation
          if (
            nextLineTrimmed.startsWith('|') &&
            !nextLineTrimmed.includes('plan_type') &&
            !nextLineTrimmed.includes('+')
          ) {
            const nextParts = nextLine.split('|');
            if (nextParts.length >= 3) {
              const continuationText = nextParts[2]; // Use parts[2] which is the plan column
              // Count leading spaces to determine indentation level
              const leadingSpacesMatch = continuationText.match(/^(\s*)/);
              const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[1].length : 0;
              const trimmedText = continuationText.trim();
              if (trimmedText.length > 0) {
                // Preserve indentation: 2 spaces per level
                // The first line has 1 space, each level adds 2 spaces
                // So: level 0 = 1 space, level 1 = 3 spaces, level 2 = 5 spaces, etc.
                // Formula: indentLevel = (leadingSpaces - 1) / 2
                const indentLevel = Math.floor((leadingSpaces - 1) / 2);
                const indent = '  '.repeat(indentLevel);
                planLines.push(indent + trimmedText);
              } else {
                // Empty continuation line, stop here
                break;
              }
            } else {
              break;
            }
            j++;
          } else {
            break;
          }
        }
        // Join lines with newlines to preserve structure
        physicalPlanLine = planLines.join('\n');
        break;
      }
    }

    return foundPhysicalPlan && physicalPlanLine ? physicalPlanLine : null;
  }

  /**
   * Preprocesses lines by trimming and filtering empty lines
   */
  private preprocessLines(planText: string): string[] {
    return planText
      .split('\n')
      .map((line) => {
        // Handle table format with pipe characters: extract the operator column
        // Example: "|               |         AggregateExec: ... |" -> "         AggregateExec: ..."
        // Important: preserve leading spaces in the operator column as they indicate indentation level
        let processed = line.trimEnd();

        // If line contains pipe characters, extract the operator column (preserving leading spaces)
        if (processed.includes('|')) {
          const parts = processed.split('|').map((p) => p.trimEnd());
          // Find the last non-empty part that contains an operator (not just whitespace)
          // Usually this is the second-to-last part (before the trailing pipe)
          for (let i = parts.length - 1; i >= 0; i--) {
            const part = parts[i];
            // Skip empty parts and parts that are just whitespace
            if (part.trim().length > 0) {
              processed = part;
              break;
            }
          }
        } else {
          // No pipes, just trim end (preserve leading spaces for indentation)
          processed = processed.trimEnd();
        }

        return processed;
      })
      .filter((line) => {
        const trimmed = line.trim();
        // Filter out empty lines
        if (trimmed.length === 0) {
          return false;
        }
        // Filter out lines that are just a single special character (like backtick, pipe, etc.)
        // Valid operators should be at least 3 characters (e.g., "Exec" suffix)
        if (trimmed.length <= 2 && /^[^a-zA-Z0-9]+$/.test(trimmed)) {
          return false;
        }
        return true;
      });
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
    // "CoalescePartitionsExec, metrics=[...]"
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      const bareWithProperties = line.match(/^([A-Za-z]\w*)\s*,\s*(.+)$/);
      if (bareWithProperties) {
        const properties = this.parsePropertiesText(bareWithProperties[1], bareWithProperties[2]);
        return {
          operator: bareWithProperties[1],
          properties: Object.keys(properties).length > 0 ? properties : undefined,
        };
      }
      return { operator: line };
    }

    const operator = line.substring(0, colonIndex).trim();
    const propertiesText = line.substring(colonIndex + 1).trim();

    const properties = this.parsePropertiesText(operator, propertiesText);

    return { operator, properties: Object.keys(properties).length > 0 ? properties : undefined };
  }

  /**
   * Parses the text after an operator name.
   */
  private parsePropertiesText(operator: string, propertiesText: string): Record<string, string> {
    const properties: Record<string, string> = {};
    if (!propertiesText) {
      return properties;
    }

    const firstKeyIndex = this.findFirstKeyValueIndex(propertiesText);
    if (firstKeyIndex > 0) {
      const positionalText = this.trimTrailingDelimiter(propertiesText.substring(0, firstKeyIndex));
      this.addPositionalProperty(properties, operator, positionalText);
    }

    if (firstKeyIndex >= 0) {
      const pairs = this.extractKeyValuePairs(propertiesText.substring(firstKeyIndex));
      for (const [key, value] of pairs) {
        properties[key] = value;
      }
    }

    // If no key=value pairs were found but there's text, store it as a special property.
    // This handles cases like "FilterExec: service@2 = log" where there's no key=value format.
    if (Object.keys(properties).length === 0 && propertiesText.length > 0) {
      this.addPositionalProperty(properties, operator, propertiesText);
    }

    return properties;
  }

  /**
   * Adds an operator-specific positional property for non key=value text.
   */
  private addPositionalProperty(
    properties: Record<string, string>,
    operator: string,
    positionalText: string
  ): void {
    const value = this.trimTrailingDelimiter(positionalText);
    if (!value) {
      return;
    }

    // Shallow match only (no nested parentheses). Qualifiers like TopK(fetch=10)
    // become a named property; nested forms like TopK(fn(a, b)) fall through to
    // expression instead.
    const qualifierMatch = value.match(/^([A-Za-z]\w*)\([^)]*\)$/);
    if (qualifierMatch) {
      properties[qualifierMatch[1].toLowerCase()] = value;
    } else if (operator === 'FilterExec') {
      properties.filter = value;
    } else {
      properties.expression = value;
    }
  }

  private trimTrailingDelimiter(text: string): string {
    return text.trim().replace(/,\s*$/, '').trim();
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
      const keyMatch = this.matchKeyValueAt(text, pos);
      if (!keyMatch) break;

      const key = keyMatch[1];
      pos += keyMatch[0].length;

      // Skip whitespace after =
      while (pos < text.length && /\s/.test(text[pos])) {
        pos++;
      }

      // Extract value (handle square brackets, parentheses, and other delimiters)
      let value = '';
      let bracketDepth = 0;
      let parenDepth = 0;
      let braceDepth = 0;

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
        } else if (char === '{') {
          braceDepth++;
          value += char;
          pos++;
        } else if (char === '}') {
          braceDepth--;
          value += char;
          pos++;
        } else if (char === '(') {
          parenDepth++;
          value += char;
          pos++;
        } else if (char === ')') {
          parenDepth--;
          value += char;
          pos++;
        } else if (char === ',' && bracketDepth === 0 && parenDepth === 0 && braceDepth === 0) {
          // A comma outside nested structures only ends this property when the
          // next token is another key=value pair. Some DataFusion values, such
          // as sort_exprs, are unbracketed comma-separated lists.
          const nextPos = this.skipWhitespace(text, pos + 1);
          if (this.matchKeyValueAt(text, nextPos)) {
            pos++; // Skip the comma
            break;
          }
          value += char;
          pos++;
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
   * Finds the first top-level key=value token in a property string.
   */
  private findFirstKeyValueIndex(text: string): number {
    let bracketDepth = 0;
    let parenDepth = 0;
    let braceDepth = 0;

    for (let pos = 0; pos < text.length; pos++) {
      const char = text[pos];
      if (char === '[') {
        bracketDepth++;
      } else if (char === ']') {
        bracketDepth--;
      } else if (char === '(') {
        parenDepth++;
      } else if (char === ')') {
        parenDepth--;
      } else if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
      }

      if (bracketDepth === 0 && parenDepth === 0 && braceDepth === 0) {
        const previous = pos === 0 ? '' : text[pos - 1];
        if ((pos === 0 || /[\s,]/.test(previous)) && this.matchKeyValueAt(text, pos)) {
          return pos;
        }
      }
    }

    return -1;
  }

  private matchKeyValueAt(text: string, pos: number): RegExpMatchArray | null {
    return text.substring(pos).match(/^([A-Za-z_][\w.-]*)\s*=/);
  }

  private skipWhitespace(text: string, pos: number): number {
    while (pos < text.length && /\s/.test(text[pos])) {
      pos++;
    }
    return pos;
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
