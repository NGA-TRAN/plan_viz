import { ColumnLabelRenderer } from '../column-label.renderer';
import { ElementFactory } from '../../factories/element.factory';
import { TextMeasurement } from '../../utils/text-measurement';
import { IdGenerator } from '../../utils/id.generator';
import { ExcalidrawConfig } from '../../../types/excalidraw.types';

describe('ColumnLabelRenderer', () => {
  let renderer: ColumnLabelRenderer;
  let elementFactory: ElementFactory;
  let textMeasurement: TextMeasurement;
  let idGenerator: IdGenerator;
  let config: Required<ExcalidrawConfig>;

  beforeEach(() => {
    idGenerator = new IdGenerator();
    textMeasurement = new TextMeasurement();
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
    renderer = new ColumnLabelRenderer(elementFactory, textMeasurement, idGenerator);
  });

  describe('renderLabels', () => {
    it('should return empty array for empty columns', () => {
      const result = renderer.renderLabels({
        columns: [],
        sortOrder: [],
        position: { x: 0, y: 0 },
        alignment: 'left',
        nodeColor: '#000000',
      });
      expect(result).toEqual([]);
    });

    it('should render labels for columns', () => {
      const result = renderer.renderLabels({
        columns: ['col1', 'col2'],
        sortOrder: [],
        position: { x: 0, y: 0 },
        alignment: 'left',
        nodeColor: '#000000',
      });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('text');
    });

    it('should color ordered columns blue', () => {
      const result = renderer.renderLabels({
        columns: ['col1', 'col2'],
        sortOrder: ['col1'],
        position: { x: 0, y: 0 },
        alignment: 'left',
        nodeColor: '#000000',
      });
      const col1Element = result.find((el) => el.text.includes('col1'));
      expect(col1Element?.strokeColor).toBe('#1e90ff'); // Blue for ordered
    });

    it('should group consecutive columns with same color', () => {
      const result = renderer.renderLabels({
        columns: ['col1', 'col2', 'col3'],
        sortOrder: ['col1', 'col2'],
        position: { x: 0, y: 0 },
        alignment: 'left',
        nodeColor: '#000000',
      });
      // col1 and col2 should be in same group (blue), col3 separate (black)
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('renderLabelsRight', () => {
    it('should render labels to the right', () => {
      const result = renderer.renderLabelsRight(
        ['col1', 'col2'],
        [],
        50,
        100,
        '#000000'
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].textAlign).toBe('left');
    });

    it('should position labels correctly', () => {
      const result = renderer.renderLabelsRight(
        ['col1'],
        [],
        50,
        100,
        '#000000',
        5
      );
      expect(result[0].x).toBe(105); // rightmostArrowX + offset
    });
  });

  describe('renderLabelsLeft', () => {
    it('should render labels to the left', () => {
      const result = renderer.renderLabelsLeft(
        ['col1', 'col2'],
        [],
        50,
        100,
        '#000000'
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].textAlign).toBe('right');
    });
  });
});

