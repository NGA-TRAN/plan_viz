import { convertPlanToExcalidraw } from './index';

describe('convertPlanToExcalidraw', () => {
  it('should export the main conversion function', () => {
    expect(convertPlanToExcalidraw).toBeDefined();
    expect(typeof convertPlanToExcalidraw).toBe('function');
  });

  it('should convert a simple plan', () => {
    const planText = 'TableScan: table=users';
    const result = convertPlanToExcalidraw(planText);

    expect(result).toBeDefined();
    expect(result.type).toBe('excalidraw');
    expect(result.elements.length).toBeGreaterThan(0);
  });

  it('should accept custom configuration', () => {
    const planText = 'TableScan';
    const config = {
      generator: {
        nodeWidth: 400,
        nodeHeight: 100,
      },
    };

    const result = convertPlanToExcalidraw(planText, config);

    expect(result).toBeDefined();
    const rectangle = result.elements.find((el) => el.type === 'rectangle');
    expect(rectangle?.width).toBe(400);
    expect(rectangle?.height).toBe(100);
  });

  it('should handle complex nested plans', () => {
    const planText = `ProjectionExec
  FilterExec
    SortExec
      TableScan`;

    const result = convertPlanToExcalidraw(planText);

    expect(result).toBeDefined();
    expect(result.elements.length).toBeGreaterThan(0);

    const rectangles = result.elements.filter((el) => el.type === 'rectangle');
    expect(rectangles.length).toBe(4);

    const arrows = result.elements.filter((el) => el.type === 'arrow');
    expect(arrows.length).toBe(3);
  });

  it('should throw error for invalid input', () => {
    expect(() => convertPlanToExcalidraw('')).toThrow();
  });
});
