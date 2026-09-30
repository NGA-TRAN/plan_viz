import { ExecutionPlanParser } from './execution-plan.parser';
import { ParserConfig } from '../types/execution-plan.types';
import { PlanDocument, PlanSection } from '../types/plan-document.types';
import { DistributedPlanParser } from './distributed-plan.parser';

/** Snapshot envelopes are metadata, not operators. Keep every plan section addressable. */
export function planSections(input: string): PlanSection[] {
  const text = input.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '');
  const sections: PlanSection[] = [];
  let title = 'Plan';
  let lines: string[] = [];
  const flush = (): void => {
    if (lines.join('\n').trim()) sections.push({ title, text: lines.join('\n').trimEnd() });
    lines = [];
  };
  for (const line of text.split('\n')) {
    if (/^#{2,3}\s/.test(line)) {
      flush(); title = line.replace(/^#+\s*/, '');
    } else lines.push(line);
  }
  flush();
  return sections;
}

export class PlanDocumentParser {
  constructor(private readonly config: ParserConfig = {}) {}
  parse(input: string, section?: number): PlanDocument {
    const sections = planSections(input);
    if (!sections.length) throw new Error('Execution plan text cannot be empty');
    if (section === undefined && sections.length > 1) {
      throw new Error('Select a plan section with --section (1-based): ' +
        sections.map((s, i) => (i + 1) + ': ' + s.title).join('; '));
    }
    const selected = sections[(section ?? 1) - 1];
    if (!Number.isInteger(section ?? 1) || !selected) throw new Error('Invalid plan section: ' + section);
    const parser = new ExecutionPlanParser(this.config);
    const normalized = parser.extractPhysicalPlanFromExplain(selected.text) ?? selected.text;
    // Some snapshots append a query-result table after the complete physical plan.
    const text = normalized.replace(/\n\+[-+]+\+\n\|[\s\S]*$/, '');
    if (/^\s*┌─+\s*(?:Distributed\w*Exec|Stage\s+\d+)/m.test(text)) {
      return new DistributedPlanParser(this.config).parse(text);
    }
    if (/^\s*(?:\[Stage \d+\]\s*=>|Distributed\w*Exec\b|Network\w*Exec\b)/m.test(text)) {
      return new DistributedPlanParser(this.config).parse(text, true);
    }
    const root = parser.parse(text).root;
    if (!root) throw new Error('Failed to parse execution plan: no valid operators found');
    return { kind: 'single', root, text };
  }
}
