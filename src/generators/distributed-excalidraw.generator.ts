import { wrapLabel } from './utils/adaptive-layout';
import { ExcalidrawConfig, ExcalidrawData, ExcalidrawElement, ExcalidrawRectangle } from '../types/excalidraw.types';
import { ExecutionPlanNode } from '../types/execution-plan.types';
import { DistributedAnalysis, PlanDocument, PlanNode, TaskPlan } from '../types/plan-document.types';
import { ExcalidrawGenerator } from './excalidraw.generator';
import { LeafNodeGenerator } from './generators/leaf-node.generator';
import { DistributedUnionNodeGenerator } from './generators/distributed-union-node.generator';
import { taskGroups } from '../analysis/distributed-analysis';
import { moveScene, sceneBounds, SceneComposition } from './utils/scene-composition';

export interface DistributedRenderConfig { workerDisplay?: 'representative' | 'all' }
interface WorkerScene { task: TaskPlan; elements: ExcalidrawElement[]; inputs: Map<string, ExcalidrawRectangle>; width: number; height: number; omitted: number }
interface StageScene { id: string; workers: WorkerScene[]; tasks: number; width: number; height: number }
export class DistributedExcalidrawGenerator {
  constructor(private readonly config: ExcalidrawConfig = {}, private readonly distributed: DistributedRenderConfig = {}) {}
  generate(document: Extract<PlanDocument, { stages: unknown }>, analysis: DistributedAnalysis): ExcalidrawData {
    const composition = new SceneComposition();
    const elements: ExcalidrawElement[] = [];
    const network = new LeafNodeGenerator({
      details: (n) => ['from Stage ' + ((n as PlanNode).network?.producer ?? '?'), 'input tasks=' + (n.properties?.input_tasks ?? '?'),
        ...(n.properties?.sort_exprs ? ['sort-merge ' + n.properties.sort_exprs] : [])]
        .flatMap((line) => wrapLabel(line, 270, 16).split('\n')),
      outputArrows: (n) => Number(n.properties?.output_partitions ?? n.properties?.partitions_per_consumer) || 0,
    });
    const stages: StageScene[] = document.stages.map((stage) => {
      const workers: WorkerScene[] = [];
      // Keep a small grouped-gather example explicit instead of hiding one producer.
      const showSmallGather = stage.tasks <= 3 && analysis.connections.some((edge) =>
        edge.producer === stage.id && edge.groupedGather);
      for (const group of taskGroups(analysis.tasks.filter((t) => t.stage === stage.id))) {
        const selected = this.distributed.workerDisplay === 'all' || showSmallGather || group.length <= 2 ? group : [group[0], group[group.length - 1]];
        selected.forEach((task, index) => {
          const generator = new ExcalidrawGenerator({ ...this.config, customGenerators: [
            { operator: 'NetworkBroadcastExec', generator: network }, { operator: 'NetworkCoalesceExec', generator: network }, { operator: 'NetworkShuffleExec', generator: network },
            { operator: 'DistributedUnionExec', generator: new DistributedUnionNodeGenerator() }, ...(this.config.customGenerators ?? []),
          ] });
          const shapes = new Map<ExecutionPlanNode, ExcalidrawElement>();
          const scene = generator.generate(task.root, task.counts, shapes);
          const inputs = new Map<string, ExcalidrawRectangle>();
          for (const [node, shape] of shapes) {
            const boundary = (node as PlanNode).network?.boundary;
            if (!boundary) continue;
            if (shape.type !== 'rectangle') throw new Error('Network input must render a rectangle: ' + boundary);
            shape.customData = { ...shape.customData, role: 'network-input', boundary, operator: node.operator, stage: stage.id, task: task.task };
            inputs.set(boundary, shape);
          }
          const bounds = sceneBounds(scene.elements);
          moveScene(scene.elements, -bounds.x, -bounds.y);
          workers.push({ task, elements: scene.elements, inputs, width: bounds.width + 64, height: bounds.height + 84,
            omitted: index === 0 ? group.length - selected.length : 0 });
        });
      }
      return { id: stage.id, tasks: stage.tasks, workers,
        width: workers.reduce((s, w) => s + w.width + (w.omitted ? 210 : 90), 350),
        height: Math.max(340, ...workers.map((w) => w.height + 48)) };
    });
    const depths = new Map<string, number>();
    const depth = (id: string, level: number): void => {
      if ((depths.get(id) ?? -1) >= level) return;
      depths.set(id, level);
      for (const edge of analysis.connections.filter((c) => c.consumer === id)) depth(edge.producer, level + 1);
    };
    depth(document.kind === 'recorded' ? 'recorded' : 'head', 0);
    stages.sort((a, b) => (depths.get(a.id) ?? 0) - (depths.get(b.id) ?? 0));
    const width = Math.max(1500, ...stages.map((s) => s.width));
    elements.push(composition.text(document.kind === 'recorded' ? 'Recorded worker plan — incomplete topology' : 'Distributed execution plan', 30, 20, width - 60, 30),
      composition.text('Read bottom to top. Blue: output partitions per task. Purple: logical stream bundles.', 30, 70, width - 60, 18));
    const panels = new Map<string, ExcalidrawRectangle>();
    const inputs = new Map<string, ExcalidrawRectangle>();
    const rows = new Map<string, ExcalidrawRectangle>();
    let y = 130;
    for (const [stageIndex, stage] of stages.entries()) {
      const gap = Math.max(260, analysis.connections.filter((c) => c.producer === stage.id).length * 110 + 70);
      if (stageIndex) y += gap;
      const row = composition.rectangle(20, y, width - 40, stage.height, stage.id === 'head' ? '#f8f9fa' : '#f3f6ff');
      row.customData = { role: 'stage', stage: stage.id, tasks: document.kind === 'recorded' ? null : stage.tasks, gap };
      rows.set(stage.id, row); elements.push(row);
      const stageTasks = analysis.tasks.filter((t) => t.stage === stage.id);
      const counts = stageTasks.map((t) => t.counts.get(t.root)?.value);
      const total = counts.every((c) => c !== undefined) ? counts.reduce((s: number, c) => s + c!, 0) : 'unknown';
      elements.push(composition.text(document.kind === 'recorded' ? 'Recorded plan\nContext unresolved' : stage.id === 'head' ? 'Head stage\n1 coordinator task' : 'Stage ' + stage.id + '\n' + stage.tasks + ' task slots', 40, y + 20, 270, 23),
        composition.text((document.kind === 'recorded' ? 'Output partitions: ' : 'Output partitions/task: ') + [...new Set(counts.map((c) => c ?? 'unknown'))].join(', ') +
          (document.kind === 'recorded' ? '\nStage/task identity unknown.\nUpstream stages unresolved.' :
            '\nTotal output capacity: ' + total + '\nShown tasks: ' + stage.workers.length + '/' + stage.tasks) +
          '\nTask slots are not physical host IDs.', 40, y + 115, 270, 17));
      const last = stage.workers[stage.workers.length - 1];
      const innerWidth = stage.workers.reduce((sum, w) => sum + w.width + (w.omitted ? 210 : 90), 0) - (last?.omitted ? 210 : 90);
      let x = 350 + Math.max(0, (width - 390 - innerWidth) / 2);
      for (const worker of stage.workers) {
        const panel = composition.rectangle(x, y + 24, worker.width, worker.height, '#ffffff', '#4dabf7');
        panel.strokeStyle = 'dotted';
        panel.customData = { role: 'worker', stage: stage.id, task: worker.task.task };
        const group = panel.id + '-group'; panel.groupIds = [group];
        panels.set(stage.id + '/' + worker.task.task, panel);
        for (const [boundary, shape] of worker.inputs) inputs.set(stage.id + '/' + worker.task.task + '/' + boundary, shape);
        moveScene(worker.elements, x + 32, y + 44, stage.id + '-' + worker.task.task + '-', group);
        const label = composition.text(document.kind === 'recorded' ? 'Recorded operator tree' : stage.id === 'head' ? 'Coordinator task' :
          'Task t' + worker.task.task, x + 16, panel.y + panel.height - 30, panel.width - 32, 17, '#1971c2');
        label.groupIds = [group];
        elements.push(panel, label, ...worker.elements);
        x += worker.width;
        if (worker.omitted) elements.push(composition.text('...\n' + worker.omitted + (worker.omitted === 1 ? ' task\nomitted\nsame structure' : ' tasks\nomitted\nsame structure'), x + 25, y + 65, 165, 18));
        x += worker.omitted ? 210 : 90;
      }
      y += stage.height;
    }
    analysis.connections.forEach((edge, edgeIndex) => {
      const source = rows.get(edge.producer)!; const target = rows.get(edge.consumer)!;
      const localIndex = analysis.connections.filter((c) => c.producer === edge.producer).indexOf(edge);
      const visible = edge.pairs.filter((p) => panels.has(edge.producer + '/' + p.from) && panels.has(edge.consumer + '/' + p.to));
      for (const pair of visible) {
        const a = panels.get(edge.producer + '/' + pair.from)!;
        const b = inputs.get(edge.consumer + '/' + pair.to + '/' + edge.boundary);
        if (!b) throw new Error('Missing rendered network input: ' + edge.boundary);
        const sx = a.x + a.width / 2; const sy = a.y - 1;
        const incoming = visible.filter((p) => p.to === pair.to);
        const offset = (incoming.indexOf(pair) - (incoming.length - 1) / 2) * Math.min(28, b.width / (incoming.length + 1));
        const tx = b.x + b.width / 2 + offset; const ty = b.y + b.height + 1;
        const corridor = source.y - 90 - localIndex * 8;
        const adjacent = stages.findIndex((s) => s.id === edge.producer) - stages.findIndex((s) => s.id === edge.consumer) === 1;
        const points = adjacent ? [[sx, sy], [tx, corridor], [tx, ty]] :
          [[sx, sy], [sx, corridor], [width + 40 + edgeIndex * 35, corridor],
            [width + 40 + edgeIndex * 35, target.y + target.height + 80], [tx, target.y + target.height + 80], [tx, ty]];
        const arrow = composition.arrow(a, b, points);
        arrow.customData = { role: 'network-bundle', boundary: edge.boundary, from: pair.from, to: pair.to, logicalStreams: pair.streams };
        elements.push(arrow);
      }
      const streams = [...new Set(edge.pairs.map((p) => p.streams ?? 'unknown'))].join(', ') || 'unknown';
      const omitted = edge.pairs.length - visible.length;
      const caption = composition.text(edge.operator + (edge.routing === 'shuffle-two-phase' ? ' (two-phase)' : '') + '\nStage ' + edge.producer + ' -> ' + edge.consumer +
        '\nStreams/bundle: ' + streams + '\n' + (edge.routingKnown ? edge.pairs.length + ' connections' : 'routing unresolved'),
      40, source.y - Number(source.customData?.gap) + 20 + localIndex * 110, 275, 16, '#6741d9');
      elements.push(caption);
      if (omitted) {
        const receiverCenters = visible.map((p) => {
          const panel = inputs.get(edge.consumer + '/' + p.to + '/' + edge.boundary)!;
          return panel.x + panel.width / 2;
        });
        const center = receiverCenters.length ? (Math.min(...receiverCenters) + Math.max(...receiverCenters)) / 2 : width / 2;
        const dots = composition.text('…', center - 12, source.y - 135 - localIndex * 8, 24, 18, '#6741d9');
        elements.push(composition.text(omitted + ' more connections omitted', caption.x, caption.y + caption.height, 275, 16, '#6741d9'));
        dots.textAlign = 'center';
        dots.customData = { role: 'network-ellipsis', boundary: edge.boundary, omitted };
        elements.push(dots);
      }
    });
    if (analysis.diagnostics.length) {
      elements.push(composition.text('Diagnostics\n' + [...new Set(analysis.diagnostics.map((d) => d.message))].join('\n'),
        30, y + 30, width - 60, 16, '#9c6500'));
    }
    elements.forEach((e) => {
      delete e.index;
    });
    return { type: 'excalidraw', version: 2, source: 'https://excalidraw.com', elements,
      appState: { gridSize: null, viewBackgroundColor: '#ffffff' }, files: {} };
  }
}
