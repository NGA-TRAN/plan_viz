import { NodeGeneratorRegistry } from '../node-generator.registry';
import { NodeGeneratorStrategy } from '../node-generator.strategy';
import { NodeInfo } from '../../types/node-info.types';

describe('NodeGeneratorRegistry', () => {
  let registry: NodeGeneratorRegistry;
  let mockGenerator: NodeGeneratorStrategy;

  beforeEach(() => {
    registry = new NodeGeneratorRegistry();
    mockGenerator = {
      generate: jest.fn().mockReturnValue({
        x: 0,
        y: 0,
        width: 200,
        height: 80,
        rectId: 'test',
        inputArrowCount: 1,
        inputArrowPositions: [100],
        outputColumns: [],
        outputSortOrder: [],
      } as NodeInfo),
    };
  });

  describe('register', () => {
    it('should register a generator', () => {
      registry.register('TestOperator', mockGenerator);
      expect(registry.hasGenerator('TestOperator')).toBe(true);
    });

    it('should allow multiple registrations', () => {
      registry.register('Op1', mockGenerator);
      registry.register('Op2', mockGenerator);
      expect(registry.hasGenerator('Op1')).toBe(true);
      expect(registry.hasGenerator('Op2')).toBe(true);
    });
  });

  describe('getGenerator', () => {
    it('should return registered generator', () => {
      registry.register('TestOperator', mockGenerator);
      const generator = registry.getGenerator('TestOperator');
      expect(generator).toBe(mockGenerator);
    });

    it('should throw error for unregistered operator', () => {
      expect(() => {
        registry.getGenerator('UnknownOperator');
      }).toThrow('No generator registered for operator: UnknownOperator');
    });
  });

  describe('hasGenerator', () => {
    it('should return true for registered generator', () => {
      registry.register('TestOperator', mockGenerator);
      expect(registry.hasGenerator('TestOperator')).toBe(true);
    });

    it('should return false for unregistered generator', () => {
      expect(registry.hasGenerator('UnknownOperator')).toBe(false);
    });
  });

  describe('getRegisteredOperators', () => {
    it('should return empty array initially', () => {
      expect(registry.getRegisteredOperators()).toEqual([]);
    });

    it('should return all registered operators', () => {
      registry.register('Op1', mockGenerator);
      registry.register('Op2', mockGenerator);
      const operators = registry.getRegisteredOperators();
      expect(operators).toContain('Op1');
      expect(operators).toContain('Op2');
      expect(operators.length).toBe(2);
    });
  });
});

