import { NormalizedValue } from '../../types/plan-view.types';

function parts(decimal: string): { integer: bigint; scale: number } {
  const [whole, fraction = ''] = decimal.split('.');
  return { integer: BigInt(whole + fraction), scale: fraction.length };
}
function decimal(integer: bigint, scale: number): string {
  const digits = integer.toString().padStart(scale + 1, '0');
  return scale ? (digits.slice(0, -scale) + '.' + digits.slice(-scale)).replace(/0+$/, '').replace(/\.$/, '') : digits;
}
export function compareDecimal(left: string, right: string): number {
  const a = parts(left); const b = parts(right);
  const difference = a.integer * 10n ** BigInt(b.scale) - b.integer * 10n ** BigInt(a.scale);
  return difference < 0 ? -1 : difference > 0 ? 1 : 0;
}
export function ratio(value: string, maximum: string): number {
  if (compareDecimal(maximum, '0') === 0) return 0;
  const a = parts(value); const b = parts(maximum);
  return Number(a.integer * 10n ** BigInt(b.scale) * 1000000n / (b.integer * 10n ** BigInt(a.scale))) / 1000000;
}
export function normalizeValue(raw: string, kind: 'time' | 'bytes' | 'count', dialect: boolean): NormalizedValue | null {
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Zµμ]*)$/);
  if (!match) return null;
  const suffix = match[2];
  const units: Record<string, bigint> = kind === 'time' ? { 'ns': 1n, 'us': 1000n, 'µs': 1000n, 'μs': 1000n, 'ms': 1000000n, 's': 1000000000n } :
    kind === 'bytes' ? { B: 1n, ...(dialect ? { '': 1n, 'KB': 1024n, 'MB': 1048576n, 'GB': 1073741824n, 'TB': 1099511627776n } : {}) } :
      { '': 1n, ...(dialect ? { K: 1000n, M: 1000000n, B: 1000000000n, T: 1000000000000n } : {}) };
  const multiplier = units[suffix];
  if (multiplier === undefined) return null;
  const value = parts(match[1]);
  return { decimal: decimal(value.integer * multiplier, value.scale), unit: kind === 'time' ? 'ns' : kind === 'bytes' ? 'byte' : 'count',
    precision: (kind === 'time' ? suffix !== 'ns' : suffix !== '' && suffix !== 'B') || match[1].includes('.') ? 'rounded-token' : 'exact-token' };
}
