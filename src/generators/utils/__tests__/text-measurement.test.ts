import { TextMeasurement } from '../text-measurement';

describe('TextMeasurement', () => {
  let measurement: TextMeasurement;

  beforeEach(() => {
    measurement = new TextMeasurement();
  });

  describe('measureText', () => {
    it('should measure text width', () => {
      const width = measurement.measureText('hello', 14);
      expect(width).toBeGreaterThan(0);
    });

    it('should handle narrow characters', () => {
      const narrowWidth = measurement.measureText('i', 14);
      const wideWidth = measurement.measureText('m', 14);
      expect(wideWidth).toBeGreaterThan(narrowWidth);
    });

    it('should handle wide characters', () => {
      const normalWidth = measurement.measureText('a', 14);
      const wideWidth = measurement.measureText('w', 14);
      expect(wideWidth).toBeGreaterThan(normalWidth);
    });

    it('should handle capital letters', () => {
      const capitalWidth = measurement.measureText('A', 14);
      const lowercaseWidth = measurement.measureText('a', 14);
      expect(capitalWidth).toBeGreaterThan(lowercaseWidth);
    });

    it('should scale with font size', () => {
      const smallWidth = measurement.measureText('hello', 10);
      const largeWidth = measurement.measureText('hello', 20);
      expect(largeWidth).toBeGreaterThan(smallWidth);
    });

    it('should handle empty string', () => {
      const width = measurement.measureText('', 14);
      expect(width).toBe(0);
    });

    it('should handle special characters', () => {
      const width = measurement.measureText('hello, world', 14);
      expect(width).toBeGreaterThan(0);
    });

    it('should handle mixed characters', () => {
      const width = measurement.measureText('Hello, World!', 14);
      expect(width).toBeGreaterThan(0);
    });
  });
});

