import { DetailTextBuilder } from '../detail-text.builder';
import { ElementFactory } from '../../factories/element.factory';
import { IdGenerator } from '../../utils/id.generator';
import { ExcalidrawConfig } from '../../../types/excalidraw.types';

describe('DetailTextBuilder', () => {
  let builder: DetailTextBuilder;
  let elementFactory: ElementFactory;
  let idGenerator: IdGenerator;
  let config: Required<ExcalidrawConfig>;

  beforeEach(() => {
    idGenerator = new IdGenerator();
    config = {
      nodeWidth: 200,
      nodeHeight: 80,
      verticalSpacing: 100,
      horizontalSpacing: 50,
      fontSize: 16,
      operatorFontSize: 20,
      detailsFontSize: 14,
      nodeColor: '#1e1e1e',
      arrowColor: '#1e1e1e',
    };
    elementFactory = new ElementFactory(idGenerator, config);
    builder = new DetailTextBuilder(elementFactory, idGenerator);
  });

  describe('addLine', () => {
    it('should add a line of text', () => {
      builder.addLine('Line 1');
      const result = builder.build(0, 0, 100);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Line 1');
    });

    it('should add multiple lines', () => {
      builder.addLine('Line 1').addLine('Line 2');
      const result = builder.build(0, 0, 100);
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Line 1');
      expect(result[1].text).toBe('Line 2');
    });

    it('should use default color when not specified', () => {
      builder.addLine('Line 1');
      const result = builder.build(0, 0, 100);
      expect(result[0].strokeColor).toBe('#1e1e1e');
    });

    it('should use custom color', () => {
      builder.addLine('Line 1', '#ff0000');
      const result = builder.build(0, 0, 100);
      expect(result[0].strokeColor).toBe('#ff0000');
    });

    it('should support chaining', () => {
      const result = builder.addLine('Line 1').addLine('Line 2').build(0, 0, 100);
      expect(result).toHaveLength(2);
    });
  });

  describe('build', () => {
    it('should return empty array when no lines added', () => {
      const result = builder.build(0, 0, 100);
      expect(result).toEqual([]);
    });

    it('should position text elements correctly', () => {
      builder.addLine('Line 1').addLine('Line 2');
      const result = builder.build(10, 20, 100);
      expect(result[0].x).toBe(10);
      expect(result[0].y).toBe(20);
      expect(result[1].y).toBeGreaterThan(result[0].y);
    });

    it('should use container ID when provided', () => {
      builder.addLine('Line 1');
      const result = builder.build(0, 0, 100, 'container-id');
      expect(result[0].containerId).toBe('container-id');
    });

    it('should set container ID to null when not provided', () => {
      builder.addLine('Line 1');
      const result = builder.build(0, 0, 100);
      expect(result[0].containerId).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all lines', () => {
      builder.addLine('Line 1').addLine('Line 2');
      builder.clear();
      const result = builder.build(0, 0, 100);
      expect(result).toEqual([]);
    });

    it('should support chaining', () => {
      builder.addLine('Line 1');
      builder.clear().addLine('Line 2');
      const result = builder.build(0, 0, 100);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Line 2');
    });
  });
});

