import { IdGenerator } from '../id.generator';

describe('IdGenerator', () => {
  let generator: IdGenerator;

  beforeEach(() => {
    generator = new IdGenerator();
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generator.generateId();
      const id2 = generator.generateId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^element-\d+-\d+$/);
    });

    it('should generate IDs with correct format', () => {
      const id = generator.generateId();
      expect(id).toContain('element-');
    });
  });

  describe('generateIndex', () => {
    it('should generate unique indices', () => {
      const index1 = generator.generateIndex();
      const index2 = generator.generateIndex();
      expect(index1).not.toBe(index2);
      expect(index1).toMatch(/^c0g[0-9A-F]+$/);
    });

    it('should generate indices in hexadecimal format', () => {
      const index = generator.generateIndex();
      expect(index).toMatch(/^c0g[0-9A-F]+$/);
    });

    it('should increment indices sequentially', () => {
      const index1 = generator.generateIndex(); // First call
      const index2 = generator.generateIndex(); // Second call
      // Extract the hex part and compare
      const hex1 = parseInt(index1.replace('c0g', ''), 16);
      const hex2 = parseInt(index2.replace('c0g', ''), 16);
      expect(hex2).toBe(hex1 + 1);
      // Use variables to avoid unused variable warnings
      expect(index1).toBeDefined();
      expect(index2).toBeDefined();
    });
  });

  describe('generateSeed', () => {
    it('should generate random seeds', () => {
      const seed1 = generator.generateSeed();
      const seed2 = generator.generateSeed();
      // Seeds should be numbers (may or may not be different due to randomness)
      expect(typeof seed1).toBe('number');
      expect(typeof seed2).toBe('number');
      expect(seed1).toBeGreaterThanOrEqual(0);
      expect(seed1).toBeLessThan(1000000);
    });
  });

  describe('reset', () => {
    it('should reset counters', () => {
      generator.generateId();
      generator.generateIndex();
      
      generator.reset();
      
      const id2 = generator.generateId();
      const index2 = generator.generateIndex();
      
      // After reset, counters should start from 0 again
      // IDs will be different due to timestamp, but counter part should reset
      expect(id2).toBeDefined();
      expect(index2).toBeDefined();
      expect(id2).toMatch(/^element-\d+-0$/); // Counter should be 0 after reset
      expect(index2).toMatch(/^c0g0$/); // Index should be 0 after reset
    });
  });
});

