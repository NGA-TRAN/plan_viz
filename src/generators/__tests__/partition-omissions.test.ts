import { ConverterService } from '../../services/converter.service';

const plan = (count: number): string =>
  'GuardExec(memory=4GiB): HashJoinExec: mode=Partitioned, join_type=Inner, on=[(key@0, key@0)]\n' +
  '  OrchardScanExec: file_groups={' + count + ' groups: [...]}, projection=[key], output_partitioning=Hash([key@0], ' + count + ')\n' +
  '  BufferExec: capacity=_\n' +
  '    OrchardScanExec: file_groups={' + count + ' groups: [...]}, projection=[key, value], output_partitioning=Hash([key@0], ' + count + ')';

describe('partitioned join omission markers', () => {
  test('twelve partitions show two tables, an ellipsis, and the last two tables, plus both input ellipses', () => {
    const scene = new ConverterService().convert(plan(12));
    const tables = scene.elements.filter((e) => e.type === 'ellipse' && e.customData?.partitionSeries);
    expect(tables.map((e) => e.customData?.partitionIndex)).toEqual([0, 1, 10, 11]);
    const markers = scene.elements.filter((e) => e.customData?.role === 'hash-table-ellipsis');
    expect(markers).toHaveLength(1);
    const marker = markers[0];
    expect(marker.customData).toMatchObject({ omitted: 8, total: 12 });
    expect(marker.x + marker.width / 2).toBeGreaterThan(tables[1].x + tables[1].width);
    expect(marker.x + marker.width / 2).toBeLessThan(tables[2].x);
    expect(marker.y + marker.height / 2).toBeCloseTo(tables[1].y + tables[1].height / 2);
    const inputs = scene.elements.filter((e) => e.customData?.role === 'partition-input-ellipsis');
    expect(inputs).toHaveLength(2);
    for (const input of inputs) {
      expect(input.customData).toMatchObject({ omitted: 8, total: 12 });
      const owner = scene.elements.find((e) => e.type === 'rectangle' && e.groupIds.some((id) => input.groupIds.includes(id)));
      expect(owner).toBeDefined();
      expect(input.y + input.height).toBeLessThan(owner!.y);
    }
  });
  test.each([1, 2, 4, 8])('does not imply omitted partitions when all %i are drawn', (count) => {
    const scene = new ConverterService().convert(plan(count));
    expect(scene.elements.filter((e) => /^(hash-table|partition-input)-ellipsis$/.test(String(e.customData?.role)))).toHaveLength(0);
  });
});
