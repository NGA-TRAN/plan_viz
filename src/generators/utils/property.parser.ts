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
    const items: string[] = [];
    let pos = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    let currentItem = '';

    while (pos < text.length) {
      const char = text[pos];

      if (char === '(') {
        parenDepth++;
        currentItem += char;
        pos++;
      } else if (char === ')') {
        parenDepth--;
        currentItem += char;
        pos++;
      } else if (char === '[') {
        bracketDepth++;
        currentItem += char;
        pos++;
      } else if (char === ']') {
        bracketDepth--;
        currentItem += char;
        pos++;
      } else if (char === '{') {
        braceDepth++;
        currentItem += char;
        pos++;
      } else if (char === '}') {
        braceDepth--;
        currentItem += char;
        pos++;
      } else if (
        char === ',' &&
        parenDepth === 0 &&
        bracketDepth === 0 &&
        braceDepth === 0
      ) {
        // Comma outside nested structures means end of this item
        items.push(currentItem.trim());
        currentItem = '';
        pos++;
      } else {
        currentItem += char;
        pos++;
      }
    }

    if (currentItem.trim()) {
      items.push(currentItem.trim());
    }

    return items;
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

    // Parse nested arrays manually
    const groups: string[][] = [];
    let depth = 0;
    let currentGroup: string[] = [];
    let currentFile = '';
    let inQuotes = false;

    for (let i = 0; i < groupsArrayStr.length; i++) {
      const char = groupsArrayStr[i];

      if (char === '"' || char === '\'') {
        inQuotes = !inQuotes;
        continue;
      }

      if (inQuotes) {
        currentFile += char;
        continue;
      }

      if (char === '[') {
        if (depth === 1) {
          // Starting a new group
          currentGroup = [];
          currentFile = '';
        }
        depth++;
      } else if (char === ']') {
        depth--;
        if (depth === 1) {
          // Ending a group
          if (currentFile.trim()) {
            currentGroup.push(currentFile.trim().replace(/^["']|["']$/g, ''));
          }
          if (currentGroup.length > 0) {
            groups.push([...currentGroup]);
          }
          currentGroup = [];
          currentFile = '';
        } else if (depth === 0) {
          // Done parsing
          break;
        }
      } else if (char === ',' && depth === 2) {
        // File separator within a group
        if (currentFile.trim()) {
          currentGroup.push(currentFile.trim().replace(/^["']|["']$/g, ''));
        }
        currentFile = '';
      } else if (depth >= 2) {
        currentFile += char;
      }
    }

    return groups;
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
    const match = property.match(/\[([^\]]+)\]/);
    if (!match) {
      return [];
    }
    const projectionText = match[1];
    return projectionText.split(',').map((col) => {
      const trimmed = col.trim();
      // Remove @ symbol and number after it
      const columnMatch = trimmed.match(/^([^@]+)/);
      return columnMatch ? columnMatch[1].trim() : trimmed;
    });
  }

  /**
   * Extracts sort order from output_ordering property
   * Example: "[f_dkey@0 ASC NULLS LAST, timestamp@1 ASC NULLS LAST]" -> ["f_dkey", "timestamp"]
   */
  extractSortOrder(property: string): string[] {
    const orderingMatch = property.match(/\[([^\]]+)\]/);
    if (!orderingMatch) {
      return [];
    }
    const orderingParts = orderingMatch[1].split(',');
    const sortOrder: string[] = [];
    for (const part of orderingParts) {
      // Extract column name before @ symbol
      const columnMatch = part.trim().match(/^([^@]+)/);
      if (columnMatch) {
        sortOrder.push(columnMatch[1].trim());
      }
    }
    return sortOrder;
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
    const columnMatch = trimmed.match(/^([^@]+)/);
    return columnMatch ? columnMatch[1].trim() : trimmed;
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
      const columns = columnsStr.split(',').map((col) => {
        const trimmed = col.trim();
        const columnMatch = trimmed.match(/^([^@]+)/);
        return columnMatch ? columnMatch[1].trim() : trimmed;
      });
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

