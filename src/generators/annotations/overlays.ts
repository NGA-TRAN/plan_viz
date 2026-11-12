import { ExcalidrawData, ExcalidrawElement } from '../../types/excalidraw.types';
import { ObservationOwner, PlanAnalysisResult, RenderReference } from '../../types/plan-view.types';
import { SceneComposition, sceneBounds } from '../utils/scene-composition';
import { textWidth } from '../utils/adaptive-layout';

function sourceOf(owner: ObservationOwner): string | null {
  return 'sourceId' in owner ? owner.sourceId : null;
}

/** Post-layout annotations consume a separate ID namespace and never move base geometry. */
export function annotate(scene: ExcalidrawData, result: PlanAnalysisResult, renderIndex: RenderReference[]): void {
  if (result.metrics.display === 'off' && result.structure.display === 'off') return;
  const composition = new SceneComposition();
  const bounds = scene.elements.length ? sceneBounds(scene.elements) : { x: 0, y: 0, width: 0, height: 0 };
  const additions: ExcalidrawElement[] = [];
  const panelX = bounds.x + bounds.width + 190;
  const panelWidth = 620;
  let panelY = bounds.y;
  const add = (element: ExcalidrawElement): ExcalidrawElement => {
    element.id = 'plan-view-' + element.id;
    additions.push(element);
    return element;
  };
  const panel = (title: string, body: string): void => {
    const heading = composition.text(title, panelX + 20, panelY + 18, panelWidth - 40, 22, '#343a40');
    const text = composition.text(body, panelX + 20, heading.y + heading.height + 16, panelWidth - 40, 17, '#343a40');
    add(composition.rectangle(panelX, panelY, panelWidth, text.y + text.height - panelY + 20, '#ffffff'));
    add(heading); add(text);
    panelY = text.y + text.height + 48;
  };
  const attach = (ref: RenderReference, text: string, offset: number): void => {
    const shape = scene.elements.find((e) => ref.elementIds.includes(e.id));
    if (!shape) return;
    const label = composition.text(text, shape.x - 178, shape.y + offset, 158, 15, '#343a40');
    const badge = composition.rectangle(label.x - 6, label.y - 4, 170, label.height + 8, '#ffffff', '#868e96');
    const obstacles = [...scene.elements, ...additions].filter((e) => e.type !== 'arrow' && !['stage', 'worker'].includes(String(e.customData?.role))).flatMap((e) => {
      if (e.type !== 'text') return [e];
      return e.text.split('\n').map((line, index) => {
        const width = textWidth(line, e.fontSize);
        return { x: e.x + (e.textAlign === 'center' ? (e.width - width) / 2 : e.textAlign === 'right' ? e.width - width : 0),
          y: e.y + index * e.fontSize * e.lineHeight, width, height: e.fontSize * e.lineHeight };
      });
    });
    const collides = (): boolean => obstacles.some((e) => badge.x < e.x + e.width && badge.x + badge.width > e.x && badge.y < e.y + e.height && badge.y + badge.height > e.y);
    // A small adjacent adjustment can clear a nearby caption without moving a node.
    for (let step = 0; step < 2 && collides(); step++) badge.y -= 8;
    if (collides()) {
      // Reserve the gap outside the existing drawing; never repack the original plan.
      badge.x = bounds.x + bounds.width + 8;
      while (collides()) badge.y += badge.height + 12;
    }
    label.x = badge.x + 6; label.y = badge.y + 4;
    const group = 'plan-view-badge-' + additions.length;
    for (const element of [badge, label]) {
      element.groupIds = [group, ...ref.groupIds];
      add(element); ref.annotationIds = [...ref.annotationIds, element.id];
    }
  };
  const metrics = result.metrics;
  if (metrics.display !== 'off') {
    const found = result.inspection.observations.filter((o) => o.metric === metrics.metric);
    const selected = metrics.cohorts.find((c) => c.cohort.id === metrics.selectedCohort);
    for (const ref of renderIndex.filter((r) => r.status === 'visible')) {
      const matching = found.filter((o) => sourceOf(o.owner) === ref.sourceId && (o.owner.kind === 'instance' ? o.owner.instanceId === ref.instanceId : ref.instanceId === null));
      // A distributed aggregate scalar cannot be painted on every task instance.
      if (!matching.length && ref.instanceId !== null) continue;
      const task = result.inspection.index.instances.find((i) => i.id === ref.instanceId)?.stageTask;
      const prefix = task?.state === 'known' ? 't' + task.value + ': ' : '';
      attach(ref, prefix + (matching.length ? matching.map((o) => o.raw + (o.status === 'typed' ? '' : ' (raw)')).join('\n') : 'Not reported'), 0);
      const rank = selected?.ranking.find((r) => r.observationIds.some((id) => matching.some((o) => o.id === id)));
      if (rank?.color && matching.length === 1 && matching[0].labels.every((l) => l.name === 'stage_task')) {
        const shape = scene.elements.find((e) => ref.elementIds.includes(e.id));
        if (shape && (shape.type === 'rectangle' || shape.type === 'ellipse')) shape.backgroundColor = rank.color;
      }
    }
    const summaries = metrics.cohorts.map((c) => c.cohort.label + '\n' + c.cohort.scopeDescription + '\nScale: 0–' + c.legend.maximum.decimal + ' ' + c.legend.maximum.unit +
      (c.legend.allZero ? ' (all reported values are zero)' : '') + '\n' + c.ranking.slice(0, 10).map((r) => {
      const source = result.inspection.index.nodes.find((n) => n.id === sourceOf(r.owner));
      const owner = r.owner;
      const task = owner.kind === 'instance' ? result.inspection.index.instances.find((i) => i.id === owner.instanceId)?.stageTask : null;
      const taskLabel = task?.state === 'known' ? 'Stage ' + source?.stage.id + ' / t' + task.value + ' / ' : '';
      const ref = renderIndex.find((ref) => ref.sourceId === source?.id && (r.owner.kind !== 'instance' || ref.instanceId === r.owner.instanceId));
      return r.rank + '. ' + taskLabel + (source?.operator ?? r.owner.kind) + ': ' + r.raw.join(' / ') + (ref?.status === 'omitted-task' ? ' (task omitted)' : '');
    }).join('\n')).join('\n\n');
    const raw = found.filter((o) => metrics.unrankedObservationIds.includes(o.id)).slice(0, 10).map((o) => o.metric + '=' + o.raw + '\n' + o.reasons.join(' ')).join('\n');
    panel(metrics.metric + ' — ' + metrics.status, (metrics.palette ? 'Palette: ' + metrics.palette + '\n' : '') +
      (summaries || (metrics.status === 'not-reported' ? 'Not reported in this plan. Missing is not zero.' : 'No comparable numeric values.')) +
      (raw ? '\n\nRaw observations\n' + raw : '') + '\n\nCoverage: reported observations only; completeness is not established. No query totals or exclusive work inferred.');
    if (metrics.palette && selected) {
      const y = panelY;
      if (selected.legend.zeroColor !== undefined) {
        const swatch = (x: number, width: number, color: string, label: string): void => {
          const shape = composition.rectangle(x, y, width, 22, color);
          const text = composition.text(label, x + 2, y + 25, width - 4, 12);
          text.textAlign = 'center';
          for (const element of [shape, text]) {
            element.groupIds = ['plan-view-metric-legend'];
            add(element);
          }
        };
        swatch(panelX, 70, selected.legend.zeroColor, '0');
        // Separate exact zero from the positive scale, including its lowest tint.
        selected.legend.stops.forEach((stop, i, stops) => {
          const width = (panelWidth - 80) / stops.length;
          swatch(panelX + 80 + i * width, width, stop.color, stop.position === 0 ? '>0' : Math.round(stop.position * 100) + '%');
        });
      } else {
        selected.legend.stops.forEach((stop, i) => add(composition.rectangle(panelX + i * 124, y, 124, 22, stop.color)));
      }
      panelY += 50;
    }
    const query = result.inspection.observations.filter((o) => metrics.queryObservationIds.includes(o.id));
    if (query.length) panel('Query details', query.map((o) => o.metric + '=' + o.raw).join('\n') + '\nSeparate query/export scope; never added to operator timers.');
  }
  if (result.structure.display === 'explain') {
    let serial = 0;
    for (const node of result.inspection.index.nodes) {
      const findings = result.structure.findings.filter((f) => sourceOf(f.subject) === node.id);
      if (!findings.length) continue;
      const marker = 'S' + ++serial;
      for (const ref of renderIndex.filter((r) => r.sourceId === node.id && r.status === 'visible')) attach(ref, marker, metrics.display === 'off' ? 0 : 90);
      panel(marker + ' · ' + node.operator, findings.map((f) => f.property + ' — ' + f.assessment + '\n' + f.summary + '\n' + f.explanation +
        (f.assumptions.length ? '\n' + f.assumptions.join(' ') : '')).join('\n\n'));
    }
  }
  scene.elements.push(...additions);
}
