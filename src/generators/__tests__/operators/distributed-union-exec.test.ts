import { ConverterService } from '../../../services/converter.service';
import { assertTextBindings } from '../utils/text-binding-assertions';

test('DistributedUnionExec keeps missing task assignments visibly unresolved', () => {
  // An incomplete display can name the operator without printing its task map.
  const input = '┌───── DistributedExec\n│ EmptyExec\n└─────\n' +
    '┌───── Stage 1 ── tasks=1, partitions=1\n│ DistributedUnionExec\n│   EmptyExec\n└─────';
  const result = new ConverterService().convertDetailed(input);
  const details = result.scene.elements.filter((element) => element.type === 'text').map((element) => element.text);
  expect(details).toContain('active: assignment unresolved\ninactive: unknown');
  const selection = result.scene.elements.find((element) => element.customData?.role === 'union-selection');
  expect(selection).toBeDefined();
  expect(selection?.customData?.active).toBeUndefined();
  expect(selection?.customData?.inactive).toBeUndefined();
  expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes('DistributedUnionExec'))).toBe(true);
  assertTextBindings(result.scene.elements);
});
