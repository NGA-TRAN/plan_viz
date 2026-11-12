import { ExcalidrawElement } from '../../types/excalidraw.types';
import { ExecutionPlanNode } from '../../types/execution-plan.types';
import { InstanceRecord, RenderReference } from '../../types/plan-view.types';
import { IndexedPlan } from '../../inspection/source-index';

export function renderReferences(indexed: IndexedPlan, shapes: Map<ExecutionPlanNode, ExcalidrawElement>): RenderReference[] {
  const visibleTasks = new Set<string>();
  const taskKey = (stage: string | null, instance: InstanceRecord): string => stage + ':' + (instance.stageTask.state === 'known' ? instance.stageTask.value : '?');
  for (const node of shapes.keys()) {
    const instance = indexed.instanceByNode.get(node);
    const source = indexed.sourceByNode.get(node);
    if (instance && source) visibleTasks.add(taskKey(source.stage.id, instance));
  }
  return indexed.index.nodes.flatMap((source) => {
    const instances = indexed.index.instances.filter((i) => i.sourceId === source.id);
    return (instances.length ? instances : [null]).map((instance) => {
      const entry = [...shapes].find(([node]) => indexed.sourceByNode.get(node)?.id === source.id &&
        (indexed.instanceByNode.get(node)?.id ?? null) === (instance?.id ?? null));
      const shape = entry?.[1];
      const omitted = instance && !visibleTasks.has(taskKey(source.stage.id, instance));
      return { sourceId: source.id, instanceId: instance?.id ?? null, status: shape ? 'visible' : omitted ? 'omitted-task' : 'no-shape',
        elementIds: shape ? [shape.id] : [], groupIds: shape ? [...shape.groupIds] : [], annotationIds: [],
        reason: shape ? null : omitted ? 'Task omitted from the representative drawing; evidence retained.' : 'No renderable body is exposed for this source node.' };
    });
  });
}
