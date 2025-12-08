import { convertPlanToExcalidraw } from '../../index';
import { ExcalidrawText } from '../../types/excalidraw.types';

describe('CrossJoinExec generator', () => {
  it('renders a two-input cross join without falling back to unimplemented', () => {
    const plan = `CrossJoinExec
  DataSourceExec
  DataSourceExec`;

    const result = convertPlanToExcalidraw(plan);

    const texts = result.elements
      .filter((el): el is ExcalidrawText => el.type === 'text')
      .map((el) => el.text);
    expect(texts).toContain('CrossJoinExec');
    expect(texts).not.toContain('unimplemented');

    const rectangles = result.elements.filter((el) => el.type === 'rectangle');
    expect(rectangles.length).toBeGreaterThanOrEqual(3); // join + two sources

    const arrows = result.elements.filter((el) => el.type === 'arrow');
    expect(arrows.length).toBe(2); // one from each side

    // Arrows should stay bound to their rectangles when dragged
    for (const arrow of arrows) {
      expect(arrow.startBinding?.elementId).toBeTruthy();
      expect(arrow.endBinding?.elementId).toBeTruthy();

      const startRect = result.elements.find(
        (el) => el.type === 'rectangle' && el.id === arrow.startBinding?.elementId
      );
      const endRect = result.elements.find(
        (el) => el.type === 'rectangle' && el.id === arrow.endBinding?.elementId
      );

      expect(startRect?.boundElements?.some((b) => b.id === arrow.id && b.type === 'arrow')).toBe(true);
      expect(endRect?.boundElements?.some((b) => b.id === arrow.id && b.type === 'arrow')).toBe(true);
    }
  });
});
