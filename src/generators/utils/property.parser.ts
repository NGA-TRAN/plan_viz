import { splitTopLevel, listContent, withoutColumnIndex, expressionAlias } from '../../parsers/plan-text';
/**
 * Property Parser utility
 * Extracts and parses properties from execution plan nodes
 */
export class PropertyParser {
  /**
   * Parses comma-separated values while respecting nested parentheses and brackets
   * Handles complex expressions like function calls, arrays, etc.
   */
  parseCommaSeparated(text: string): string[] {
    return splitTopLevel(text);
  }

  /**
   * Parses file_groups property and extracts individual files from each group
   * Returns an array of groups, where each group is an array of file names
   * Example: "file_groups={3 groups: [[f_1.parquet, f_4.parquet], [f_2.parquet, f_5.parquet, f_6.parquet], [f_3.parquet]]}"
   * Returns: [["f_1.parquet", "f_4.parquet"], ["f_2.parquet", "f_5.parquet", "f_6.parquet"], ["f_3.parquet"]]
   */
  parseFileGroups(properties?: Record<string, string>): string[][] {
    if (!properties || !properties.file_groups) {
      return [];
    }

    const fileGroupsStr = properties.file_groups;

    // Extract the groups array part after "group: " or "groups: "
    // Format: {N group: [[...]]} or {N groups: [[...], [...]]}
    const groupsMatch = fileGroupsStr.match(/(?:groups?):\s*(\[.*\])/);
    if (!groupsMatch) {
      return [];
    }

    const groupsArrayStr = groupsMatch[1];

    return splitTopLevel(listContent(groupsArrayStr))
      .filter((group) => group.startsWith('[') && group.endsWith(']'))
      .map((group) => splitTopLevel(listContent(group))
        .map((file) => file.trim().replace(/^["']|["']$/g, '')));
  }

  /**
   * Declared file-group / partition count from `N group(s)`.
   * DataFusion may list only a prefix and end with `...`; use the number, not
   * the listed arrays. Falls back to how many groups were actually parsed.
   */
  parseFileGroupCount(properties?: Record<string, string>): number {
    const listed = this.parseFileGroups(properties).length;
    if (!properties || !properties.file_groups) {
      return listed;
    }
    const match = properties.file_groups.match(/(\d+)\s+groups?/);
    const declared = match ? parseInt(match[1], 10) : 0;
    return Math.max(declared, listed);
  }

  /**
   * Extracts column names from a property value that contains brackets
   * Example: "[col1@0, col2@1]" -> ["col1", "col2"]
   */
  extractColumns(property: string): string[] {
    const match = property.match(/\[([^\]]+)\]/);
    if (!match) {
      return [];
    }
    return match[1].split(',').map((col) => col.trim());
  }

  /**
   * Extracts column names from projection property
   * Example: "projection=[col1@0, col2@1]" -> ["col1", "col2"]
   */
  extractProjectionColumns(property: string): string[] {
    if (!property.trim().startsWith('[')) return [];
    return splitTopLevel(listContent(property)).map((column) => withoutColumnIndex(column));
  }

  /**
   * Extracts sort order from output_ordering property
   * Example: "[f_dkey@0 ASC NULLS LAST, timestamp@1 ASC NULLS LAST]" -> ["f_dkey", "timestamp"]
   */
  extractSortOrder(property: string): string[] {
    if (!property.trim().startsWith('[')) return [];
    return splitTopLevel(listContent(property)).map((column) =>
      withoutColumnIndex(column).replace(/\s+(?:ASC|DESC)(?:\s+NULLS\s+(?:FIRST|LAST))?$/i, '').trim()
    );
  }

  /**
   * Extracts join keys from on= property
   * Example: "on=[(f_dkey@0, f_dkey@0)]" -> ["f_dkey"]
   * For multiple join keys: "on=[(col1@0, col1@0), (col2@1, col2@1)]" -> ["col1", "col2"]
   */
  extractJoinKeys(onProperty: string): string[] {
    const onMatch = onProperty.match(/\[([^\]]+)\]/);
    if (!onMatch) {
      return [];
    }
    const onContent = onMatch[1];
    // Parse pairs like (f_dkey@0, f_dkey@0)
    // Match all pairs: (column1@N, column2@N)
    const pairPattern = /\(([^,]+),\s*([^)]+)\)/g;
    let match;
    const seenJoinKeys = new Set<string>();
    const joinKeys: string[] = [];

    while ((match = pairPattern.exec(onContent)) !== null) {
      // Extract column name from left side of the pair (join key)
      const leftCol = match[1].trim();

      // Extract column name before @ symbol from left side (join key)
      const leftMatch = leftCol.match(/^([^@]+)/);
      if (leftMatch) {
        const joinKey = leftMatch[1].trim();
        // Add the join key to sort order
        // Note: For join keys, typically both sides refer to the same logical column
        // (e.g., f_dkey@0 from left table and f_dkey@0 from right table)
        // So we only need to extract from one side
        if (!seenJoinKeys.has(joinKey)) {
          joinKeys.push(joinKey);
          seenJoinKeys.add(joinKey);
        }
      }
    }
    return joinKeys;
  }

  /**
   * Extracts column name from a column expression
   * Handles various formats:
   * - "col@0" -> "col"
   * - "col@0 as alias" -> "alias"
   * - "function(...)" -> "function"
   */
  extractColumnName(expression: string): string {
    const trimmed = expression.trim();
    const alias = expressionAlias(trimmed);
    if (alias) return alias;

    // Check if it's a function call (e.g., date_bin(...))
    const functionMatch = trimmed.match(/^(\w+)\s*\(/);
    if (functionMatch) {
      return functionMatch[1];
    }

    // Try to extract column name after "as" keyword first
    const asMatch = trimmed.match(/\s+as\s+([^\s@]+)/i);
    if (asMatch) {
      return asMatch[1].trim();
    }

    // Otherwise, extract column name before @ symbol
    return withoutColumnIndex(trimmed);
  }

  /**
   * Simplifies on= expression by removing @ symbols and indices
   * Example: "on=[(d_dkey@0, f_dkey@0)]" -> "on=[(d_dkey, f_dkey)]"
   */
  simplifyOnExpression(onValue: string): string {
    return onValue.replace(/@\d+/g, '');
  }

  /**
   * Extracts limit information from properties
   * Handles formats: "limit=100", "fetch=100", "TopK(fetch=100)"
   * Returns the limit text to display (e.g., "fetch=100", "limit=100", "TopK(fetch=100)")
   * Returns null if no limit is found
   */
  extractLimit(properties?: Record<string, string>): string | null {
    if (!properties) {
      return null;
    }

    // Check for direct limit= or fetch= properties
    if (properties.limit) {
      return `limit=${properties.limit}`;
    }
    if (properties.fetch) {
      return `fetch=${properties.fetch}`;
    }

    // Check for TopK(fetch=100) format in any property value
    for (const value of Object.values(properties)) {
      if (value && typeof value === 'string') {
        // Check for TopK(fetch=XXX) pattern
        const topKMatch = value.match(/TopK\(fetch=(\d+)\)/);
        if (topKMatch) {
          return `TopK(fetch=${topKMatch[1]})`;
        }
        // Also check if the property value itself contains fetch=XXX
        const fetchMatch = value.match(/fetch=(\d+)/);
        if (fetchMatch) {
          return `fetch=${fetchMatch[1]}`;
        }
      }
    }

    return null;
  }

  /**
   * Simplifies partitioning expression
   * Example: "Hash([d_dkey@0, env@1], 16)" -> "Hash([d_dkey, env], 16)"
   */
  simplifyPartitioning(partitioning: string): { simplified: string; partitionCount: number } {
    // Simplify Hash partitioning format
    const hashMatch = partitioning.match(/^Hash\(\[([^\]]+)\],\s*(\d+)\)$/);
    if (hashMatch) {
      const columnsStr = hashMatch[1];
      const partitionCount = parseInt(hashMatch[2], 10);
      // Extract column names (remove @N parts)
      const columns = splitTopLevel(columnsStr).map(withoutColumnIndex);
      return {
        simplified: `Hash([${columns.join(', ')}], ${partitionCount})`,
        partitionCount,
      };
    }

    // RoundRobinBatch format: RoundRobinBatch(16) -> RoundRobinBatch(16)
    const roundRobinMatch = partitioning.match(/^RoundRobinBatch\((\d+)\)$/);
    if (roundRobinMatch) {
      return {
        simplified: `RoundRobinBatch(${roundRobinMatch[1]})`,
        partitionCount: parseInt(roundRobinMatch[1], 10),
      };
    }

    // Fallback: try to extract number
    let partitionCount = 0;
    let numberMatch = partitioning.match(/\((\d+)\)$/);
    if (!numberMatch) {
      numberMatch = partitioning.match(/,\s*(\d+)\)$/);
    }
    if (numberMatch) {
      partitionCount = parseInt(numberMatch[1], 10);
    }

    return {
      simplified: partitioning,
      partitionCount,
    };
  }
}
