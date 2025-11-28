import { ElementFactory } from '../element.factory';
import { IdGenerator } from '../../utils/id.generator';
import { ExcalidrawConfig } from '../../../types/excalidraw.types';

describe('ElementFactory', () => {
  let factory: ElementFactory;
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
    factory = new ElementFactory(idGenerator, config);
  });

  describe('createRectangle', () => {
    it('should create a rectangle element', () => {
      const rect = factory.createRectangle({
        id: 'test-id',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
      });
      expect(rect.type).toBe('rectangle');
      expect(rect.id).toBe('test-id');
      expect(rect.x).toBe(10);
      expect(rect.y).toBe(20);
      expect(rect.width).toBe(100);
      expect(rect.height).toBe(50);
    });

    it('should use default stroke color', () => {
      const rect = factory.createRectangle({
        id: 'test-id',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      expect(rect.strokeColor).toBe(config.nodeColor);
    });

    it('should use custom stroke color', () => {
      const rect = factory.createRectangle({
        id: 'test-id',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        strokeColor: '#ff0000',
      });
      expect(rect.strokeColor).toBe('#ff0000');
    });
  });

  describe('createText', () => {
    it('should create a text element', () => {
      const text = factory.createText({
        id: 'test-id',
        x: 10,
        y: 20,
        width: 100,
        height: 30,
        text: 'Hello',
      });
      expect(text.type).toBe('text');
      expect(text.text).toBe('Hello');
      expect(text.x).toBe(10);
      expect(text.y).toBe(20);
    });

    it('should use default font size', () => {
      const text = factory.createText({
        id: 'test-id',
        x: 0,
        y: 0,
        width: 100,
        height: 30,
        text: 'Test',
      });
      expect(text.fontSize).toBe(14); // Default details font size
    });

    it('should use custom font size', () => {
      const text = factory.createText({
        id: 'test-id',
        x: 0,
        y: 0,
        width: 100,
        height: 30,
        text: 'Test',
        fontSize: 20,
      });
      expect(text.fontSize).toBe(20);
    });
  });

  describe('createArrow', () => {
    it('should create an arrow element', () => {
      const arrow = factory.createArrow({
        id: 'test-id',
        startX: 0,
        startY: 0,
        endX: 100,
        endY: 100,
        childRectId: 'child',
        parentRectId: 'parent',
      });
      expect(arrow.type).toBe('arrow');
      expect(arrow.points).toHaveLength(2);
      expect(arrow.startBinding?.elementId).toBe('child');
      expect(arrow.endBinding?.elementId).toBe('parent');
    });

    it('should calculate arrow dimensions correctly', () => {
      const arrow = factory.createArrow({
        id: 'test-id',
        startX: 10,
        startY: 20,
        endX: 110,
        endY: 120,
        childRectId: 'child',
        parentRectId: 'parent',
      });
      expect(arrow.width).toBe(100);
      expect(arrow.height).toBe(100);
    });
  });

  describe('createEllipse', () => {
    it('should create an ellipse element', () => {
      const ellipse = factory.createEllipse({
        id: 'test-id',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
      });
      expect(ellipse.type).toBe('ellipse');
      expect(ellipse.x).toBe(10);
      expect(ellipse.y).toBe(20);
      expect(ellipse.width).toBe(100);
      expect(ellipse.height).toBe(50);
    });

    it('should use default stroke style', () => {
      const ellipse = factory.createEllipse({
        id: 'test-id',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });
      expect(ellipse.strokeStyle).toBe('solid');
    });

    it('should use custom stroke style', () => {
      const ellipse = factory.createEllipse({
        id: 'test-id',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        strokeStyle: 'dashed',
      });
      expect(ellipse.strokeStyle).toBe('dashed');
    });
  });

  describe('createOperatorText', () => {
    it('should create operator text with correct styling', () => {
      const text = factory.createOperatorText('test-id', 0, 0, 200, 'Operator', 'rect-id');
      expect(text.text).toBe('Operator');
      expect(text.fontSize).toBe(20);
      expect(text.fontFamily).toBe(7); // Bold
      expect(text.textAlign).toBe('center');
      expect(text.containerId).toBe('rect-id');
    });
  });

  describe('createDetailText', () => {
    it('should create detail text with correct styling', () => {
      const text = factory.createDetailText('test-id', 0, 0, 200, 20, 'Details');
      expect(text.text).toBe('Details');
      expect(text.fontSize).toBe(14);
      expect(text.fontFamily).toBe(6); // Normal
      expect(text.textAlign).toBe('center');
    });

    it('should use custom color', () => {
      const text = factory.createDetailText('test-id', 0, 0, 200, 20, 'Details', '#ff0000');
      expect(text.strokeColor).toBe('#ff0000');
    });
  });
});

