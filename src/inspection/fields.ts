import { isBalanced, topLevelPositions } from '../parsers/plan-text';
import { SourceSpan } from '../types/plan-view.types';

export interface FieldToken { name: string; rawValue: string; labels: { name: string; rawValue: string }[]; span: SourceSpan }

/** Ordered fields, never a dictionary: duplicates and malformed values remain evidence. */
export function fieldTokens(text: string, offset = 0): FieldToken[] {
  const tokens: FieldToken[] = [];
  let start = 0;
  const cuts = [...topLevelPositions(text).filter((i) => text[i] === ','), text.length];
  for (const end of cuts) {
    const raw = text.slice(start, end);
    const match = raw.match(/([A-Za-z_][\w .-]*)(\{[^{}]*\})?\s*=\s*([\s\S]*)$/);
    if (match) {
      const labels = match[2] ? fieldTokens(match[2].slice(1, -1)).map((t) => ({ name: t.name, rawValue: t.rawValue })) : [];
      tokens.push({ name: match[1].trim(), rawValue: match[3].trim(), labels,
        span: { start: offset + start + match.index!, end: offset + end - (raw.length - raw.trimEnd().length) } });
    }
    start = end + 1;
  }
  return tokens;
}

export function metricTokens(line: string, offset = 0): FieldToken[] {
  // Locate only top-level metric lists, not text embedded in expressions or literals.
  const positions = new Set(topLevelPositions(line));
  const result: FieldToken[] = [];
  for (const match of line.matchAll(/\bmetrics\s*=\s*\[/g)) {
    if (!positions.has(match.index!)) continue;
    const begin = match.index! + match[0].length;
    const closing = topLevelPositions(line.slice(begin - 1)).find((i) => i > 0);
    const end = closing === undefined ? line.length : begin - 1 + closing;
    const body = line.slice(begin, end).replace(/\]\s*$/, '');
    result.push(...fieldTokens(body, offset + begin));
  }
  return result;
}

export function mapEntries(raw: string): { key: string; rawValue: string }[] | null {
  if (!raw.startsWith('{') || !raw.endsWith('}') || !isBalanced(raw)) return null;
  const inner = raw.slice(1, -1);
  const entries: { key: string; rawValue: string }[] = [];
  let start = 0;
  for (const end of [...topLevelPositions(inner).filter((i) => inner[i] === ','), inner.length]) {
    const match = inner.slice(start, end).trim().match(/^(\d+)\s*:\s*(.+)$/);
    if (!match) return null;
    entries.push({ key: match[1], rawValue: match[2] });
    start = end + 1;
  }
  return entries;
}
