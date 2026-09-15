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
      expect(index1).toMatch(/^c[0-9A-F]{3}$/);
    });

    it('should generate 4-character indexes so Excalidraw accepts them', () => {
      const index = generator.generateIndex();
      expect(index).toMatch(/^c[0-9A-F]{3}$/);
      expect(index).toHaveLength(4);
    });

    it('should increment indices sequentially', () => {
      const index1 = generator.generateIndex();
      const index2 = generator.generateIndex();
      const hex1 = parseInt(index1.slice(1), 16);
      const hex2 = parseInt(index2.slice(1), 16);
      expect(hex2).toBe(hex1 + 1);
    });

    it('should not emit keys Excalidraw rejects after 16 elements', () => {
      const indexes: string[] = [];
      for (let i = 0; i < 300; i++) {
        indexes.push(generator.generateIndex());
      }
      expect(indexes[0]).toBe('c000');
      expect(indexes[16]).toBe('c010');
      expect(indexes.every((index) => index.length === 4)).toBe(true);
      expect(indexes.some((index) => index === 'c0g10' || index === 'c0gF0')).toBe(false);
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
      expect(index2).toMatch(/^c000$/);
    });
  });
});

