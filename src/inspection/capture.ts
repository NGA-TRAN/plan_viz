import { CapturedInput, DeclaredProvenance, RawField, SectionDescriptor, SourceSpan, VariantDescriptor } from '../types/plan-view.types';
import { PlanViewError } from './errors';
import { fieldTokens, metricTokens } from './fields';

interface Line { text: string; start: number; end: number }

/** UTF-16 offsets agree with JavaScript slicing, including CRLF and lone surrogates. */
export function sourceLines(text: string): Line[] {
  const lines: Line[] = [];
  let start = 0;
  for (const raw of text.split('\n')) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    lines.push({ text: line, start, end: start + line.length });
    start += raw.length + 1;
  }
  return lines;
}

function makeVariant(id: string, label: string, kind: VariantDescriptor['kind'], lines: Line[]): VariantDescriptor {
  let normalizedText = '';
  const sourceMap: VariantDescriptor['sourceMap'][number][] = [];
  for (const line of lines) {
    if (normalizedText) normalizedText += '\n';
    const start = normalizedText.length;
    normalizedText += line.text;
    sourceMap.push({ normalized: { start, end: normalizedText.length }, original: [{ start: line.start, end: line.end }] });
  }
  return { id, label, kind, spans: lines.map(({ start, end }) => ({ start, end })), normalizedText, sourceMap };
}

function tableCell(line: Line): { label: string; cell: Line } | null {
  const match = line.text.match(/^\s*\|([^|]*)\|([\s\S]*)\|\s*$/);
  if (!match) return null;
  const cellStart = line.text.indexOf('|', line.text.indexOf('|') + 1) + 1;
  return { label: match[1].trim(), cell: { text: match[2], start: line.start + cellStart, end: line.start + cellStart + match[2].length } };
}

function trimCell(cell: Line, first: boolean): Line {
  // Match the legacy EXPLAIN extraction: one space of table padding, then two per level.
  const leading = cell.text.length - cell.text.trimStart().length;
  const indent = first ? 0 : 2 * Math.max(0, Math.floor((leading - 1) / 2));
  const removed = leading - indent;
  const text = cell.text.slice(removed).trimEnd();
  return { text, start: cell.start + removed, end: cell.start + removed + text.length };
}

export function originalSpans(variant: VariantDescriptor, span: SourceSpan): SourceSpan[] {
  return variant.sourceMap.flatMap((m) => {
    const start = Math.max(span.start, m.normalized.start);
    const end = Math.min(span.end, m.normalized.end);
    if (end <= start) return [];
    const original = m.original[0];
    return [{ start: original.start + start - m.normalized.start, end: original.start + end - m.normalized.start }];
  });
}

export async function captureInput(text: string, provenance?: DeclaredProvenance): Promise<CapturedInput> {
  if (typeof text !== 'string') throw new PlanViewError('INVALID_OPTIONS', 'Plan input must be a string.');
  if (!globalThis.crypto?.subtle) throw new PlanViewError('HASH_UNAVAILABLE', 'Plan inspection requires WebCrypto in Node 20+ or a secure browser context.');
  const bytes = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    bytes[i * 2] = text.charCodeAt(i) & 255; bytes[i * 2 + 1] = text.charCodeAt(i) >>> 8;
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const contentHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  const lines = sourceLines(text);
  const rawFields: RawField[] = [];
  const field = (name: string, rawValue: string, span: SourceSpan, sectionId: string | null): void => {
    rawFields.push({ id: 'raw-' + (rawFields.length + 1), sectionId, variantId: null, sourceId: null, stageId: null, name, rawValue, spans: [{ start: span.start, end: span.end }] });
  };
  if (lines[0]?.text === '---') {
    const end = lines.findIndex((l, i) => i > 0 && l.text === '---');
    if (end > 0) {
      for (const line of lines.splice(0, end + 1).slice(1, -1)) {
        const match = line.text.match(/^([^:]+):\s*(.*)$/);
        field(match?.[1] ?? 'frontmatter', match?.[2] ?? line.text, line, null);
      }
    }
  }
  const sections: SectionDescriptor[] = [];
  let title = 'Plan';
  let pending: Line[] = [];
  const flush = (): void => {
    if (!pending.some((l) => l.text.trim())) {
      pending = []; return;
    }
    const id = 's' + (sections.length + 1);
    const variants: VariantDescriptor[] = [];
    let active: { label: string; kind: VariantDescriptor['kind']; lines: Line[] } | null = null;
    const finishVariant = (): void => {
      if (active) variants.push(makeVariant('v' + (variants.length + 1), active.label, active.kind, active.lines));
      active = null;
    };
    let hasExplain = false;
    for (const line of pending) {
      const row = tableCell(line);
      if (!row) {
        finishVariant(); continue;
      }
      if (!row.label) {
        if (active && row.cell.text.trim()) active.lines.push(trimCell(row.cell, false));
        else finishVariant();
        continue;
      }
      finishVariant();
      if (row.label === 'plan_type') {
        hasExplain = true; continue;
      }
      if (row.label === 'Duration') {
        field('Duration', row.cell.text.trim(), row.cell, id); continue;
      }
      const physical = ['physical_plan', 'Plan with Metrics', 'Plan with Full Metrics'].includes(row.label);
      const logical = /logical_plan/i.test(row.label);
      if (physical || logical || hasExplain) {
        hasExplain = true;
        active = { label: row.label, kind: physical ? 'physical' : logical ? 'logical' : 'unknown', lines: [trimCell(row.cell, true)] };
      }
    }
    finishVariant();
    if (!variants.length) {
      const plain = [...pending];
      // The legacy parser removes a trailing result table after a physical tree.
      const resultTable = plain.findIndex((l) => /^\+[-+]+\+$/.test(l.text));
      if (resultTable > 0) plain.splice(resultTable);
      while (plain.length && !plain.at(-1)!.text.trim()) plain.pop();
      variants.push(makeVariant('v1', 'Physical plan', 'physical', plain));
    }
    sections.push({ id, number: sections.length + 1, title, spans: pending.map(({ start, end }) => ({ start, end })), variants });
    pending = [];
  };
  for (const line of lines) {
    if (/^#{2,3}\s/.test(line.text)) {
      flush(); title = line.text.replace(/^#+\s*/, '');
    } else pending.push(line);
  }
  flush();
  for (const section of sections) {
    for (const variant of section.variants) {
      let stageId: string | null = null;
      for (const line of sourceLines(variant.normalizedText)) {
        const header = line.text.match(/^\s*┌─+\s*(Distributed\w*Exec|Stage\s+(\d+))/);
        if (header) stageId = header[2] ?? 'head';
        for (const token of [...fieldTokens(line.text, line.start), ...metricTokens(line.text, line.start)]) {
          rawFields.push({ id: 'raw-' + (rawFields.length + 1), sectionId: section.id, variantId: variant.id,
            sourceId: null, stageId, name: token.name, rawValue: token.rawValue, spans: originalSpans(variant, token.span) });
        }
      }
    }
  }
  return { id: 'sha256:' + contentHash, contentHash, parserSchemaVersion: 1, originalText: text, sections, rawFields, callerProvenance: provenance ?? null };
}
