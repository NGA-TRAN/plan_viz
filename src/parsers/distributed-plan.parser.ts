import { ExecutionPlanParser } from './execution-plan.parser';
import { ParserConfig } from '../types/execution-plan.types';
import { ChildAssignment, PlanDocument, PlanNode, PlanStage } from '../types/plan-document.types';
import { splitTopLevel } from './plan-text';

export class DistributedPlanParser {
  private readonly parser: ExecutionPlanParser;
  constructor(config: ParserConfig = {}) {
    this.parser = new ExecutionPlanParser(config);
  }

  parse(text: string, recorded = false): Extract<PlanDocument, { stages: PlanStage[] }> {
    const stages: PlanStage[] = [];
    let stage: { id: string; tasks: number; printedPartitions?: number; lines: Array<{ text: string; line: number }> } | undefined;
    const flush = (): void => {
      if (!stage) return;
      const root = this.tree(stage.lines, stage.id);
      const next = { id: stage.id, tasks: stage.tasks, printedPartitions: stage.printedPartitions, root };
      const old = stages.find((s) => s.id === next.id);
      if (old) {
        const normalize = (n: PlanNode): unknown => ({ raw: n.raw, children: n.children.map(normalize) });
        if (old.tasks !== next.tasks || old.printedPartitions !== next.printedPartitions ||
          JSON.stringify(normalize(old.root)) !== JSON.stringify(normalize(next.root))) throw new Error('Conflicting stage ' + next.id);
      } else stages.push(next);
      stage = undefined;
    };
    if (recorded) stage = { id: 'recorded', tasks: 1, lines: [] };
    text.split('\n').forEach((line, index) => {
      const header = line.match(/^\s*┌─+\s*(Distributed\w*Exec|Stage\s+(\d+).*?tasks=(\d+),\s*partitions=(\d+))/);
      if (header) {
        flush();
        stage = { id: header[2] ?? 'head', tasks: Number(header[3] ?? 1),
          printedPartitions: header[4] ? Number(header[4]) : undefined, lines: [] };
        if (stage.tasks < 1) throw new Error('Invalid task count at line ' + (index + 1));
      } else if (/^\s*└─/.test(line)) flush();
      else if (line.trim()) {
        if (!stage) throw new Error('Unexpected text outside stage at line ' + (index + 1));
        const content = recorded ? line : line.replace(/^\s*│ ?/, '');
        stage.lines.push({ text: content, line: index + 1 });
      }
    });
    flush();
    if (!stages.length || (!recorded && !stages.some((s) => s.id === 'head'))) throw new Error('Missing distributed head stage');
    const byId = new Map(stages.map((s) => [s.id, s]));
    const visiting = new Set<string>(); const visited = new Set<string>();
    const visit = (s: PlanStage): void => {
      if (visiting.has(s.id)) throw new Error('Stage dependency cycle at ' + s.id);
      if (visited.has(s.id)) return;
      visiting.add(s.id);
      const nodes = (n: PlanNode): void => {
        if (n.network) {
          const producer = byId.get(n.network.producer);
          if (!producer && !recorded) throw new Error('Missing producer stage ' + n.network.producer + ' at line ' + n.line);
          if (producer) {
            if (Number(n.properties?.input_tasks) !== producer.tasks) throw new Error('Input task count mismatch at line ' + n.line);
            visit(producer);
          }
        }
        n.children.forEach(nodes);
      };
      nodes(s.root); visiting.delete(s.id); visited.add(s.id);
    };
    stages.forEach(visit);
    return { kind: recorded ? 'recorded' : 'distributed', stages, text,
      diagnostics: recorded ? [{ code: 'partial-recording', message: 'Recorded plan: task identity and upstream stages are unresolved.' }] : [] };
  }

  private tree(lines: Array<{ text: string; line: number }>, stage: string): PlanNode {
    const stack: Array<{ indent: number; node: PlanNode }> = [];
    let root: PlanNode | undefined;
    let serial = 0;
    for (const source of lines) {
      const indent = source.text.length - source.text.trimStart().length;
      let raw = source.text.trim();
      const variant = raw.match(/^t(\d+):\s*(.*)$/);
      if (variant) raw = variant[2];
      const network = raw.match(/^\[Stage (\d+)\]\s*=>\s*(.*)$/);
      if (network) raw = network[2];
      const union = raw.match(/^DistributedUnionExec:\s*(.*)$/);
      const parsed = union ? { operator: 'DistributedUnionExec' } : this.parser.parseOperatorLine(raw);
      if (!/^[A-Za-z_]\w*$/.test(parsed.operator)) throw new Error('Invalid operator at line ' + source.line + ': ' + parsed.operator);
      const node: PlanNode = { ...parsed, id: stage + ':' + serial++, line: source.line, raw, level: indent / 2, children: [] };
      if (variant) node.variant = Number(variant[1]);
      if (network) node.network = { producer: network[1], boundary: node.id };
      if (union) {
        node.assignments = {};
        const [assignmentText, ...details] = splitTopLevel(union[1]);
        if (details.length) node.properties = this.parser.parseOperatorLine('DistributedUnionExec: ' + details.join(', ')).properties;
        let consumed = '';
        const entries = [...assignmentText.matchAll(/t(\d+):\[([^\]]*)\]/g)];
        for (const entry of entries) {
          if (node.assignments[Number(entry[1])]) throw new Error('Duplicate UNION task at line ' + source.line);
          consumed += entry[0];
          node.assignments[Number(entry[1])] = splitTopLevel(entry[2]).map((part): ChildAssignment => {
            const m = part.match(/^c(\d+)(?:\((\d+)\/(\d+)\))?$/);
            if (!m) throw new Error('Invalid UNION assignment at line ' + source.line);
            const context = { index: Number(m[2] ?? 0), count: Number(m[3] ?? 1) };
            if (context.count < 1 || context.index >= context.count) throw new Error('Invalid UNION child context at line ' + source.line);
            return { child: Number(m[1]), context };
          });
        }
        if (!entries.length || consumed.replace(/\s/g, '') !== assignmentText.replace(/\s/g, '')) throw new Error('Invalid UNION map at line ' + source.line);
      }
      while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
      if (stack.length) stack[stack.length - 1].node.children.push(node);
      else if (root) throw new Error('Multiple roots in stage ' + stage + ' at line ' + source.line);
      else root = node;
      stack.push({ indent, node });
    }
    if (!root) throw new Error('Empty stage ' + stage);
    return root;
  }
}
