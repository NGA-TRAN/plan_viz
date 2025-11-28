import { PropertyParser } from '../property.parser';

describe('PropertyParser', () => {
  let parser: PropertyParser;

  beforeEach(() => {
    parser = new PropertyParser();
  });

  describe('parseCommaSeparated', () => {
    it('should parse simple comma-separated values', () => {
      const result = parser.parseCommaSeparated('a, b, c');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle nested parentheses', () => {
      const result = parser.parseCommaSeparated('func(a, b), c');
      expect(result).toEqual(['func(a, b)', 'c']);
    });

    it('should handle nested brackets', () => {
      const result = parser.parseCommaSeparated('[a, b], c');
      expect(result).toEqual(['[a, b]', 'c']);
    });

    it('should handle nested braces', () => {
      const result = parser.parseCommaSeparated('{a, b}, c');
      expect(result).toEqual(['{a, b}', 'c']);
    });

    it('should handle complex nested structures', () => {
      const result = parser.parseCommaSeparated('func([a, b], {c, d}), e');
      expect(result).toEqual(['func([a, b], {c, d})', 'e']);
    });

    it('should handle empty string', () => {
      const result = parser.parseCommaSeparated('');
      expect(result).toEqual([]);
    });

    it('should handle single value', () => {
      const result = parser.parseCommaSeparated('single');
      expect(result).toEqual(['single']);
    });
  });

  describe('parseFileGroups', () => {
    it('should parse file groups', () => {
      const properties = {
        file_groups: '{2 groups: [[f1.parquet], [f2.parquet]]}',
      };
      const result = parser.parseFileGroups(properties);
      expect(result).toEqual([['f1.parquet'], ['f2.parquet']]);
    });

    it('should handle multiple files per group', () => {
      const properties = {
        file_groups: '{2 groups: [[f1.parquet, f2.parquet], [f3.parquet]]}',
      };
      const result = parser.parseFileGroups(properties);
      expect(result).toEqual([['f1.parquet', 'f2.parquet'], ['f3.parquet']]);
    });

    it('should handle empty properties', () => {
      const result = parser.parseFileGroups({});
      expect(result).toEqual([]);
    });

    it('should handle missing file_groups', () => {
      const result = parser.parseFileGroups({ other: 'value' });
      expect(result).toEqual([]);
    });

    it('should handle quoted file names', () => {
      const properties = {
        file_groups: '{1 group: [["f1.parquet"]]}',
      };
      const result = parser.parseFileGroups(properties);
      expect(result).toEqual([['f1.parquet']]);
    });
  });

  describe('extractColumns', () => {
    it('should extract columns from bracket notation', () => {
      const result = parser.extractColumns('[col1, col2, col3]');
      expect(result).toEqual(['col1', 'col2', 'col3']);
    });

    it('should handle empty brackets', () => {
      const result = parser.extractColumns('[]');
      expect(result).toEqual([]);
    });

    it('should handle string without brackets', () => {
      const result = parser.extractColumns('no brackets');
      expect(result).toEqual([]);
    });
  });

  describe('extractProjectionColumns', () => {
    it('should extract projection columns', () => {
      const result = parser.extractProjectionColumns('[col1@0, col2@1]');
      expect(result).toEqual(['col1', 'col2']);
    });

    it('should remove @ symbols and indices', () => {
      const result = parser.extractProjectionColumns('[col1@0, col2@1, col3@2]');
      expect(result).toEqual(['col1', 'col2', 'col3']);
    });
  });

  describe('extractSortOrder', () => {
    it('should extract sort order from output_ordering', () => {
      const result = parser.extractSortOrder('[col1@0 ASC NULLS LAST, col2@1 ASC NULLS LAST]');
      expect(result).toEqual(['col1', 'col2']);
    });

    it('should handle single column', () => {
      const result = parser.extractSortOrder('[col1@0 ASC NULLS LAST]');
      expect(result).toEqual(['col1']);
    });
  });

  describe('extractJoinKeys', () => {
    it('should extract join keys from on property', () => {
      const result = parser.extractJoinKeys('[(col1@0, col1@0)]');
      expect(result).toEqual(['col1']);
    });

    it('should handle multiple join keys', () => {
      const result = parser.extractJoinKeys('[(col1@0, col1@0), (col2@1, col2@1)]');
      expect(result).toEqual(['col1', 'col2']);
    });

    it('should handle empty on property', () => {
      const result = parser.extractJoinKeys('[]');
      expect(result).toEqual([]);
    });
  });

  describe('extractColumnName', () => {
    it('should extract column name from simple expression', () => {
      const result = parser.extractColumnName('col@0');
      expect(result).toBe('col');
    });

    it('should extract alias from "as" keyword', () => {
      const result = parser.extractColumnName('col@0 as alias');
      expect(result).toBe('alias');
    });

    it('should extract function name', () => {
      const result = parser.extractColumnName('date_bin(...)');
      expect(result).toBe('date_bin');
    });
  });

  describe('simplifyOnExpression', () => {
    it('should remove @ symbols and indices', () => {
      const result = parser.simplifyOnExpression('[(col1@0, col2@1)]');
      expect(result).toBe('[(col1, col2)]');
    });
  });

  describe('simplifyPartitioning', () => {
    it('should simplify Hash partitioning', () => {
      const result = parser.simplifyPartitioning('Hash([col1@0, col2@1], 16)');
      expect(result.simplified).toBe('Hash([col1, col2], 16)');
      expect(result.partitionCount).toBe(16);
    });

    it('should simplify RoundRobinBatch partitioning', () => {
      const result = parser.simplifyPartitioning('RoundRobinBatch(16)');
      expect(result.simplified).toBe('RoundRobinBatch(16)');
      expect(result.partitionCount).toBe(16);
    });

    it('should extract partition count from Hash format', () => {
      const result = parser.simplifyPartitioning('Hash([col1@0], 8)');
      expect(result.partitionCount).toBe(8);
    });
  });
});

