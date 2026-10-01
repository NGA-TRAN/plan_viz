import { ConverterService } from '../../services/converter.service';
import { ExecutionPlanParser } from '../../parsers/execution-plan.parser';
import { inferOperatorFamily } from '../../analysis/operator-contracts';

const groups = '[[], [orchard.parquet], [], []]';

describe('empty source partition slots', () => {
  test.each(['DataSourceExec', 'OrchardFilesExec', 'ArchiveReaderExec'])('%s retains all four partition inputs', (operator) => {
    const input = operator + ': file_groups={4 groups: ' + groups + '}, projection=[key], output_partitioning=Hash([key@0], 4)';
    const tree = new ExecutionPlanParser().parse(input).root!;
    expect(inferOperatorFamily(tree)).toBe('DataSourceExec');
    const scene = new ConverterService().convert(input);
    const title = scene.elements.find((e) => e.type === 'text' && e.text === operator)!;
    if (title.type !== 'text') throw new Error('Missing source title');
    const arrows = scene.elements.filter((e) => e.type === 'arrow' && e.endBinding?.elementId === title.containerId);
    expect(arrows).toHaveLength(4);
    const slots = scene.elements.filter((e) => e.customData?.role === 'empty-file-group');
    expect(slots.map((e) => e.customData?.group)).toEqual([1, 3, 4]);
    expect(scene.elements.filter((e) => e.type === 'ellipse')).toHaveLength(1);
    for (const slot of slots) {
      expect(arrows.some((e) => e.type === 'arrow' && e.startBinding?.elementId === slot.id)).toBe(true);
      expect(scene.elements.some((e) => e.type === 'text' && e.containerId === slot.id && e.text.includes('empty'))).toBe(true);
    }
  });
  test.each([0, 4, 12])('handles %i entirely empty partition slots', (count) => {
    const input = 'OrchardFilesExec: file_groups={' + count + ' groups: [' + Array(count).fill('[]').join(', ') + ']}';
    const scene = new ConverterService().convert(input);
    const shown = count > 8 ? 4 : count;
    expect(scene.elements.filter((e) => e.type === 'arrow')).toHaveLength(shown);
    expect(scene.elements.filter((e) => e.type === 'ellipse')).toHaveLength(0);
    expect(scene.elements.filter((e) => e.customData?.role === 'empty-file-group')).toHaveLength(shown);
    if (count === 12) {
      expect(scene.elements.filter((e) => e.customData?.role === 'empty-file-group').map((e) => e.customData?.group)).toEqual([1, 2, 11, 12]);
      expect(scene.elements.some((e) => e.type === 'text' && e.text.includes('file groups: 12'))).toBe(true);
    }
    expect(scene.elements.every((e) => [e.x, e.y, e.width, e.height].every(Number.isFinite))).toBe(true);
  });
});
