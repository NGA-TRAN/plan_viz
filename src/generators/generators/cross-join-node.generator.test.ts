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
  });
});
