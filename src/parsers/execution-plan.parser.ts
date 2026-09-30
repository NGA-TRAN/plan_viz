import { topLevelPositions } from './plan-text';
import {
  ExecutionPlanNode,
  OperatorWrapper,
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
  private static readonly PHYSICAL_PLAN_ROW_LABELS = ['physical_plan', 'Plan with Metrics', 'Plan with Full Metrics'] as const;

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

    if (planToParse.split('\n').some((line) =>
      /^\s*(?:[│|]\s*)?(?:\[Stage\s+[0-9]+\]|(?:Distributed\w*Exec|Network\w*Exec)\b|┌────)/.test(line)
    )) {
      throw new Error('Distributed plans are not supported; provide a single-node physical plan.');
    }
    const lines = this.preprocessLines(planToParse);
    const root = this.buildTree(lines);
    const rejectDistributed = (node: ExecutionPlanNode): void => {
      if (/^(?:Distributed\w*Exec|Network\w*Exec)\b/.test(node.operator)) {
        throw new Error('Distributed plans are not supported; provide a single-node physical plan.');
      }
      node.children.forEach(rejectDistributed);
    };
    if (root) rejectDistributed(root);

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
  public extractPhysicalPlanFromExplain(planText: string): string | null {
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
          planLines.push(parts.slice(2, -1).join('|').trim());
        }
        // Check if the plan continues on subsequent lines (if it's wrapped)
        // Preserve indentation structure by keeping each line separate
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          const nextLineTrimmed = nextLine.trim();
          // If next line starts with | but doesn't contain another column header or separator, it's continuation
          if (
            nextLineTrimmed.startsWith('|')
          ) {
            const nextParts = nextLine.split('|');
            if (nextParts.length >= 3 && !nextParts[1].trim()) {
              const continuationText = nextParts.slice(2, -1).join('|'); // Use parts[2] which is the plan column
              // Count leading spaces to determine indentation level
              const leadingSpacesMatch = continuationText.match(/^(\s*)/);
              const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[1].length : 0;
              const trimmedText = continuationText.trim();
              if (trimmedText.length > 0) {
                // Preserve indentation: 2 spaces per level
                // The first line has 1 space, each level adds 2 spaces
                // So: level 0 = 1 space, level 1 = 3 spaces, level 2 = 5 spaces, etc.
                // Formula: indentLevel = (leadingSpaces - 1) / 2
                const indentLevel = Math.max(0, Math.floor((leadingSpaces - 1) / 2));
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
        // Copied plan-column output can retain its trailing table border.
        if (!processed.trimStart().startsWith('|')) processed = processed.replace(/\s+\|$/, '').trimEnd();

        // If line contains pipe characters, extract the operator column (preserving leading spaces)
        if (processed.trimStart().startsWith('|')) {
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
      const { operator, properties, wrappers } = this.parseOperatorLine(line.trim());

      const node: ExecutionPlanNode = {
        operator,
        properties,
        ...(wrappers?.length ? { wrappers } : {}),
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
  public parseOperatorLine(line: string): {
    operator: string;
    properties?: Record<string, string>;
    wrappers?: OperatorWrapper[];
  } {
    if (!this.config.extractProperties) {
      return { operator: line };
    }

    // Extract operator name and properties from formats like:
    // "ProjectionExec: expr=[a, b, c]"
    // "FilterExec: predicate=a > 10"
    // "CoalescePartitionsExec, metrics=[...]"
    const colonIndex = topLevelPositions(line).find((index) => line[index] === ':') ?? -1;
    if (colonIndex >= 0) {
      const prefix = line.slice(0, colonIndex).trim();
      const header = prefix.match(/^([A-Za-z_]\w*)(?:\(([\s\S]*)\))?$/);
      const rest = line.slice(colonIndex + 1).trim();
      const innerColon = topLevelPositions(rest).find((index) => rest[index] === ':');
      const innerHeader = innerColon === undefined ? rest : rest.slice(0, innerColon).trim();
      const isInner = !/^t\d+$/.test(innerHeader) && /^[A-Za-z_]\w*(?:\([\s\S]*\))?$/.test(innerHeader) &&
        (innerColon !== undefined ? !rest.slice(innerColon + 1).startsWith('//') : /Exec$/.test(innerHeader) || innerHeader === 'SortMergeJoin' || !!header?.[2]);
      if (header && isInner) {
        const inner = this.parseOperatorLine(rest);
        return {
          ...inner,
          wrappers: [{
            operator: header[1], argumentsText: header[2], rawText: prefix,
          }, ...(inner.wrappers ?? [])],
        };
      }
    }
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
    const starts = topLevelPositions(text).filter((index) =>
      (index === 0 || /[\s,]/.test(text[index - 1])) &&
      !!text.slice(index).match(/^([A-Za-z_][\w.-]*)\s*=(?!=)/)
    );
    // A new property must follow a top-level comma, not whitespace inside a value.
    const boundaries = starts.filter((index) => index === 0 || text.slice(0, index).trimEnd().endsWith(','));
    return boundaries.map((index, position) => {
      const match = text.slice(index).match(/^([A-Za-z_][\w.-]*)\s*=(?!=)/)!;
      const end = boundaries[position + 1] ?? text.length;
      return [match[1], text.slice(index + match[0].length, end).trim().replace(/,\s*$/, '')];
    });
  }

  private findFirstKeyValueIndex(text: string): number {
    return topLevelPositions(text).find((index) =>
      (index === 0 || /[\s,]/.test(text[index - 1])) &&
      !!text.slice(index).match(/^([A-Za-z_][\w.-]*)\s*=(?!=)/)
    ) ?? -1;
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
