import { createHash, webcrypto } from 'node:crypto';
import { captureInput } from '../capture';

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
});

describe('lossless input capture', () => {
  test('retains exact text and hashes UTF-16 code units, including lone surrogates', async () => {
    const text = 'EmptyExec\r\n\ud800';
    const input = await captureInput(text);
    expect(input.originalText).toBe(text);
    expect(input.contentHash).toBe(createHash('sha256').update(Buffer.from(text, 'utf16le')).digest('hex'));
    expect((await captureInput(text.replace('\ud800', '\ufffd'))).id).not.toBe(input.id);
  });

  test('keeps logical, summary, full metrics and Duration with exact original spans', async () => {
    const text = ['---', 'producer: unknown', 'producer: other', '---', '## Query 🐈',
      '| plan_type | plan |', '| logical_plan | Projection: x |',
      '| Plan with Metrics | ProjectionExec: expr=[x@0 as x], metrics=[elapsed_compute=1ms] |',
      '| |   EmptyExec |', '| Plan with Full Metrics | EmptyExec, metrics=[output_rows{partition=0}=2] |',
      '| Duration | 4.2ms |'].join('\r\n');
    const input = await captureInput(text);
    const section = input.sections[0];
    expect(section.title).toBe('Query 🐈');
    expect(section.variants.map((v) => [v.id, v.kind])).toEqual([['v1', 'logical'], ['v2', 'physical'], ['v3', 'physical']]);
    expect(section.variants[1].normalizedText).toContain('\n  EmptyExec');
    for (const variant of section.variants) {
      for (const mapping of variant.sourceMap) {
        expect(mapping.original.map((s) => text.slice(s.start, s.end)).join('')).toBe(
          variant.normalizedText.slice(mapping.normalized.start, mapping.normalized.end));
      }
    }
    expect(input.rawFields.filter((f) => f.name === 'producer').map((f) => f.rawValue)).toEqual(['unknown', 'other']);
    expect(input.rawFields.find((f) => f.name === 'Duration')?.rawValue).toBe('4.2ms');
    expect(input.rawFields.find((f) => f.variantId === 'v3' && f.name === 'output_rows')?.rawValue).toBe('2');
  });

  test('keeps literal pipes, repeated sections and unselected malformed rows', async () => {
    const input = await captureInput('## Same\n| physical_plan | FilterExec: x = \'a|b\' |\n| Plan with Full Metrics | ??? |\n## Same\nEmptyExec');
    expect(input.sections.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(input.sections[0].variants[0].normalizedText).toBe('FilterExec: x = \'a|b\'');
    expect(input.sections[0].variants[1].normalizedText).toBe('???');
  });
});
