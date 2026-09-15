import { groupNodeVisuals, addGroupId } from '../node-group';
import { ExcalidrawElement } from '../../../types/excalidraw.types';

function rect(id: string, x: number, y: number, width: number, height: number): ExcalidrawElement {
  return {
    id,
    type: 'rectangle',
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: '#000',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    seed: 1,
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: [],
    updated: 1,
    link: null,
    locked: false,
  };
}

describe('node-group', () => {
  it('groups the rectangle and in-box text, not arrows or outside glyphs', () => {
    const box = rect('box', 0, 0, 100, 80);
    const title = {
      ...rect('title', 10, 5, 80, 20),
      type: 'text' as const,
      text: 'FilterExec',
      fontSize: 20,
      fontFamily: 7,
      textAlign: 'center' as const,
      verticalAlign: 'top' as const,
      baseline: 20,
      containerId: 'box',
      originalText: 'FilterExec',
      lineHeight: 1.25,
    };
    const outside = rect('file', 0, 200, 60, 60);
    outside.type = 'ellipse';
    const arrow = {
      ...rect('arrow', 50, 80, 0, 40),
      type: 'arrow' as const,
    };
    const elements = [box, title, outside, arrow] as ExcalidrawElement[];
    groupNodeVisuals(elements, 'box', 'g1');
    expect(box.groupIds).toEqual(['g1']);
    expect(title.groupIds).toEqual(['g1']);
    expect(outside.groupIds).toEqual([]);
    expect(arrow.groupIds).toEqual([]);
  });

  it('does not duplicate a group id', () => {
    const box = rect('box', 0, 0, 10, 10);
    addGroupId(box, 'g1');
    addGroupId(box, 'g1');
    expect(box.groupIds).toEqual(['g1']);
  });
});
