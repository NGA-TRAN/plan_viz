import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { webcrypto } from 'node:crypto';
import { convertPlanView, PlanViewOptions } from '../src';
import { assertTextBindings } from '../src/generators/__tests__/utils/text-binding-assertions';

beforeAll(() => { Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true }); });
const root = join(__dirname, 'plan-views');
for (const name of readdirSync(root).filter(n => !n.endsWith('.md'))) {
  const directory = join(root, name);
  const text = readFileSync(join(directory, 'input.sql'), 'utf8');
  const manifest: { views: Record<string, PlanViewOptions> } = JSON.parse(readFileSync(join(directory, 'case.json'), 'utf8'));
  test(name + ': all expected scenes are paired', () => {
    expect(Object.keys(manifest.views)).toContain('default');
    expect(readdirSync(join(directory, 'expected')).sort()).toEqual(Object.keys(manifest.views).map(v => v + '.excalidraw').sort());
  });
  for (const [view, options] of Object.entries(manifest.views)) {
    test(name + '/' + view + ': exact approved scene and bindings', async () => {
      const result = await convertPlanView(text, options);
      assertTextBindings(result.scene.elements);
      // Expected files are JSON: -0 serializes as 0. Preserve every scene field and ID.
      expect(JSON.parse(JSON.stringify(result.scene))).toEqual(JSON.parse(readFileSync(join(directory, 'expected', view + '.excalidraw'), 'utf8')));
    });
  }
}
