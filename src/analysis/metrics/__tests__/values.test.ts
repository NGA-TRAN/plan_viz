import { compareDecimal, normalizeValue, ratio } from '../values';
import { metricTokens } from '../../../inspection/fields';

test.each([['1.25ms', '1250000'], ['1µs', '1000'], ['0ns', '0'], ['2.5s', '2500000000'], ['0.1μs', '100']])('normalizes %s exactly', (raw, expected) => {
  expect(normalizeValue(raw, 'time', false)?.decimal).toBe(expected);
});
test('requires the explicit suffix dialect and preserves integers beyond Number precision', () => {
  expect(normalizeValue('1.5 KB', 'bytes', false)).toBeNull();
  expect(normalizeValue('1.5 KB', 'bytes', true)).toEqual({ decimal: '1536', unit: 'byte', precision: 'rounded-token' });
  expect(normalizeValue('1.5 K', 'count', true)?.decimal).toBe('1500');
  expect(normalizeValue('9007199254740993', 'count', true)?.decimal).toBe('9007199254740993');
  expect(compareDecimal('9007199254740993', '9007199254740992')).toBe(1);
  expect(compareDecimal('1.1', '1.10')).toBe(0);
  expect(ratio('0', '0')).toBe(0);
});
test.each(['-1ms', 'NaN', 'Infinity', '', '12%', '1e9ms'])('does not invent a numeric value for %s', (raw) => {
  expect(normalizeValue(raw, 'time', true)).toBeNull();
});
test('tokenizes duplicate metrics, partition labels and task maps without losing order', () => {
  const tokens = metricTokens('ScanExec: expr=[\'metrics=[fake=2]\'], metrics=[elapsed_compute=1ms, output_rows{partition=0}=2, output_rows={0:3, 1:4}, elapsed_compute=2ms]');
  expect(tokens.map((t) => t.name)).toEqual(['elapsed_compute', 'output_rows', 'output_rows', 'elapsed_compute']);
  expect(tokens[1].labels).toEqual([{ name: 'partition', rawValue: '0' }]);
  expect(tokens[2].rawValue).toBe('{0:3, 1:4}');
});
